import { Buffer } from 'node:buffer';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';
import { createClient } from '@supabase/supabase-js';

type AdminRequest = IncomingMessage & { body?: unknown; query?: Record<string, string | string[] | undefined> };
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };

const COOKIE_NAME = '__Host-obra-admin';
const COOKIE_MAX_AGE_SECONDS = 600;

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function allowSessionIp(req: AdminRequest): boolean {
  const forwarded = req.headers['x-forwarded-for'];
  const chain = typeof forwarded === 'string' ? forwarded : '';
  const ip = chain ? chain.split(',').pop()?.trim() || 'unknown' : req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + 60_000 };
    ipBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (ipBuckets.size > 10_000) {
    for (const [key, value] of ipBuckets) if (value.resetAt <= now) ipBuckets.delete(key);
  }
  return bucket.count <= 20;
}


function json(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function clearCookie(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`);
}

function setCookie(res: ServerResponse, token: string, maxAge: number) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`);
}

function getCookie(req: AdminRequest): string | null {
  const header = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const item = header.split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith(`${COOKIE_NAME}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

function sameOrigin(req: AdminRequest): boolean {
  const origin = req.headers.origin;
  const host = typeof req.headers.host === 'string' ? req.headers.host.split(',')[0].trim().toLowerCase() : '';
  if (typeof origin !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

function getClient(token?: string) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

function tokenMaxAge(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    const remaining = Number(payload.exp) - Math.floor(Date.now() / 1000);
    return Number.isFinite(remaining) ? Math.max(0, Math.min(COOKIE_MAX_AGE_SECONDS, remaining)) : 0;
  } catch {
    return 0;
  }
}

async function verifyAdmin(token: string) {
  if (token.length > 4096 || token.split('.').length !== 3) return null;
  const client = getClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.app_metadata?.is_admin !== true) return null;
  return { client, user: data.user };
}

async function consumeSessionLimit(client: ReturnType<typeof getClient>): Promise<boolean> {
  const { data, error } = await client.rpc('admin_consume_rate_limit', { p_action: 'session' });
  if (error) throw new Error('Rate limit service unavailable.');
  return data === true;
}

export default async function handler(req: AdminRequest, res: ServerResponse) {
  const method = req.method ?? '';
  res.setHeader('Allow', 'GET, POST, DELETE');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'POST', 'DELETE'].includes(method)) return json(res, 405, { error: 'Método não permitido.' });

  if (method !== 'GET' && !sameOrigin(req)) return json(res, 403, { error: 'Origem não autorizada.' });
  if (method !== 'DELETE' && !allowSessionIp(req)) {
    res.setHeader('Retry-After', '60');
    return json(res, 429, { error: 'Muitas tentativas a partir desta origem. Aguarde um minuto.' });
  }

  try {
    if (method === 'DELETE') {
      clearCookie(res);
      return json(res, 200, { ok: true });
    }

    let token: string | null = null;
    if (method === 'POST') {
      const lengthHeader = req.headers['content-length'];
      const length = typeof lengthHeader === 'string' ? Number(lengthHeader) : 0;
      if (length > 1024) return json(res, 413, { error: 'Requisição muito grande.' });
      const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      token = match?.[1] ?? null;
    } else {
      token = getCookie(req);
    }

    if (!token) {
      if (method === 'GET') clearCookie(res);
      return json(res, 401, { error: 'Sessão administrativa ausente ou expirada.' });
    }

    const verified = await verifyAdmin(token);
    if (!verified) {
      clearCookie(res);
      return json(res, 403, { error: 'Autenticação administrativa inválida.' });
    }

    const maxAge = tokenMaxAge(token);
    if (maxAge <= 0) {
      clearCookie(res);
      return json(res, 401, { error: 'Sessão expirada. Entre novamente.' });
    }

    if (!(await consumeSessionLimit(verified.client))) {
      return json(res, 429, { error: 'Muitas tentativas. Aguarde antes de continuar.' });
    }

    if (method === 'POST') setCookie(res, token, maxAge);

    return json(res, 200, {
      ok: true,
      user: {
        id: verified.user.id,
        email: verified.user.email ?? null,
        app_metadata: { is_admin: true },
      },
      expires_in: maxAge,
    });
  } catch (error) {
    console.error('Admin session endpoint failed:', error instanceof Error ? error.message : 'unknown error');
    return json(res, 503, { error: 'Serviço administrativo temporariamente indisponível.' });
  }
}
