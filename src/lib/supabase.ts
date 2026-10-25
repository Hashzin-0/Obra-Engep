import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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

export async function ensureAnonymousSession(): Promise<{ userId: string } | null> {
  if (!supabase) return null;

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) return { userId: existing.session.user.id };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Falha ao iniciar sessão anônima: ${error.message}`);
  if (!data.user) throw new Error('Supabase não retornou usuário anônimo.');
  return { userId: data.user.id };
}
