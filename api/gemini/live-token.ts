import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';
import { createClient } from '@supabase/supabase-js';

type AuthenticatedRequest = IncomingMessage & { body?: unknown };

export const config = { maxDuration: 30 };

function respond(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function hasSameOrigin(req: AuthenticatedRequest): boolean {
  const origin = req.headers.origin;
  const host = typeof req.headers.host === 'string' ? req.headers.host.toLowerCase() : '';
  if (typeof origin !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.host.toLowerCase() === host
      && (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'));
  } catch {
    return false;
  }
}

async function hasValidSession(req: AuthenticatedRequest): Promise<boolean> {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const accessToken = authorization.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/i)?.[1];
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!accessToken || accessToken.split('.').length !== 3 || !supabaseUrl || !supabaseKey) return false;

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: 'Bearer ' + accessToken } },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  return !error && Boolean(data.user);
}

export default async function handler(req: AuthenticatedRequest, res: ServerResponse) {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') return respond(res, 405, { error: 'Método não permitido.' });
  if (!hasSameOrigin(req)) return respond(res, 403, { error: 'Origem não autorizada.' });
  if (!(await hasValidSession(req))) return respond(res, 401, { error: 'Sessão inválida ou expirada. Entre novamente.' });

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return respond(res, 503, { error: 'O serviço Gemini Live não está configurado no servidor.' });

  const model = env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  const now = Date.now();
  const tokenRequest = {
    uses: 1,
    expireTime: new Date(now + 30 * 60_000).toISOString(),
    newSessionExpireTime: new Date(now + 60_000).toISOString(),
    liveConnectConstraints: {
      model: 'models/' + model,
      config: {
        responseModalities: ['AUDIO'],
      },
    },
  };

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(tokenRequest),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error('[Gemini Live] Token provisioning failed:', response.status, responseText.slice(0, 500));
      return respond(res, 502, { error: 'O Google não conseguiu provisionar uma sessão Gemini Live. Verifique a chave e o acesso ao modelo.' });
    }
    const payload = await response.json() as { name?: string };
    if (!payload.name) {
      console.error('[Gemini Live] Token response did not contain a token name.');
      return respond(res, 502, { error: 'O Google retornou uma credencial temporária inválida.' });
    }
    return respond(res, 200, { token: payload.name, model });
  } catch (error) {
    console.error('[Gemini Live] Token provisioning request failed:', error instanceof Error ? error.name : 'unknown');
    return respond(res, 502, { error: 'Não foi possível preparar a sessão Gemini Live. Tente novamente.' });
  }
}