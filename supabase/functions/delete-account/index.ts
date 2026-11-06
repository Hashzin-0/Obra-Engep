import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'user-media';
const PAGE_SIZE = 100;
const allowedOrigins = new Set([
  'https://obra-engep.vercel.app',
  'https://obra-engep-aymatsu00-2333s-projects.vercel.app',
  'http://localhost:3000',
]);

function approvedOrigin(origin: string): boolean {
  return allowedOrigins.has(origin)
    || /^https:\/\/obra-engep-[a-z0-9-]+-aymatsu00-2333s-projects\.vercel\.app$/.test(origin);
}

function response(req: Request, body: unknown, status = 200): Response {
  const origin = req.headers.get('origin') ?? '';
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  if (approvedOrigin(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return new Response(JSON.stringify(body), { status, headers });
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > 2048) return null;
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > 2048) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function collectUserStoragePaths(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<string[]> {
  const queue = [userId];
  const visited = new Set<string>();
  const objectPaths: string[] = [];

  while (queue.length) {
    const prefix = queue.shift()!;
    if (visited.has(prefix)) continue;
    visited.add(prefix);

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error('Não foi possível verificar os arquivos privados da conta.');

      const entries = data ?? [];
      for (const entry of entries) {
        if (!entry.name) continue;
        const path = `${prefix}/${entry.name}`;
        if (entry.id) objectPaths.push(path);
        else queue.push(path);
      }
      if (entries.length < PAGE_SIZE) break;
    }

    if (visited.size > 10000 || objectPaths.length > 100000) {
      throw new Error('A conta excede o limite seguro de arquivos para exclusão automática.');
    }
  }

  return objectPaths;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  if (origin && !approvedOrigin(origin)) return response(req, { error: 'Origem não autorizada.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin',
    },
  });
  if (req.method !== 'POST') return response(req, { error: 'Método não permitido.' }, 405);
  if (req.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return response(req, { error: 'Content-Type inválido.' }, 415);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization') ?? '';
    const token = authorization.match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/i)?.[1];
    if (!url || !anonKey || !serviceKey || !token || token.split('.').length !== 3) {
      return response(req, { error: 'Sessão inválida.' }, 401);
    }

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return response(req, { error: 'Sessão inválida.' }, 401);

    const body = await readBody(req);
    if (!body || body.confirmation !== 'DELETE_ACCOUNT' || body.userId !== authData.user.id) {
      return response(req, { error: 'Confirmação de exclusão inválida.' }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const paths = await collectUserStoragePaths(admin, authData.user.id);

    for (let offset = 0; offset < paths.length; offset += 1000) {
      const { error } = await admin.storage.from(BUCKET).remove(paths.slice(offset, offset + 1000));
      if (error) return response(req, { error: 'Não foi possível remover todos os arquivos privados. A conta foi preservada.' }, 503);
    }

    const signOutResponse = await fetch(`${url}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!signOutResponse.ok) {
      return response(req, { error: 'Não foi possível invalidar as sessões. A conta foi preservada.' }, 503);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id, false);
    if (deleteError) {
      console.error('[delete-account] Auth deletion failed:', deleteError.message);
      return response(req, {
        error: 'As sessões foram encerradas, mas a exclusão não foi concluída. Entre novamente e solicite nova tentativa.',
        storageObjectsRemoved: paths.length,
      }, 503);
    }

    return response(req, { success: true, storageObjectsRemoved: paths.length });
  } catch (error) {
    console.error('[delete-account] Request failed:', error instanceof Error ? error.message : 'unknown');
    return response(req, { error: 'Não foi possível concluir a exclusão da conta.' }, 503);
  }
});
