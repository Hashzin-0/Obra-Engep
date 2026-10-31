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

export async function requireUser(req: Request): Promise<{ id: string; isAdmin: boolean }> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Sessão inválida.');
  const client = userClient(req);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessão inválida.');
  return { id: data.user.id, isAdmin: data.user.app_metadata?.is_admin === true };
}

export async function requireAdmin(req: Request): Promise<{ id: string }> {
  const user = await requireUser(req);
  if (!user.isAdmin) throw new Error('Acesso administrativo necessário.');
  return { id: user.id };
}
