import { getSupabaseSession, supabase } from '../lib/supabase';

type DataRow = Record<string, any>;

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


function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} deve conter entre 1 e ${maxLength} caracteres.`);
  }
  return value.trim();
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('Um dos campos de texto excede o limite permitido.');
  return value.trim();
}

function requiredId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Informe um identificador válido do registro.');
  }
  return value;
}

function confirmedDeletion(value: unknown): void {
  if (value !== true) throw new Error('A exclusão exige confirmação explícita do usuário. Pergunte antes de tentar novamente.');
}

export async function loadVoiceAgentProjects(limitValue: unknown = 20): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db.from('projects')
    .select('id,name,type,stage,scale,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 20, 30));
  if (error) throw new Error('Não foi possível consultar os projetos salvos.');
  return (data ?? []) as DataRow[];
}

export async function searchVoiceAgentNotes(queryValue: unknown, limitValue: unknown = 10): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  let request = db.from('notes')
    .select('id,title,content,category,tags,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 10, 20));
  if (typeof queryValue === 'string' && queryValue.trim()) {
    const query = escapeLikePattern(queryValue.trim().slice(0, 80));
    request = request.ilike('title', `%${query}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error('Não foi possível consultar as notas da conta.');
  return (data ?? []) as DataRow[];
}

export async function saveVoiceAgentNote(input: { id?: unknown; title: unknown; content?: unknown; category?: unknown; tags?: unknown }): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const title = requiredText(input.title, 'O título da nota', 200);
  const content = input.content === undefined ? '' : optionalText(input.content, 100000) ?? '';
  const category = optionalText(input.category, 80) ?? 'geral';
  const tags = input.tags === undefined ? [] : input.tags;
  if (!Array.isArray(tags) || tags.length > 30 || tags.some((tag) => typeof tag !== 'string' || tag.length > 80)) {
    throw new Error('As tags devem ser uma lista de até 30 textos curtos.');
  }
  const payload = { title, content, category, tags, user_id: userId, updated_at: new Date().toISOString() };
  const query = input.id
    ? db.from('notes').update(payload).eq('id', requiredId(input.id)).eq('user_id', userId)
    : db.from('notes').insert(payload);
  const { data, error } = await query.select('id,title,content,category,tags,created_at,updated_at').single();
  if (error || !data) throw new Error('Não foi possível salvar a nota. Verifique os dados e tente novamente.');
  return data as DataRow;
}

export async function deleteVoiceAgentNote(idValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const { error } = await database().from('notes').delete().eq('id', requiredId(idValue)).eq('user_id', userId);
  if (error) throw new Error('Não foi possível excluir a nota.');
}

export async function searchVoiceAgentProducts(queryValue: unknown, limitValue: unknown = 10): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  let request = db.from('products')
    .select('id,name,manufacturer,ph_type,target_surfaces,dilution_ratio,dilution_number,action_time_minutes,yield_info,instructions,cautions,source_label,verified_date,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 10, 20));
  if (typeof queryValue === 'string' && queryValue.trim()) {
    const query = escapeLikePattern(queryValue.trim().slice(0, 80));
    request = request.ilike('name', `%${query}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error('Não foi possível consultar os produtos cadastrados.');
  return (data ?? []) as DataRow[];
}

export async function saveVoiceAgentProduct(input: Record<string, unknown>): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const name = requiredText(input.name, 'O nome do produto', 180);
  const phType = input.ph_type ?? 'Neutro';
  if (!['Neutro', 'Ácido', 'Alcalino'].includes(String(phType))) throw new Error('O tipo de pH deve ser Neutro, Ácido ou Alcalino.');
  const arrayField = (value: unknown, label: string, max: number): string[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== 'string' || item.length > 500)) throw new Error(`${label} deve ser uma lista de até ${max} textos.`);
    return value as string[];
  };
  const dilutionNumber = input.dilution_number === undefined ? 1 : Number(input.dilution_number);
  if (!Number.isFinite(dilutionNumber) || dilutionNumber <= 0) throw new Error('A diluição numérica deve ser maior que zero.');
  const payload: Record<string, unknown> = {
    user_id: userId,
    name,
    manufacturer: optionalText(input.manufacturer, 180) ?? '',
    ph_type: phType,
    target_surfaces: arrayField(input.target_surfaces, 'Superfícies', 30),
    dilution_ratio: optionalText(input.dilution_ratio, 120) ?? '',
    dilution_number: dilutionNumber,
    action_time_minutes: optionalText(input.action_time_minutes, 120) ?? '',
    yield_info: optionalText(input.yield_info, 500) ?? '',
    instructions: optionalText(input.instructions, 10000) ?? '',
    cautions: arrayField(input.cautions, 'Cuidados', 30),
    source_label: optionalText(input.source_label, 240) ?? '',
    updated_at: new Date().toISOString(),
  };
  if (input.verified_date !== undefined) payload.verified_date = input.verified_date;
  const query = input.id
    ? db.from('products').update(payload).eq('id', requiredId(input.id)).eq('user_id', userId)
    : db.from('products').insert(payload);
  const { data, error } = await query.select('id,name,manufacturer,ph_type,target_surfaces,dilution_ratio,dilution_number,action_time_minutes,yield_info,instructions,cautions,source_label,verified_date,updated_at').single();
  if (error || !data) throw new Error('Não foi possível salvar o produto cadastrado.');
  return data as DataRow;
}

export async function deleteVoiceAgentProduct(idValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const { error } = await database().from('products').delete().eq('id', requiredId(idValue)).eq('user_id', userId);
  if (error) throw new Error('Não foi possível excluir o produto.');
}

export async function loadVoiceAgentChecklists(limitValue: unknown = 20): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db.from('checklists')
    .select('id,norm_id,items,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 20, 30));
  if (error) throw new Error('Não foi possível consultar os checklists salvos.');
  return (data ?? []) as DataRow[];
}

export async function saveVoiceAgentChecklist(input: { id?: unknown; normId: unknown; items: unknown }): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const normId = requiredText(input.normId, 'O identificador do checklist', 120);
  if (!Array.isArray(input.items) || input.items.length > 500) throw new Error('O checklist deve conter uma lista de até 500 itens.');
  const serialized = JSON.stringify(input.items);
  if (serialized.length > 900000) throw new Error('O checklist excede o limite de tamanho permitido.');
  const payload = { user_id: userId, norm_id: normId, items: input.items, updated_at: new Date().toISOString() };
  const query = input.id
    ? db.from('checklists').update(payload).eq('id', requiredId(input.id)).eq('user_id', userId)
    : db.from('checklists').upsert(payload, { onConflict: 'user_id,norm_id' });
  const { data, error } = await query.select('id,norm_id,items,created_at,updated_at').single();
  if (error || !data) throw new Error('Não foi possível salvar o checklist.');
  return data as DataRow;
}

export async function deleteVoiceAgentChecklist(idValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const { error } = await database().from('checklists').delete().eq('id', requiredId(idValue)).eq('user_id', userId);
  if (error) throw new Error('Não foi possível excluir o checklist.');
}

export async function loadVoiceAgentContracts(limitValue: unknown = 10): Promise<DataRow[]> {
  const [db, userId] = [database(), await authenticatedOwnerId()];
  const { data, error } = await db.from('legal_contracts')
    .select('id,model_id,title,content,fields,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(normalizeToolLimit(limitValue, 10, 15));
  if (error) throw new Error('Não foi possível consultar os contratos salvos.');
  return (data ?? []).map((row) => ({ ...row, content: typeof row.content === 'string' ? row.content.slice(0, 12000) : '' })) as DataRow[];
}

export async function saveVoiceAgentContract(input: { id?: unknown; modelId: unknown; title: unknown; content: unknown; fields?: unknown }): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const modelId = requiredText(input.modelId, 'O identificador do modelo', 160);
  const title = requiredText(input.title, 'O título do contrato', 240);
  const content = requiredText(input.content, 'O conteúdo do contrato', 100000);
  const fields = input.fields ?? {};
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || JSON.stringify(fields).length > 100000) throw new Error('Os campos do contrato devem ser um objeto JSON válido e limitado.');
  const payload = { user_id: userId, model_id: modelId, title, content, fields, updated_at: new Date().toISOString() };
  const query = input.id
    ? db.from('legal_contracts').update(payload).eq('id', requiredId(input.id)).eq('user_id', userId)
    : db.from('legal_contracts').insert(payload);
  const { data, error } = await query.select('id,model_id,title,content,fields,created_at,updated_at').single();
  if (error || !data) throw new Error('Não foi possível salvar o contrato.');
  return { ...data, content: data.content.slice(0, 12000) } as DataRow;
}

export async function deleteVoiceAgentContract(idValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const { error } = await database().from('legal_contracts').delete().eq('id', requiredId(idValue)).eq('user_id', userId);
  if (error) throw new Error('Não foi possível excluir o contrato salvo.');
}

export async function saveVoiceAgentDeadline(input: Record<string, unknown>): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const title = requiredText(input.title, 'O título do prazo', 200);
  const dueDate = requiredText(input.due_date, 'A data do prazo (AAAA-MM-DD)', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate + 'T00:00:00Z'))) throw new Error('Informe a data no formato AAAA-MM-DD.');
  const priority = input.priority ?? 'media';
  const status = input.status ?? 'pendente';
  const category = input.category ?? 'obra';
  if (!['baixa', 'media', 'alta'].includes(String(priority))) throw new Error('Prioridade inválida. Use baixa, media ou alta.');
  if (!['pendente', 'em_andamento', 'concluido'].includes(String(status))) throw new Error('Status inválido.');
  if (!['obra', 'eletrica', 'hidraulica', 'estrutural', 'seguranca', 'estetica', 'alvara'].includes(String(category))) throw new Error('Categoria inválida.');
  const payload: Record<string, unknown> = {
    user_id: userId, title, due_date: dueDate, priority, status, category,
    description: optionalText(input.description, 5000) ?? '',
    project_name: optionalText(input.project_name, 160) ?? null,
    timezone: 'America/Sao_Paulo',
    updated_at: new Date().toISOString(),
  };
  if (input.due_time !== undefined) payload.due_time = optionalText(input.due_time, 8) ?? null;
  if (input.project_id !== undefined && input.project_id !== null) payload.project_id = requiredId(input.project_id);
  if (input.reminder_minutes_before !== undefined) {
    const minutes = Number(input.reminder_minutes_before);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 525600) throw new Error('Antecedência do lembrete deve ser um número inteiro entre 0 e 525600 minutos.');
    payload.reminder_minutes_before = minutes;
  }
  const query = input.id
    ? db.from('deadlines').update(payload).eq('id', requiredId(input.id)).eq('user_id', userId)
    : db.from('deadlines').insert(payload);
  const { data, error } = await query.select('id,title,description,due_date,due_time,priority,status,category,project_name,project_id,reminder_minutes_before,created_at,updated_at').single();
  if (error || !data) throw new Error('Não foi possível salvar o prazo.');
  return data as DataRow;
}

export async function deleteVoiceAgentDeadline(idValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const { error } = await database().from('deadlines').delete().eq('id', requiredId(idValue)).eq('user_id', userId);
  if (error) throw new Error('Não foi possível excluir o prazo.');
}

export async function loadVoiceAgentAccount(): Promise<{ profile: DataRow | null; settings: DataRow | null }> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const [profileResult, settingsResult] = await Promise.all([
    db.from('profiles').select('id,display_name,profession,company,created_at,updated_at').eq('id', userId).maybeSingle(),
    db.from('app_settings').select('theme,font_scale,notifications_enabled,default_project_id,updated_at').eq('user_id', userId).maybeSingle(),
  ]);
  if (profileResult.error || settingsResult.error) throw new Error('Não foi possível consultar o perfil e as preferências da conta.');
  return { profile: (profileResult.data ?? null) as DataRow | null, settings: (settingsResult.data ?? null) as DataRow | null };
}

export async function updateVoiceAgentProfile(input: Record<string, unknown>): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const payload: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
  if (input.display_name !== undefined) payload.display_name = requiredText(input.display_name, 'O nome de exibição', 120);
  if (input.profession !== undefined) payload.profession = optionalText(input.profession, 120);
  if (input.company !== undefined) payload.company = optionalText(input.company, 160);
  if (Object.keys(payload).length === 2) throw new Error('Informe ao menos um campo do perfil para atualizar.');
  const { data, error } = await db.from('profiles').upsert(payload, { onConflict: 'id' }).select('id,display_name,profession,company,updated_at').single();
  if (error || !data) throw new Error('Não foi possível atualizar o perfil.');
  return data as DataRow;
}

export async function updateVoiceAgentSettings(input: Record<string, unknown>): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (input.theme !== undefined) {
    if (!['light', 'dark', 'system'].includes(String(input.theme))) throw new Error('Tema inválido. Use light, dark ou system.');
    payload.theme = input.theme;
  }
  if (input.font_scale !== undefined) {
    const scale = Number(input.font_scale);
    if (!Number.isFinite(scale) || scale < 0.8 || scale > 2) throw new Error('A escala de fonte deve estar entre 0,8 e 2.');
    payload.font_scale = scale;
  }
  if (input.notifications_enabled !== undefined) {
    if (typeof input.notifications_enabled !== 'boolean') throw new Error('notifications_enabled deve ser verdadeiro ou falso.');
    payload.notifications_enabled = input.notifications_enabled;
  }
  if (input.default_project_id !== undefined) payload.default_project_id = input.default_project_id === null ? null : requiredId(input.default_project_id);
  if (Object.keys(payload).length === 2) throw new Error('Informe ao menos uma preferência para atualizar.');
  const { data, error } = await db.from('app_settings').upsert(payload, { onConflict: 'user_id' }).select('theme,font_scale,notifications_enabled,default_project_id,updated_at').single();
  if (error || !data) throw new Error('Não foi possível atualizar as preferências.');
  return data as DataRow;
}

export async function addVoiceAgentFavorite(input: Record<string, unknown>): Promise<DataRow> {
  const db = database();
  const userId = await authenticatedOwnerId();
  const itemId = requiredText(input.item_id, 'O ID do item', 240);
  const { data: existing, error: lookupError } = await db.from('favorites').select('id,item_id,title').eq('user_id', userId).eq('item_id', itemId).maybeSingle();
  if (lookupError) throw new Error('Não foi possível verificar os favoritos existentes.');
  if (existing) return existing as DataRow;
  const payload = {
    user_id: userId,
    item_type: requiredText(input.item_type, 'O tipo do item', 80),
    item_id: itemId,
    title: requiredText(input.title, 'O título do favorito', 240),
    subtitle: optionalText(input.subtitle, 300) ?? '',
    module_id: requiredText(input.module_id, 'O módulo do favorito', 80),
    metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata) ? input.metadata : {},
  };
  const { data, error } = await db.from('favorites').insert(payload).select('id,item_type,item_id,title,subtitle,module_id,created_at').single();
  if (error || !data) throw new Error('Não foi possível adicionar o favorito.');
  return data as DataRow;
}

export async function removeVoiceAgentFavorite(itemIdValue: unknown, confirmed: unknown): Promise<void> {
  confirmedDeletion(confirmed);
  const userId = await authenticatedOwnerId();
  const itemId = requiredText(itemIdValue, 'O ID do favorito', 240);
  const { error } = await database().from('favorites').delete().eq('item_id', itemId).eq('user_id', userId);
  if (error) throw new Error('Não foi possível remover o favorito.');
}

export async function submitVoiceAgentFeedback(messageValue: unknown, pageValue?: unknown): Promise<DataRow> {
  const userId = await authenticatedOwnerId();
  const message = requiredText(messageValue, 'A mensagem de feedback', 5000);
  const page = optionalText(pageValue, 255) ?? (typeof window !== 'undefined' ? window.location.pathname : null);
  const { data, error } = await database().from('feedback').insert({ user_id: userId, message, page })
    .select('id,message,page,status,created_at').single();
  if (error || !data) throw new Error('Não foi possível registrar o feedback.');
  return data as DataRow;
}
