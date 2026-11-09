import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Return a valid access token only for a Google-authenticated user.
 * Guest/anonymous sessions are intentionally rejected.
 */
export async function getSupabaseAccessToken(): Promise<string> {
  if (!supabase) throw new Error('Serviço de autenticação indisponível.');

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Não foi possível recuperar a sessão do Supabase: ${error.message}`);
  }

  let session = data.session;
  if (!session || session.user.is_anonymous || session.user.app_metadata?.provider !== 'google') {
    throw new Error('Entre com sua conta Google para utilizar os recursos de IA.');
  }

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAt > 0 && expiresAt <= Date.now() + 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session || refreshed.data.session.user.is_anonymous || refreshed.data.session.user.app_metadata?.provider !== 'google') {
      throw new Error('Sua sessão expirou. Entre novamente com o Google.');
    }
    session = refreshed.data.session;
  }

  if (!session.access_token) {
    throw new Error('O Supabase não forneceu um token de acesso válido. Entre novamente.');
  }

  return session.access_token;
}
