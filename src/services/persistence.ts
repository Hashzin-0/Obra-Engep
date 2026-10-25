import {
  AutomotiveProductItem,
  CalculationHistoryItem,
  FavoriteItem,
  FloorPlanProject,
  NotebookNote,
  ProjectDeadline,
} from '../types';

export const STORAGE_KEYS = {
  theme: 'obra_engep_theme',
  fontScale: 'obra_engep_font_scale',
  onboarded: 'obra_engep_onboarded',
  username: 'obra_engep_username',
  favoriteModules: 'obra_engep_favorite_modules',
  deadlines: 'obra_engep_deadlines',
  history: 'obra_engep_history',
  favorites: 'obra_engep_favorites',
  notebook: 'obra_engep_notebook',
  products: 'obra_engep_products',
  nrChecks: 'obra_engep_nr_checks',
  activeProject: 'obra_engep_active_project',
  projects: 'obra_engep_projects',
} as const;

export interface BackupFile {
  app: 'OBra ENGEP';
  version: 2;
  exportedAt: string;
  data: {
    deadlines: ProjectDeadline[];
    history: CalculationHistoryItem[];
    favorites: FavoriteItem[];
    notes: NotebookNote[];
    products: AutomotiveProductItem[];
    checklists: Record<string, Record<string, boolean>>;
    projects: FloorPlanProject[];
    theme?: string;
    fontScale?: number;
    username?: string;
  };
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readText(key: string, fallback = ''): string {
  return localStorage.getItem(key) ?? fallback;
}

export function writeText(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function removeStored(key: string): void {
  localStorage.removeItem(key);
}

export function buildBackup(): BackupFile {
  return {
    app: 'OBra ENGEP',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      deadlines: readStored(STORAGE_KEYS.deadlines, []),
      history: readStored(STORAGE_KEYS.history, []),
      favorites: readStored(STORAGE_KEYS.favorites, []),
      notes: readStored(STORAGE_KEYS.notebook, []),
      products: readStored(STORAGE_KEYS.products, []),
      checklists: readStored(STORAGE_KEYS.nrChecks, {}),
      projects: readStored(STORAGE_KEYS.projects, []),
      theme: readText(STORAGE_KEYS.theme),
      fontScale: Number(readText(STORAGE_KEYS.fontScale, '100')),
      username: readText(STORAGE_KEYS.username),
    },
  };
}

export function restoreBackup(raw: string): {
  ok: boolean;
  message: string;
  data?: BackupFile['data'];
} {
  try {
    const parsed = JSON.parse(raw) as Partial<BackupFile>;
    if (parsed.app !== 'OBra ENGEP' || !parsed.data) {
      return { ok: false, message: 'Arquivo não é um backup válido do OBra ENGEP.' };
    }

    const data = parsed.data;
    if (data.deadlines) writeStored(STORAGE_KEYS.deadlines, data.deadlines);
    if (data.history) writeStored(STORAGE_KEYS.history, data.history);
    if (data.favorites) writeStored(STORAGE_KEYS.favorites, data.favorites);
    if (data.notes) writeStored(STORAGE_KEYS.notebook, data.notes);
    if (data.products) writeStored(STORAGE_KEYS.products, data.products);
    if (data.checklists) writeStored(STORAGE_KEYS.nrChecks, data.checklists);
    if (data.projects) writeStored(STORAGE_KEYS.projects, data.projects);
    if (data.theme) writeText(STORAGE_KEYS.theme, data.theme);
    if (data.fontScale) writeText(STORAGE_KEYS.fontScale, String(data.fontScale));
    if (data.username) writeText(STORAGE_KEYS.username, data.username);

    return { ok: true, message: 'Backup restaurado. Recarregue o app para aplicar todos os dados.', data };
  } catch {
    return { ok: false, message: 'Não foi possível ler o arquivo JSON de backup.' };
  }
}
