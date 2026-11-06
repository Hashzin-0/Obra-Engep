import { supabase } from '../lib/supabase';
import { buildBackup } from './persistence';

export type PrivacyRequestType =
  | 'access'
  | 'correction'
  | 'deletion'
  | 'portability'
  | 'information'
  | 'other';

export interface PrivacyRequestRecord {
  id: string;
  request_type: PrivacyRequestType;
  details: string;
  status: 'received' | 'in_progress' | 'completed' | 'rejected';
  response_note: string | null;
  created_at: string;
}

export interface ConsentEventRecord {
  id: string;
  purpose: 'push_notifications';
  action: 'granted' | 'revoked';
  policy_version: string;
  source: string;
  created_at: string;
}

function client() {
  if (!supabase) throw new Error('O serviço de privacidade está indisponível.');
  return supabase;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser();
  if (error || !data.user) throw new Error('Entre novamente para acessar seus dados.');
  return data.user.id;
}

export async function recordPrivacyConsent(
  userId: string,
  action: 'granted' | 'revoked'
): Promise<void> {
  const db = client();
  const actualUserId = await currentUserId();
  if (actualUserId !== userId) throw new Error('Sessão não corresponde à conta atual.');
  const { error } = await db.from('privacy_consent_events').insert({
    user_id: actualUserId,
    purpose: 'push_notifications',
    action,
    policy_version: '2026-11-06.1',
    source: 'web_push_permission',
  });
  if (error) throw new Error('Não foi possível registrar a alteração de consentimento.');
}

export async function createPrivacyRequest(
  userId: string,
  requestType: PrivacyRequestType,
  details: string
): Promise<void> {
  const db = client();
  const actualUserId = await currentUserId();
  if (actualUserId !== userId) throw new Error('Sessão não corresponde à conta atual.');
  const cleanDetails = details.trim();
  if (cleanDetails.length > 2000) throw new Error('A descrição deve ter no máximo 2.000 caracteres.');

  const { error } = await db.from('privacy_requests').insert({
    user_id: actualUserId,
    request_type: requestType,
    details: cleanDetails,
  });
  if (error) throw new Error('Não foi possível registrar sua solicitação. Tente novamente.');
}

export async function loadPrivacyRecords(userId: string): Promise<{
  requests: PrivacyRequestRecord[];
  consents: ConsentEventRecord[];
}> {
  const db = client();
  const actualUserId = await currentUserId();
  if (actualUserId !== userId) throw new Error('Sessão não corresponde à conta atual.');

  const [requests, consents] = await Promise.all([
    db.from('privacy_requests')
      .select('id,request_type,details,status,response_note,created_at')
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('privacy_consent_events')
      .select('id,purpose,action,policy_version,source,created_at')
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (requests.error || consents.error) {
    throw new Error('Não foi possível carregar o histórico de privacidade.');
  }

  return {
    requests: (requests.data ?? []) as PrivacyRequestRecord[],
    consents: (consents.data ?? []) as ConsentEventRecord[],
  };
}

async function selectAllOwnedRows(table: string, ownerColumn: string, userId: string) {
  const db = client();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from(table)
      .select('*')
      .eq(ownerColumn, userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Falha ao exportar dados de ${table}.`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function downloadAccountData(userId: string): Promise<void> {
  const db = client();
  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    throw new Error('Entre novamente para exportar os dados da conta.');
  }

  const ownedTables = [
    'app_settings',
    'notification_preferences',
    'deadlines',
    'calculation_history',
    'favorites',
    'notes',
    'products',
    'checklists',
    'projects',
    'project_versions',
    'project_media',
    'legal_contracts',
    'feedback',
    'push_subscriptions',
    'privacy_requests',
    'privacy_consent_events',
  ] as const;

  const tableEntries = await Promise.all(
    ownedTables.map(async (table) => [table, await selectAllOwnedRows(table, 'user_id', userId)] as const)
  );

  const [profile, createdUpdates, createdCatalog] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    selectAllOwnedRows('app_updates', 'created_by', userId),
    selectAllOwnedRows('automotive_catalog', 'created_by', userId),
  ]);
  if (profile.error) throw new Error('Falha ao exportar o perfil.');

  const backup = buildBackup(userId);
  const payload = {
    application: 'OBra ENGEP',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: authData.user.id,
      email: authData.user.email ?? null,
      createdAt: authData.user.created_at,
      lastSignInAt: authData.user.last_sign_in_at ?? null,
      isAnonymous: Boolean(authData.user.is_anonymous),
      metadata: authData.user.user_metadata ?? {},
    },
    profile: profile.data,
    cloudData: Object.fromEntries(tableEntries),
    contentCreatedByAccount: {
      app_updates: createdUpdates,
      automotive_catalog: createdCatalog,
    },
    deviceData: backup,
    exportNotes: [
      'O arquivo reúne os registros acessíveis da conta autenticada e os dados locais do OBra ENGEP neste navegador.',
      'Arquivos binários do Storage não são incorporados; caminhos e metadados registrados em project_media são exportados.',
      'Dados técnicos internos de segurança, limites e infraestrutura não são expostos neste arquivo.',
    ],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `OBra_ENGEP_Dados_Pessoais_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function clearLocalAccountData(): void {
  const prefix = 'obra_engep_';
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }

  if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
    void indexedDB.databases().then((databases) => {
      for (const database of databases) {
        if (database.name?.startsWith(prefix)) indexedDB.deleteDatabase(database.name);
      }
    }).catch(() => undefined);
  }
}

export async function deleteOwnAccount(): Promise<void> {
  const db = client();
  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) throw new Error('Entre novamente antes de excluir a conta.');

  const { error } = await db.functions.invoke('delete-account', {
    body: { confirmation: 'DELETE_ACCOUNT', userId: authData.user.id },
  });
  if (error) throw new Error(error.message || 'A exclusão não foi concluída. Tente novamente.');

  clearLocalAccountData();
  await db.auth.signOut({ scope: 'local' });
}
