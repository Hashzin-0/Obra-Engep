import type { MainTab, ModuleId } from '../types';

export type LibrarySection = 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';

export interface ResolvedAppRoute {
  tab: MainTab;
  module: ModuleId | null;
  librarySubTab: LibrarySection;
  itemId?: string;
}

const HOME = '/site';

export function resolveAppRoute(pathname: string): ResolvedAppRoute {
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  if (parts[0] !== 'site') {
    return { tab: 'inicio', module: null, librarySubTab: 'nrs' };
  }

  const section = parts[1] ?? 'inicio';
  if (section === 'fav' || section === 'favoritos') {
    return { tab: 'favoritos', module: null, librarySubTab: 'nrs' };
  }
  if (section === 'mais') {
    return { tab: 'mais', module: null, librarySubTab: 'nrs' };
  }
  if (section === 'biblioteca') {
    const sub = parts[2];
    const librarySubTab: LibrarySection =
      sub === 'abnt' || sub === 'legislacao' || sub === 'estetica' || sub === 'manuais'
        ? sub
        : 'nrs';
    return { tab: 'biblioteca', module: null, librarySubTab, itemId: parts[3] };
  }
  if (section === 'manuais' || section === 'nrs') {
    return { tab: 'biblioteca', module: null, librarySubTab: 'nrs', itemId: parts[2] };
  }
  if (section === 'abnt' || section === 'legislacao' || section === 'estetica') {
    return { tab: 'biblioteca', module: null, librarySubTab: section, itemId: parts[2] };
  }
  if (section === 'calculadoras' || section === 'projetos' || section === 'ia' || section === 'contratos') {
    return { tab: 'inicio', module: section, librarySubTab: 'nrs', itemId: parts[2] };
  }
  return { tab: 'inicio', module: null, librarySubTab: 'nrs' };
}

export function pathForTab(tab: MainTab): string {
  switch (tab) {
    case 'biblioteca': return `${HOME}/biblioteca`;
    case 'favoritos': return `${HOME}/fav`;
    case 'mais': return `${HOME}/mais`;
    default: return HOME;
  }
}

export function pathForModule(module: ModuleId, subItem?: string): string {
  const suffix = subItem ? `/${encodeURIComponent(subItem)}` : '';
  switch (module) {
    case 'calculadoras': return `${HOME}/calculadoras${suffix}`;
    case 'projetos': return `${HOME}/projetos${suffix}`;
    case 'ia': return `${HOME}/ia${suffix}`;
    case 'contratos': return `${HOME}/contratos${suffix}`;
    case 'manuais': return `${HOME}/biblioteca/nrs${suffix}`;
    case 'legislacao': return `${HOME}/biblioteca/legislacao${suffix}`;
    case 'estetica': return `${HOME}/biblioteca/estetica${suffix}`;
    default: return `${HOME}/biblioteca`;
  }
}

export function pathForLibrarySection(section: LibrarySection, itemId?: string): string {
  const suffix = itemId ? `/${encodeURIComponent(itemId)}` : '';
  return `${HOME}/biblioteca/${section}${suffix}`;
}
