/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Type definitions for OBra ENGEP
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export type MainTab = 'inicio' | 'biblioteca' | 'favoritos' | 'mais';

export type ModuleId =
  | 'calculadoras'
  | 'manuais'
  | 'projetos'
  | 'ia'
  | 'estetica'
  | 'legislacao';

export type AlertLevel = 'info' | 'warning' | 'danger';

export interface SourceInfo {
  type: 'Oficial' | 'Resumo' | 'Pessoal';
  verifiedDate: string;
  officialUrl?: string;
  authority?: string;
}

export interface CalculationHistoryItem {
  id: string;
  title: string;
  category: 'eletrica' | 'hidraulica' | 'materiais' | 'conversoes';
  timestamp: number;
  dateStr: string;
  resultValue: number;
  resultUnit: string;
  formula: string;
  premises: string;
  inputs: Record<string, number | string>;
  limitWarning: string;
}

export interface NotebookNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updatedAt: string;
  timestamp: number;
}

export interface FavoriteItem {
  id: string;
  type: 'calculadora' | 'norma' | 'manual' | 'projeto' | 'produto' | 'nota';
  title: string;
  subtitle: string;
  moduleId: ModuleId;
  metadata?: Record<string, string>;
  addedAt: number;
}

export interface NRItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  applicability: string;
  authorizedRoles: string;
  epiEpc: string;
  officialUrl: string;
  lastVerified: string;
  isOfficial: boolean;
  checklist: { id: string; label: string; checked: boolean }[];
}

export interface ABNTStandardItem {
  id: string;
  code: string;
  title: string;
  editionYear: string;
  status: 'Em vigor' | 'Em revisão' | 'Cancelada';
  area: string;
  summary: string;
  officialUrl: string;
  lastVerified: string;
}

export interface LegislationItem {
  id: string;
  jurisdiction: 'Federal' | 'Estadual (SP)' | 'Municipal (SP)';
  code: string;
  title: string;
  year: string;
  summary: string;
  officialUrl: string;
  lastVerified: string;
  dependsOnTownHall: boolean;
}

export interface AutomotiveDirtItem {
  id: string;
  name: string;
  category: 'interior' | 'exterior';
  surface: string;
  probableOrigin: string;
  approach: string;
  cautions: string[];
  recommendedProduct: string;
}

export interface AutomotiveProductItem {
  id: string;
  name: string;
  manufacturer: string;
  phType: 'Neutro' | 'Ácido' | 'Alcalino';
  targetSurfaces: string[];
  dilutionRatio: string;
  dilutionNumber: number;
  actionTimeMinutes: string;
  yieldInfo: string;
  instructions: string;
  cautions: string[];
  sourceLabel: string;
  verifiedDate: string;
  labelPhotoReference?: string;
  labelPhotoStoragePath?: string;
  labelPhotoUrl?: string;
}

export interface ManualItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceLabel: string;
  steps: string[];
  cautions: string[];
}

export interface AppSettings {
  theme: ThemeMode;
  fontScale: number;
  notificationsEnabled: boolean;
  defaultProjectId?: string;
}

export interface SyncState {
  status: 'disabled' | 'connecting' | 'synced' | 'offline' | 'error';
  lastSyncedAt?: number;
  message?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface OpeningItem {
  id: string;
  type: 'door' | 'window';
  wallId: string;
  x: number;
  y: number;
  width: number;
  rotation?: number;
}

export interface ElectricalItem {
  rotation?: number;
  id: string;
  type: 'socket' | 'switch' | 'light' | 'panel';
  x: number;
  y: number;
  circuit: string;
  label: string;
}

export interface HydraulicItem {
  id: string;
  type: 'cold_water' | 'hot_water' | 'sewage' | 'drain';
  x: number;
  y: number;
  diameterMm: number;
  label: string;
}

export interface ProjectDeadline {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description: string;
  dueDate: string; // ISO format or YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluido';
  category: 'obra' | 'eletrica' | 'hidraulica' | 'estrutural' | 'seguranca' | 'estetica' | 'alvara';
  reminderMinutesBefore: number; // e.g. 1440 for 1 day, 60 for 1 hour
  notified?: boolean;
}

export interface FloorPlanProject {
  id: string;
  name: string;
  type: 'arquitetonica' | 'eletrica' | 'hidraulica' | 'estrutural';
  stage: 'estudo_preliminar' | 'executivo';
  scale: string; // e.g. "1:50"
  updatedAt: string;
  walls: WallSegment[];
  openings: OpeningItem[];
  electrical: ElectricalItem[];
  hydraulic: HydraulicItem[];
  deadlines?: ProjectDeadline[];
}

