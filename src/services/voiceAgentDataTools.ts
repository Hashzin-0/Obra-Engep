import { getSupabaseSession, supabase } from '../lib/supabase';

type DataRow = Record<string, unknown>;

function database() {
  if (!supabase) throw new Error('O acesso aos dados está indisponível.');
  return supabase;
}

/**
 * Every personal-data tool derives its owner from the verified Google session.
 * The user ID is never accepted from model-generated arguments. Queries also
 * retain an explicit owner filter as defense in depth; Supabase RLS remains
 * the authoritative authorization boundary.
 */
async function authenticatedOwnerId(): Promise<string> {
  const session = await getSupabaseSession();
  return session.user.id;
}

export function normalizeToolLimit(value: unknown, fallback: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function loadVoiceAgentFavorites(limitValue: unknown = 30): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db
    .from('favorites')
    .select('item_type,item_id,title,subtitle,module_id,metadata,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 30, 30));

  if (error) throw new Error('Não foi possível carregar os favoritos da sua conta.');
  return (data ?? []) as DataRow[];
}

export async function loadVoiceAgentRecentCalculations(limitValue: unknown = 10): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db
    .from('calculation_history')
    .select('id,title,category,result_value,result_unit,formula,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 10, 20));

  if (error) throw new Error('Não foi possível consultar o histórico de cálculos.');
  return (data ?? []) as DataRow[];
}

export async function loadVoiceAgentUpcomingDeadlines(limitValue: unknown = 10): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db
    .from('deadlines')
    .select('id,title,description,due_date,due_time,priority,status,category,project_name')
    .eq('user_id', userId)
    .neq('status', 'concluido')
    .order('due_date', { ascending: true })
    .limit(normalizeToolLimit(limitValue, 10, 20));

  if (error) throw new Error('Não foi possível consultar os prazos da conta.');
  return (data ?? []) as DataRow[];
}

export async function searchVoiceAgentLibrary(queryValue: unknown): Promise<DataRow[]> {
  if (typeof queryValue !== 'string' || queryValue.trim().length < 2) {
    throw new Error('Informe ao menos dois caracteres para pesquisar na biblioteca.');
  }

  const query = escapeLikePattern(queryValue.trim().slice(0, 100));
  const { data, error } = await database()
    .from('library_items')
    .select('id,kind,code,title,summary,official_url')
    .ilike('title', `%${query}%`)
    .limit(8);

  if (error) throw new Error('Não foi possível pesquisar na biblioteca técnica.');
  return (data ?? []) as DataRow[];
}
