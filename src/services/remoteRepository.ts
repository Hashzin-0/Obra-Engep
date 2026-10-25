import { supabase } from '../lib/supabase';
import {
  AppSettings,
  AutomotiveProductItem,
  CalculationHistoryItem,
  FavoriteItem,
  FloorPlanProject,
  ABNTStandardItem,
  AutomotiveDirtItem,
  LegislationItem,
  ManualItem,
  NotebookNote,
  NRItem,
  ProjectDeadline,
} from '../types';

type Row = Record<string, any>;

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

function isoDate(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function dateBr(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
}

function timeValue(value?: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

export function mapDeadline(row: Row): ProjectDeadline {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    title: row.title,
    description: row.description ?? '',
    dueDate: row.due_date,
    dueTime: timeValue(row.due_time) ?? undefined,
    priority: row.priority,
    status: row.status,
    category: row.category,
    reminderMinutesBefore: row.reminder_minutes_before ?? 1440,
    notified: Boolean(row.notified_at),
  };
}

export function mapHistory(row: Row): CalculationHistoryItem {
  const timestamp = row.created_at ? Date.parse(row.created_at) : Date.now();
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    timestamp,
    dateStr: new Date(timestamp).toLocaleDateString('pt-BR'),
    resultValue: Number(row.result_value ?? 0),
    resultUnit: row.result_unit ?? '',
    formula: row.formula ?? '',
    premises: row.premises ?? '',
    inputs: row.inputs ?? {},
    limitWarning: row.limit_warning ?? '',
  };
}

export function mapFavorite(row: Row): FavoriteItem {
  return {
    id: row.item_id,
    type: row.item_type,
    title: row.title,
    subtitle: row.subtitle ?? '',
    moduleId: row.module_id,
    metadata: row.metadata ?? {},
    addedAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  };
}

export function mapNote(row: Row): NotebookNote {
  const timestamp = row.updated_at ? Date.parse(row.updated_at) : Date.now();
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    category: row.category ?? 'Geral',
    tags: row.tags ?? [],
    updatedAt: new Date(timestamp).toLocaleDateString('pt-BR'),
    timestamp,
  };
}

export function mapProduct(row: Row): AutomotiveProductItem {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer ?? '',
    phType: row.ph_type,
    targetSurfaces: row.target_surfaces ?? [],
    dilutionRatio: row.dilution_ratio ?? '',
    dilutionNumber: Number(row.dilution_number ?? 1),
    actionTimeMinutes: row.action_time_minutes ?? '',
    yieldInfo: row.yield_info ?? '',
    instructions: row.instructions ?? '',
    cautions: row.cautions ?? [],
    sourceLabel: row.source_label ?? '',
    verifiedDate: dateBr(row.verified_date),
    labelPhotoStoragePath: row.label_photo_path ?? undefined,
  };
}

export function mapProject(row: Row): FloorPlanProject {
  const data = row.data ?? {};
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    stage: row.stage,
    scale: row.scale,
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : '',
    walls: data.walls ?? [],
    openings: data.openings ?? [],
    electrical: data.electrical ?? [],
    hydraulic: data.hydraulic ?? [],
  };
}

function mapChecklist(row: Row): Record<string, boolean> {
  const items = row.items;
  if (Array.isArray(items)) {
    return Object.fromEntries(
      items.filter((item) => item && typeof item === 'object').map((item) => [item.id, Boolean(item.checked)])
    );
  }
  if (items && typeof items === 'object') {
    return Object.fromEntries(Object.entries(items).map(([key, value]) => [key, Boolean(value)]));
  }
  return {};
}

export interface RemoteLibrary {
  nrs: NRItem[];
  abnt: ABNTStandardItem[];
  legislation: LegislationItem[];
  manuals: ManualItem[];
  dirt: AutomotiveDirtItem[];
}

export async function loadLibraryItems(): Promise<RemoteLibrary> {
  const db = client();
  const { data, error } = await db.from('library_items').select('*').order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    nrs: rows
      .filter((row) => row.kind === 'nr')
      .map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title,
        summary: row.summary,
        applicability: row.body?.applicability ?? '',
        authorizedRoles: row.body?.authorizedRoles ?? '',
        epiEpc: row.body?.epiEpc ?? '',
        officialUrl: row.official_url ?? '',
        lastVerified: dateBr(row.verified_at),
        isOfficial: true,
        checklist: Array.isArray(row.body?.checklist) ? row.body.checklist : [],
      })),
    abnt: rows
      .filter((row) => row.kind === 'abnt')
      .map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title,
        editionYear: row.body?.editionYear ?? '',
        status: row.body?.status ?? 'Em vigor',
        area: row.body?.area ?? '',
        summary: row.summary,
        officialUrl: row.official_url ?? '',
        lastVerified: dateBr(row.verified_at),
      })),
    legislation: rows
      .filter((row) => row.kind === 'legislacao')
      .map((row) => ({
        id: row.id,
        jurisdiction: row.jurisdiction ?? 'Federal',
        code: row.code,
        title: row.title,
        year: row.body?.year ?? '',
        summary: row.summary,
        officialUrl: row.official_url ?? '',
        lastVerified: dateBr(row.verified_at),
        dependsOnTownHall: Boolean(row.body?.dependsOnTownHall),
      })),
    manuals: rows
      .filter((row) => row.kind === 'manual')
      .map((row) => ({
        id: row.id,
        title: row.title,
        category: row.body?.category ?? '',
        summary: row.summary,
        sourceLabel: row.body?.sourceLabel ?? '',
        steps: Array.isArray(row.body?.steps) ? row.body.steps : [],
        cautions: Array.isArray(row.body?.cautions) ? row.body.cautions : [],
      })),
    dirt: rows
      .filter((row) => row.kind === 'sujeira')
      .map((row) => ({
        id: row.id,
        name: row.title,
        category: row.body?.category ?? 'exterior',
        surface: row.body?.surface ?? '',
        probableOrigin: row.body?.probableOrigin ?? '',
        approach: row.body?.approach ?? row.summary,
        cautions: Array.isArray(row.body?.cautions) ? row.body.cautions : [],
        recommendedProduct: row.body?.recommendedProduct ?? '',
      })),
  };
}

export async function loadRemoteData(userId: string) {
  const db = client();
  const [deadlines, history, favorites, notes, products, checklists, settings, projects] =
    await Promise.all([
      db.from('deadlines').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
      db.from('calculation_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      db.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      db.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      db.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      db.from('checklists').select('*').eq('user_id', userId),
      db.from('app_settings').select('*').eq('user_id', userId).maybeSingle(),
      db.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    ]);

  const firstError = [deadlines, history, favorites, notes, products, checklists, settings, projects].find(
    (result) => result.error
  )?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    deadlines: (deadlines.data ?? []).map(mapDeadline),
    history: (history.data ?? []).map(mapHistory),
    favorites: (favorites.data ?? []).map(mapFavorite),
    notes: (notes.data ?? []).map(mapNote),
    products: (products.data ?? []).map(mapProduct),
    checklists: Object.fromEntries(
      (checklists.data ?? []).map((row: Row) => [row.norm_id, mapChecklist(row)])
    ) as Record<string, Record<string, boolean>>,
    settings: settings.data
      ? ({
          theme: settings.data.theme,
          fontScale: Number(settings.data.font_scale) * 100,
          notificationsEnabled: Boolean(settings.data.notifications_enabled),
          defaultProjectId: settings.data.default_project_id ?? undefined,
        } satisfies AppSettings)
      : null,
    projects: (projects.data ?? []).map(mapProject),
  };
}

export async function saveDeadline(userId: string, deadline: ProjectDeadline) {
  const { error } = await client().from('deadlines').upsert(
    {
      id: deadline.id,
      user_id: userId,
      project_id: deadline.projectId ?? null,
      project_name: deadline.projectName ?? null,
      title: deadline.title,
      description: deadline.description,
      due_date: isoDate(deadline.dueDate),
      due_time: deadline.dueTime ? `${deadline.dueTime.slice(0, 5)}:00` : null,
      priority: deadline.priority,
      status: deadline.status,
      category: deadline.category,
      reminder_minutes_before: deadline.reminderMinutesBefore,
      notified_at: deadline.notified ? new Date().toISOString() : null,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteDeadline(userId: string, id: string) {
  const { error } = await client().from('deadlines').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveHistory(userId: string, item: CalculationHistoryItem) {
  const { error } = await client().from('calculation_history').upsert(
    {
      id: item.id,
      user_id: userId,
      title: item.title,
      category: item.category,
      result_value: item.resultValue,
      result_unit: item.resultUnit,
      formula: item.formula,
      premises: item.premises,
      inputs: item.inputs,
      limit_warning: item.limitWarning,
      created_at: new Date(item.timestamp).toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteHistory(userId: string, id: string) {
  const { error } = await client().from('calculation_history').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function clearHistory(userId: string) {
  const { error } = await client().from('calculation_history').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveFavorite(userId: string, item: FavoriteItem) {
  const { error } = await client().from('favorites').upsert(
    {
      user_id: userId,
      item_type: item.type,
      item_id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      module_id: item.moduleId,
      metadata: item.metadata ?? {},
    },
    { onConflict: 'user_id,item_type,item_id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteFavorite(userId: string, item: FavoriteItem) {
  const { error } = await client()
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('item_type', item.type)
    .eq('item_id', item.id);
  if (error) throw new Error(error.message);
}

export async function saveNote(userId: string, note: NotebookNote) {
  const { error } = await client().from('notes').upsert(
    {
      id: note.id,
      user_id: userId,
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteNote(userId: string, id: string) {
  const { error } = await client().from('notes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function uploadProductLabel(
  userId: string,
  productId: string,
  file: File
): Promise<string> {
  const clientInstance = client();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/products/${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await clientInstance.storage.from('user-media').upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function saveProduct(userId: string, product: AutomotiveProductItem) {
  const { error } = await client().from('products').upsert(
    {
      id: product.id,
      user_id: userId,
      name: product.name,
      manufacturer: product.manufacturer,
      ph_type: product.phType,
      target_surfaces: product.targetSurfaces,
      dilution_ratio: product.dilutionRatio,
      dilution_number: product.dilutionNumber,
      action_time_minutes: product.actionTimeMinutes,
      yield_info: product.yieldInfo,
      instructions: product.instructions,
      cautions: product.cautions,
      source_label: product.sourceLabel,
      verified_date: isoDate(product.verifiedDate),
      label_photo_path: product.labelPhotoStoragePath ?? null,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteProduct(userId: string, id: string) {
  const { error } = await client().from('products').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveChecklist(userId: string, normId: string, items: Record<string, boolean>) {
  const { error } = await client().from('checklists').upsert(
    { user_id: userId, norm_id: normId, items },
    { onConflict: 'user_id,norm_id' }
  );
  if (error) throw new Error(error.message);
}

export async function saveSettings(userId: string, settings: AppSettings) {
  const { error } = await client().from('app_settings').upsert(
    {
      user_id: userId,
      theme: settings.theme,
      font_scale: Math.min(2, Math.max(0.8, settings.fontScale / 100)),
      notifications_enabled: settings.notificationsEnabled,
      default_project_id: settings.defaultProjectId ?? null,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function saveProject(userId: string, project: FloorPlanProject) {
  const { error } = await client().from('projects').upsert(
    {
      id: project.id,
      user_id: userId,
      name: project.name,
      type: project.type,
      stage: project.stage,
      scale: project.scale,
      data: {
        walls: project.walls,
        openings: project.openings,
        electrical: project.electrical,
        hydraulic: project.hydraulic,
      },
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
}

export async function deleteProject(userId: string, id: string) {
  const { error } = await client().from('projects').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveFeedback(userId: string, message: string, page?: string, email?: string) {
  const { error } = await client().from('feedback').insert({
    user_id: userId,
    message,
    page,
    contact_email: email || null,
  });
  if (error) throw new Error(error.message);
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON,
  userAgent?: string
) {
  const keys = subscription.keys;
  if (!subscription.endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error('Inscrição push incompleta.');
  }
  const { error } = await client().from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expiration_time: subscription.expirationTime ?? null,
      user_agent: userAgent ?? navigator.userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const { error } = await client()
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) throw new Error(error.message);
}

export async function pushLocalData(
  userId: string,
  data: {
    deadlines: ProjectDeadline[];
    history: CalculationHistoryItem[];
    favorites: FavoriteItem[];
    notes: NotebookNote[];
    products: AutomotiveProductItem[];
    checklists: Record<string, Record<string, boolean>>;
    projects: FloorPlanProject[];
  }
) {
  await Promise.allSettled([
    ...data.deadlines.map((item) => saveDeadline(userId, item)),
    ...data.history.map((item) => saveHistory(userId, item)),
    ...data.favorites.map((item) => saveFavorite(userId, item)),
    ...data.notes.map((item) => saveNote(userId, item)),
    ...data.products.map((item) => saveProduct(userId, item)),
    ...Object.entries(data.checklists).map(([normId, items]) =>
      saveChecklist(userId, normId, items)
    ),
    ...data.projects.map((item) => saveProject(userId, item)),
  ]);
}
