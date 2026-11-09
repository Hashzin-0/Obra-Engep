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

// The app shell and AI entry points can request a session during the same first
// render. Share the anonymous sign-in operation so they cannot race each other.
let anonymousSessionInFlight: Promise<{ userId: string } | null> | null = null;

export async function ensureAnonymousSession(): Promise<{ userId: string } | null> {
  if (!supabase) return null;
  if (anonymousSessionInFlight) return anonymousSessionInFlight;

  const pending = (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(`Não foi possível recuperar a sessão do Supabase: ${sessionError.message}`);
    }
    if (existing.session?.user) return { userId: existing.session.user.id };

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(`Falha ao iniciar sessão anônima: ${error.message}`);
    if (!data.user || !data.session?.access_token) {
      throw new Error('Supabase não retornou uma sessão autenticada válida.');
    }
    return { userId: data.user.id };
  })();

  anonymousSessionInFlight = pending;
  try {
    return await pending;
  } finally {
    if (anonymousSessionInFlight === pending) anonymousSessionInFlight = null;
  }
}

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
  if (!session || session.user.is_anonymous) {
    throw new Error('Entre com sua conta Google para utilizar os recursos de IA.');
  }

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAt > 0 && expiresAt <= Date.now() + 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session || refreshed.data.session.user.is_anonymous) {
      throw new Error('Sua sessão expirou. Entre novamente com o Google.');
    }
    session = refreshed.data.session;
  }

  if (!session.access_token) {
    throw new Error('O Supabase não forneceu um token de acesso válido. Entre novamente.');
  }

  return session.access_token;
}
