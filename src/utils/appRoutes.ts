import type { MainTab, ModuleId } from '../types';

export type LibrarySection = 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';

export interface ResolvedAppRoute {
  tab: MainTab;
  module: ModuleId | null;
  librarySubTab: LibrarySection;
  itemId?: string;
}

export function resolveAppRoute(pathname: string): ResolvedAppRoute {
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const section = parts[0] ?? 'inicio';

  if (section === 'fav' || section === 'favoritos') {
    return { tab: 'favoritos', module: null, librarySubTab: 'nrs' };
  }
  if (section === 'mais') {
    return { tab: 'mais', module: null, librarySubTab: 'nrs' };
  }
  if (section === 'biblioteca') {
    const sub = parts[1];
    const librarySubTab: LibrarySection =
      sub === 'abnt' || sub === 'legislacao' || sub === 'estetica' || sub === 'manuais'
        ? sub
        : 'nrs';
    return { tab: 'biblioteca', module: null, librarySubTab, itemId: parts[2] };
  }
  if (section === 'manuais' || section === 'nrs') {
    return { tab: 'biblioteca', module: null, librarySubTab: 'nrs', itemId: parts[1] };
  }
  if (section === 'abnt' || section === 'legislacao' || section === 'estetica') {
    return { tab: 'biblioteca', module: null, librarySubTab: section, itemId: parts[1] };
  }
  if (section === 'calculadoras' || section === 'projetos' || section === 'ia' || section === 'contratos') {
    return { tab: 'inicio', module: section, librarySubTab: 'nrs', itemId: parts[1] };
  }
  return { tab: 'inicio', module: null, librarySubTab: 'nrs' };
}

export function pathForTab(tab: MainTab): string {
  switch (tab) {
    case 'biblioteca': return '/biblioteca';
    case 'favoritos': return '/fav';
    case 'mais': return '/mais';
    default: return '/';
  }
}

export function pathForModule(module: ModuleId, subItem?: string): string {
  const suffix = subItem ? `/${encodeURIComponent(subItem)}` : '';
  switch (module) {
    case 'calculadoras': return `/calculadoras${suffix}`;
    case 'projetos': return `/projetos${suffix}`;
    case 'ia': return `/ia${suffix}`;
    case 'contratos': return `/contratos${suffix}`;
    case 'manuais': return `/biblioteca/nrs${suffix}`;
    case 'legislacao': return `/biblioteca/legislacao${suffix}`;
    case 'estetica': return `/biblioteca/estetica${suffix}`;
    default: return '/biblioteca';
  }
}

export function pathForLibrarySection(section: LibrarySection, itemId?: string): string {
  const suffix = itemId ? `/${encodeURIComponent(itemId)}` : '';
  return `/biblioteca/${section}${suffix}`;
}
