import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_ANON_KEY ausentes.');
  return createClient(url, key, {
    global: { headers: authorization ? { Authorization: authorization } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request): Promise<{ id: string; isAdmin: boolean; sessionId: string }> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Sessão inválida.');

  const encodedPayload = token.split('.')[1] ?? '';
  let claims: Record<string, unknown>;
  try {
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    claims = JSON.parse(atob(padded));
  } catch {
    throw new Error('Sessão inválida.');
  }
  const sessionId = typeof claims.session_id === 'string' ? claims.session_id : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    throw new Error('Sessão inválida.');
  }

  const client = userClient(req);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessão inválida.');
  return { id: data.user.id, isAdmin: data.user.app_metadata?.is_admin === true, sessionId };
}

export async function requireAdmin(req: Request): Promise<{ id: string; sessionId: string }> {
  const user = await requireUser(req);
  if (!user.isAdmin) throw new Error('Acesso administrativo necessário.');
  return { id: user.id, sessionId: user.sessionId };
}
