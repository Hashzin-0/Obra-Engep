/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pathForLibrarySection, pathForModule, pathForTab, resolveAppRoute } from './utils/appRoutes';
import type { Session } from '@supabase/supabase-js';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TopHeader } from './components/TopHeader';
import { LiquidGlassScene } from 'simple-liquid-glass/backdrop';
import { LiquidGlassSurface } from './components/LiquidGlassSurface';
import { HouseIcon as Home, BookOpenIcon as BookOpen, StarIcon as Star, SearchIcon as Search, MoonIcon as Moon, SunIcon as Sun, LaptopIcon as Laptop, UserRoundIcon as UserRound, LogInIcon as LogIn } from '@animateicons/react/lucide';
import { MoreHorizontal, CalendarDays } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(({ OnboardingModal }) => ({ default: OnboardingModal })));
const GlobalSearchModal = lazy(() => import('./components/GlobalSearchModal').then(({ GlobalSearchModal }) => ({ default: GlobalSearchModal })));

const HomeView = lazy(() => import('./views/HomeView').then(({ HomeView }) => ({ default: HomeView })));
const CalculatorsView = lazy(() => import('./views/CalculatorsView').then(({ CalculatorsView }) => ({ default: CalculatorsView })));
const LibraryView = lazy(() => import('./views/LibraryView').then(({ LibraryView }) => ({ default: LibraryView })));
const FloorPlanEditorView = lazy(() => import('./views/FloorPlanEditorView').then(({ FloorPlanEditorView }) => ({ default: FloorPlanEditorView })));
const AIStudiesView = lazy(() => import('./views/AIStudiesView').then(({ AIStudiesView }) => ({ default: AIStudiesView })));
const FavoritesView = lazy(() => import('./views/FavoritesView').then(({ FavoritesView }) => ({ default: FavoritesView })));
const MoreView = lazy(() => import('./views/MoreView').then(({ MoreView }) => ({ default: MoreView })));
const ContractsView = lazy(() => import('./views/ContractsView').then(({ ContractsView }) => ({ default: ContractsView })));

const DeadlinesCalendarModal = lazy(() => import('./components/DeadlinesCalendarModal').then(({ DeadlinesCalendarModal }) => ({ default: DeadlinesCalendarModal })));
const VoiceAgentOrbModal = lazy(() => import('./components/VoiceAgentOrbModal').then(({ VoiceAgentOrbModal }) => ({ default: VoiceAgentOrbModal })));

import {
  AutomotiveProductItem,
  CalculationHistoryItem,
  FavoriteItem,
  FloorPlanProject,
  MainTab,
  ModuleId,
  NotebookNote,
  ProjectDeadline,
  SyncState,
} from './types';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  clearHistory as clearRemoteHistory,
  deleteDeadline as deleteRemoteDeadline,
  deleteFavorite as deleteRemoteFavorite,
  deleteHistory as deleteRemoteHistory,
  deleteNote as deleteRemoteNote,
  deleteProduct as deleteRemoteProduct,
  deleteProject as deleteRemoteProject,
  loadRemoteData,
  loadRemoteProjects,
  pushLocalData,
  saveChecklist as saveRemoteChecklist,
  saveDeadline as saveRemoteDeadline,
  saveFavorite as saveRemoteFavorite,
  saveHistory as saveRemoteHistory,
  saveNote as saveRemoteNote,
  saveProduct as saveRemoteProduct,
  saveProject as saveRemoteProject,
  saveSettings as saveRemoteSettings,
  savePushSubscription,
} from './services/remoteRepository';
import {
  readStored,
  STORAGE_KEYS,
  writeStored,
} from './services/persistence';
import { ensureUuid } from './utils/uuid';

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-400" role="status">Carregando aplicação...</div>}>
        <AppShell />
      </Suspense>
    </ThemeProvider>
  );
}

function AppShell() {
  const { theme, fontScale, setTheme, setFontScale } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const initialRoute = resolveAppRoute(pathname);
  const [currentTab, setCurrentTab] = useState<MainTab>(initialRoute.tab);
  const [activeModuleView, setActiveModuleView] = useState<ModuleId | null>(initialRoute.module);
  const [librarySubTab, setLibrarySubTab] = useState<'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais'>(initialRoute.librarySubTab);
  const [librarySubItemId, setLibrarySubItemId] = useState<string | undefined>(initialRoute.itemId);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [agentState, setAgentState] = useState<'sleeping' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'happy' | 'error'>('sleeping');
  const [isAgentGuiding, setIsAgentGuiding] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(
    () => localStorage.getItem('obra_engep_onboarded') !== 'true'
  );
  const [aiInitialTab, setAiInitialTab] = useState<'solar' | 'ventilacao' | 'patologias'>('solar');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const [deadlines, setDeadlines] = useState<ProjectDeadline[]>(() =>
    readStored<ProjectDeadline[]>(STORAGE_KEYS.deadlines, []).map((deadline) => ({
      ...deadline,
      id: ensureUuid(deadline.id),
    }))
  );
  const [historyItems, setHistoryItems] = useState<CalculationHistoryItem[]>(() =>
    readStored<CalculationHistoryItem[]>(STORAGE_KEYS.history, []).map((item) => ({
      ...item,
      id: ensureUuid(item.id),
    }))
  );
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    readStored(STORAGE_KEYS.favorites, [])
  );
  const [notes, setNotes] = useState<NotebookNote[]>(() =>
    readStored<NotebookNote[]>(STORAGE_KEYS.notebook, []).map((note) => ({
      ...note,
      id: ensureUuid(note.id),
    }))
  );
  const [products, setProducts] = useState<AutomotiveProductItem[]>(() =>
    readStored<AutomotiveProductItem[]>(STORAGE_KEYS.products, []).map((product) => ({
      ...product,
      id: ensureUuid(product.id),
    }))
  );
  const [checklists, setChecklists] = useState<Record<string, Record<string, boolean>>>(() =>
    readStored(STORAGE_KEYS.nrChecks, {})
  );
  const [projects, setProjects] = useState<FloorPlanProject[]>([]);

  const [syncState, setSyncState] = useState<SyncState>({
    status: isSupabaseConfigured ? 'connecting' : 'disabled',
    message: isSupabaseConfigured ? undefined : 'O acesso à conta está temporariamente indisponível. Tente novamente mais tarde.',
  });
  const [remoteReady, setRemoteReady] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const [authenticatedUser, setAuthenticatedUser] = useState<{ id: string; email?: string; name?: string; avatarUrl?: string } | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    const route = resolveAppRoute(pathname);
    setCurrentTab(route.tab);
    setActiveModuleView(route.module);
    setLibrarySubTab(route.librarySubTab);
    setLibrarySubItemId(route.itemId);
    if (route.module === 'ia' && (route.itemId === 'ventilacao' || route.itemId === 'patologias')) {
      setAiInitialTab(route.itemId);
    }
  }, [pathname]);

  useEffect(() => {
    if (!supabase) {
      setAuthResolved(true);
      return;
    }

    let active = true;
    const syncAuthState = (session: Session | null) => {
      if (!active) return;
      const user = session?.user;
      const isGoogleUser = Boolean(user && !user.is_anonymous && user.app_metadata?.provider === 'google');
      const metadata = user?.user_metadata ?? {};
      setAuthenticatedUser(isGoogleUser && user ? {
        id: user.id,
        email: user.email,
        name: metadata.full_name || metadata.name || metadata.given_name || undefined,
        avatarUrl: metadata.avatar_url || metadata.picture || undefined,
      } : null);
      const nextUserId = isGoogleUser && user ? user.id : null;
      if (userIdRef.current !== nextUserId) setProjects([]);
      userIdRef.current = nextUserId;
      setSessionUserId(nextUserId);
      setAuthResolved(true);
    };

    void supabase.auth.getSession().then(({ data }) => syncAuthState(data.session)).catch(() => {
      if (active) setAuthResolved(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const authClient = supabase;
    if (!isSupabaseConfigured || !sessionUserId || !authClient) {
      userIdRef.current = null;
      setRemoteReady(false);
      return;
    }
    let cancelled = false;

    const connect = async () => {
      try {
        const { data, error } = await authClient.auth.getSession();
        if (error) throw error;
        const session = data.session;
        if (!session || session.user.is_anonymous || session.user.app_metadata?.provider !== 'google' || session.user.id !== sessionUserId || cancelled) return;
        const userId = session.user.id;
        userIdRef.current = userId;

        const remote = await loadRemoteData(userId);
        if (cancelled) return;

        const local = {
          deadlines: readStored<ProjectDeadline[]>(STORAGE_KEYS.deadlines, []),
          history: readStored<CalculationHistoryItem[]>(STORAGE_KEYS.history, []),
          favorites: readStored<FavoriteItem[]>(STORAGE_KEYS.favorites, []),
          notes: readStored<NotebookNote[]>(STORAGE_KEYS.notebook, []),
          products: readStored<AutomotiveProductItem[]>(STORAGE_KEYS.products, []),
          checklists: readStored<Record<string, Record<string, boolean>>>(STORAGE_KEYS.nrChecks, {}),
        };

        const mergeById = <T extends { id: string }>(remoteItems: T[], localItems: T[]) => {
          const remoteIds = new Set(remoteItems.map((item) => item.id));
          return [...remoteItems, ...localItems.filter((item) => !remoteIds.has(item.id))];
        };

        const localOnly = {
          deadlines: local.deadlines.filter((item) => !remote.deadlines.some((remoteItem) => remoteItem.id === item.id)),
          history: local.history.filter((item) => !remote.history.some((remoteItem) => remoteItem.id === item.id)),
          favorites: local.favorites.filter((item) => !remote.favorites.some((remoteItem) => remoteItem.id === item.id)),
          notes: local.notes.filter((item) => !remote.notes.some((remoteItem) => remoteItem.id === item.id)),
          products: local.products.filter((item) => !remote.products.some((remoteItem) => remoteItem.id === item.id)),
          checklists: Object.fromEntries(
            Object.entries(local.checklists).filter(([normId]) => !(normId in remote.checklists))
          ) as Record<string, Record<string, boolean>>,
          projects: [],
        };

        const merged = {
          deadlines: mergeById(remote.deadlines, local.deadlines),
          history: mergeById(remote.history, local.history)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100),
          favorites: mergeById(remote.favorites, local.favorites).sort((a, b) => b.addedAt - a.addedAt),
          notes: mergeById(remote.notes, local.notes).sort((a, b) => b.timestamp - a.timestamp),
          products: mergeById(remote.products, local.products),
          checklists: { ...local.checklists, ...remote.checklists },

        };

        setDeadlines(merged.deadlines);
        setHistoryItems(merged.history);
        setFavorites(merged.favorites);
        setNotes(merged.notes);
        setProducts(merged.products);
        setChecklists(merged.checklists);

        writeStored(STORAGE_KEYS.deadlines, merged.deadlines);
        writeStored(STORAGE_KEYS.history, merged.history);
        writeStored(STORAGE_KEYS.favorites, merged.favorites);
        writeStored(STORAGE_KEYS.notebook, merged.notes);
        writeStored(STORAGE_KEYS.products, merged.products);
        writeStored(STORAGE_KEYS.nrChecks, merged.checklists);

        if (remote.settings) {
          setTheme(remote.settings.theme);
          setFontScale(remote.settings.fontScale);
        }

        if (
          localOnly.deadlines.length ||
          localOnly.history.length ||
          localOnly.favorites.length ||
          localOnly.notes.length ||
          localOnly.products.length ||
          Object.keys(localOnly.checklists).length
        ) {
          await pushLocalData(userId, localOnly);
        }

        setSyncState({ status: 'synced', lastSyncedAt: Date.now() });
        setRemoteReady(true);
      } catch (error) {
        setSyncState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Não foi possível conectar agora. Verifique sua conexão e tente novamente.',
        });
        setRemoteReady(true);
      }
    };

    void connect();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      setProjects([]);
      return;
    }

    let cancelled = false;
    const storageKey = `${STORAGE_KEYS.projects}:${sessionUserId}`;
    const loadUserProjects = async () => {
      try {
        const [remoteProjects, localProjects] = await Promise.all([
          loadRemoteProjects(sessionUserId),
          Promise.resolve(readStored<FloorPlanProject[]>(storageKey, [])),
        ]);
        const remoteIds = new Set(remoteProjects.map((project) => project.id));
        const localOnly = localProjects.filter((project) => !remoteIds.has(project.id));
        const merged = [...remoteProjects, ...localOnly];
        if (cancelled) return;
        setProjects(merged);
        writeStored(storageKey, merged);
        await Promise.all(localOnly.map((project) => saveRemoteProject(sessionUserId, project)));
      } catch (error) {
        if (!cancelled) reportSyncError(error);
      }
    };
    void loadUserProjects();
    return () => { cancelled = true; };
  }, [sessionUserId]);

  useEffect(() => {
    if (!remoteReady || !userIdRef.current) return;
    void saveRemoteSettings(userIdRef.current, {
      theme,
      fontScale,
      notificationsEnabled:
        typeof Notification !== 'undefined' && Notification.permission === 'granted',
    }).catch((error) => {
      setSyncState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha ao salvar preferências.',
      });
    });
  }, [theme, fontScale, remoteReady]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_SUBSCRIPTION_CHANGED' || !userIdRef.current) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await savePushSubscription(
            userIdRef.current,
            subscription.toJSON(),
            navigator.userAgent
          );
        }
      } catch (error) {
        reportSyncError(error);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const markSynced = () => setSyncState({ status: 'synced', lastSyncedAt: Date.now() });
  const reportSyncError = (error: unknown) =>
    setSyncState({
      status: 'error',
      message: error instanceof Error ? error.message : 'Falha de sincronização.',
    });

  const handleUpdateDeadlines = (updated: ProjectDeadline[]) => {
    const removed = deadlines.filter((item) => !updated.some((next) => next.id === item.id));
    setDeadlines(updated);
    writeStored(STORAGE_KEYS.deadlines, updated);
    const userId = userIdRef.current;
    if (!userId) return;
    void Promise.all([
      ...updated.map((item) => saveRemoteDeadline(userId, item)),
      ...removed.map((item) => deleteRemoteDeadline(userId, item.id)),
    ])
      .then(markSynced)
      .catch(reportSyncError);
  };

  const handleSaveCalculation = (item: CalculationHistoryItem) => {
    const updated = [item, ...historyItems.filter((entry) => entry.id !== item.id)].slice(0, 100);
    setHistoryItems(updated);
    writeStored(STORAGE_KEYS.history, updated);
    if (userIdRef.current) {
      void saveRemoteHistory(userIdRef.current, item).then(markSynced).catch(reportSyncError);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);
    writeStored(STORAGE_KEYS.history, updated);
    if (userIdRef.current) {
      void deleteRemoteHistory(userIdRef.current, id).then(markSynced).catch(reportSyncError);
    }
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    writeStored(STORAGE_KEYS.history, []);
    if (userIdRef.current) {
      void clearRemoteHistory(userIdRef.current).then(markSynced).catch(reportSyncError);
    }
  };

  const handleAddFavorite = (item: FavoriteItem) => {
    const exists = favorites.find((favorite) => favorite.id === item.id);
    const updated = exists
      ? favorites.filter((favorite) => favorite.id !== item.id)
      : [item, ...favorites];
    setFavorites(updated);
    writeStored(STORAGE_KEYS.favorites, updated);
    if (userIdRef.current) {
      void (exists
        ? deleteRemoteFavorite(userIdRef.current, item)
        : saveRemoteFavorite(userIdRef.current, item)
      )
        .then(markSynced)
        .catch(reportSyncError);
    }
  };

  const isFavorite = (id: string) => favorites.some((favorite) => favorite.id === id);

  const handleRemoveFavorite = (id: string) => {
    const item = favorites.find((favorite) => favorite.id === id);
    const updated = favorites.filter((favorite) => favorite.id !== id);
    setFavorites(updated);
    writeStored(STORAGE_KEYS.favorites, updated);
    if (userIdRef.current && item) {
      void deleteRemoteFavorite(userIdRef.current, item).then(markSynced).catch(reportSyncError);
    }
  };

  const handleSaveNote = (note: NotebookNote) => {
    const updated = [note, ...notes.filter((entry) => entry.id !== note.id)];
    setNotes(updated);
    writeStored(STORAGE_KEYS.notebook, updated);
    if (userIdRef.current) {
      void saveRemoteNote(userIdRef.current, note).then(markSynced).catch(reportSyncError);
    }
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((note) => note.id !== id);
    setNotes(updated);
    writeStored(STORAGE_KEYS.notebook, updated);
    if (userIdRef.current) {
      void deleteRemoteNote(userIdRef.current, id).then(markSynced).catch(reportSyncError);
    }
  };

  const handleSaveProduct = (product: AutomotiveProductItem) => {
    const updated = [product, ...products.filter((entry) => entry.id !== product.id)];
    setProducts(updated);
    writeStored(STORAGE_KEYS.products, updated);
    if (userIdRef.current) {
      void saveRemoteProduct(userIdRef.current, product).then(markSynced).catch(reportSyncError);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter((product) => product.id !== id);
    setProducts(updated);
    writeStored(STORAGE_KEYS.products, updated);
    if (userIdRef.current) {
      void deleteRemoteProduct(userIdRef.current, id).then(markSynced).catch(reportSyncError);
    }
  };

  const handleToggleCheck = (normId: string, checkId: string) => {
    const current = checklists[normId] || {};
    const updated = {
      ...checklists,
      [normId]: { ...current, [checkId]: !current[checkId] },
    };
    setChecklists(updated);
    writeStored(STORAGE_KEYS.nrChecks, updated);
    if (userIdRef.current) {
      void saveRemoteChecklist(userIdRef.current, normId, updated[normId])
        .then(markSynced)
        .catch(reportSyncError);
    }
  };

  const handleSaveProject = (project: FloorPlanProject) => {
    const exists = projects.some((item) => item.id === project.id);
    const updated = exists
      ? projects.map((item) => (item.id === project.id ? project : item))
      : [project, ...projects];
    setProjects(updated);
    if (userIdRef.current) writeStored(`${STORAGE_KEYS.projects}:${userIdRef.current}`, updated);
    if (userIdRef.current) {
      void saveRemoteProject(userIdRef.current, project).then(markSynced).catch(reportSyncError);
    }
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter((project) => project.id !== id);
    setProjects(updated);
    if (userIdRef.current) writeStored(`${STORAGE_KEYS.projects}:${userIdRef.current}`, updated);
    if (userIdRef.current) {
      void deleteRemoteProject(userIdRef.current, id).then(markSynced).catch(reportSyncError);
    }
  };

  const handleNavigateModule = (moduleId: ModuleId, subItem?: string) => {
    router.push(pathForModule(moduleId, subItem));
    if (moduleId === 'contratos') {
      setActiveModuleView('contratos');
      setCurrentTab('inicio');
    } else if (moduleId === 'calculadoras') {
      setActiveModuleView('calculadoras');
      setCurrentTab('inicio');
    } else if (moduleId === 'projetos') {
      setActiveModuleView('projetos');
      setCurrentTab('inicio');
    } else if (moduleId === 'ia') {
      setActiveModuleView('ia');
      setCurrentTab('inicio');
      setAiInitialTab(subItem === 'ventilacao' || subItem === 'patologias' ? subItem : 'solar');
    } else if (moduleId === 'manuais') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('nrs');
      setLibrarySubItemId(subItem);
    } else if (moduleId === 'estetica') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('estetica');
      setLibrarySubItemId(subItem);
    } else if (moduleId === 'legislacao') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('legislacao');
      setLibrarySubItemId(subItem);
    }
  };

  const handleSelectSearchResult = (category: string, itemId: string) => {
    if (category === 'calculadoras') {
      handleNavigateModule('calculadoras');
    } else if (category === 'nrs' || category === 'manuais') {
      router.push(pathForLibrarySection('nrs', itemId));
    } else if (category === 'abnt') {
      router.push(pathForLibrarySection('abnt', itemId));
    } else if (category === 'legislacao') {
      router.push(pathForLibrarySection('legislacao', itemId));
    } else if (category.startsWith('estetica')) {
      router.push(pathForLibrarySection('estetica', itemId));
    }
  };

  const handleTabChange = (tab: MainTab) => {
    router.push(pathForTab(tab));
    setCurrentTab(tab);
    setActiveModuleView(null);
    setLibrarySubItemId(undefined);
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      window.alert('O login ainda precisa das variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na implantação.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      window.alert(`Não foi possível iniciar o login com Google: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert(`Não foi possível sair da conta: ${error.message}`);
      return;
    }
    userIdRef.current = null;
    setRemoteReady(false);
    setSessionUserId(null);
  };

  const latest = historyItems[0] ?? null;
  const isHomeView = currentTab === 'inicio' && activeModuleView === null;
  const isNonHomeView = !isHomeView;

  if (!authResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EC] dark:bg-[#101827] text-sm text-slate-500" role="status">
        Verificando sua sessão...
      </div>
    );
  }

  if (!authenticatedUser) {
    return (
      <LiquidGlassScene className="min-h-screen flex flex-col selection:bg-[#1F66D6] selection:text-white">
        <main className="relative flex-1 flex items-center justify-center overflow-hidden px-5 py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#5B9BFF]/15 blur-3xl" />
            <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-[#3DD68C]/10 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(100,116,139,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,.6) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
          </div>
          <section className="relative z-10 w-full max-w-md text-center">
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#5B9BFF]/30 bg-[#1F66D6]/10 shadow-sm">
              <span className="text-2xl font-black tracking-tighter text-[#5B9BFF]">OE</span>
            </div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#5B9BFF]">OBra ENGEP</p>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-[#17243A] dark:text-white sm:text-4xl">
              Conhecimento técnico para decisões melhores na obra.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-[#9FB0C8]">
              Reúna cálculos, normas, projetos e ferramentas técnicas em um só ambiente de trabalho.
            </p>
            <div className="mt-8 rounded-[28px] border border-[#6B7F9E]/20 bg-white/75 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#17243A]/80 dark:shadow-black/20">
              <div className="mb-5 space-y-1">
                <h2 className="text-lg font-bold text-[#17243A] dark:text-white">Acesse sua área de trabalho</h2>
                <p className="text-xs leading-5 text-slate-500 dark:text-[#9FB0C8]">Entre com sua conta Google para continuar.</p>
              </div>
              <button type="button" onClick={() => void handleGoogleSignIn()} disabled={!isSupabaseConfigured}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#5B9BFF]/60 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white dark:text-slate-800 dark:hover:bg-slate-100">
                <span aria-hidden="true" className="text-lg font-black text-[#4285F4]">G</span>
                Entrar com Google
              </button>
              {!isSupabaseConfigured && <p className="mt-3 text-xs text-red-600">Autenticação indisponível: configure as variáveis públicas do Supabase.</p>}
              <p className="mt-4 text-[11px] leading-5 text-slate-500 dark:text-[#8292AA]">O acesso à plataforma exige autenticação. Não há modo visitante.</p>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500 dark:text-[#8292AA]">
              <span>Calculadoras técnicas</span><span>Normas e manuais</span><span>Projetos e plantas</span>
            </div>
          </section>
        </main>
        <footer className="relative z-10 px-5 pb-6 text-center text-[10px] text-slate-400 dark:text-slate-600">OBra ENGEP · Ambiente técnico integrado</footer>
      </LiquidGlassScene>
    );
  }

  return (
    <LiquidGlassScene className={`min-h-screen flex flex-col transition-colors selection:bg-[#1F66D6] selection:text-white ${activeModuleView === 'projetos' ? 'h-dvh overflow-hidden' : ''}`}>
      {activeModuleView !== 'projetos' && <TopHeader
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        agentState={isVoiceModalOpen ? agentState : 'sleeping'}
        isAgentGuiding={isAgentGuiding}
        onBackToHome={isNonHomeView ? () => handleTabChange('inicio') : undefined}
      />}

      {isHomeView && (
      <section
        aria-label="Navegação e ações rápidas"
        className={`max-w-4xl w-full mx-auto px-4 pt-3 pb-1`}
      >
        <LiquidGlassSurface className="liquid-glass-nav w-full border p-2" radius={20} glassColor="rgba(255,255,255,0.055)" borderColor="rgba(255,255,255,0.22)" style={{ width: "100%" }}>
          <nav aria-label="Abas principais" className="grid grid-cols-4 gap-1">
            {([
              { id: 'inicio' as MainTab, label: 'Início', Icon: Home },
              { id: 'biblioteca' as MainTab, label: 'Biblioteca', Icon: BookOpen },
              { id: 'favoritos' as MainTab, label: 'Favoritos', Icon: Star },
              { id: 'mais' as MainTab, label: 'Mais', Icon: MoreHorizontal },
            ]).map(({ id, label, Icon }) => {
              const active = currentTab === id && !activeModuleView;
              return (
                <button key={id} type="button" onClick={() => handleTabChange(id)}
                  aria-current={active ? 'page' : undefined}
                  className="liquid-glass-action min-h-10 rounded-xl px-2 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                  {id === 'favoritos' && favorites.length > 0 && <span className="text-[10px] rounded-full px-1.5 bg-[#F5B93A] text-[#101827]">{favorites.length > 9 ? '9+' : favorites.length}</span>}
                </button>
              );
            })}
          </nav>
          <div className="mt-2 pt-2 border-t border-[#6B7F9E]/20 flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar" title="Buscar"
                className="liquid-glass-action h-9 w-9 rounded-xl flex items-center justify-center text-[#5B9BFF]"><Search className="w-4 h-4" /></button>
              <button type="button" onClick={() => setIsCalendarModalOpen(true)} aria-label="Cronograma e prazos" title="Cronograma e prazos"
                className="liquid-glass-action relative h-9 w-9 rounded-xl flex items-center justify-center text-[#F5B93A]"><CalendarDays className="w-4 h-4" />
                {deadlines.some((deadline) => deadline.status !== 'concluido') && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B6B]" />}
              </button>
              <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                aria-label={`Alternar tema: ${theme}`} title={`Tema: ${theme}`}
                className="liquid-glass-action h-9 w-9 rounded-xl flex items-center justify-center text-[#9FB0C8]">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
              </button>
            </div>
            {authenticatedUser ? (
              <button type="button" onClick={handleSignOut} title={authenticatedUser.name || authenticatedUser.email || 'Conta Google'} aria-label="Conta Google — sair"
                className="liquid-glass-action min-h-9 rounded-xl px-2 flex items-center gap-2 border">
                {authenticatedUser.avatarUrl ? <img src={authenticatedUser.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" /> : <UserRound className="w-4 h-4" />}
                <span className="text-xs font-semibold">Conta</span>
              </button>
            ) : (
              <button type="button" onClick={handleGoogleSignIn}
                className="liquid-glass-action min-h-9 rounded-xl px-3 flex items-center gap-2 border text-xs font-semibold">
                <LogIn className="w-4 h-4" /><span>Entrar com Google</span>
              </button>
            )}
          </div>
        </LiquidGlassSurface>
      </section>
      )}
      <main className={activeModuleView === 'projetos' ? 'flex-1 min-h-0 w-full max-w-none p-0 m-0' : 'flex-1 max-w-4xl w-full mx-auto px-4 pt-2'}>
        {activeModuleView === 'contratos' ? (
          <ContractsView userId={authenticatedUser?.id ?? null} onBack={() => handleTabChange('inicio')} />
        ) : activeModuleView === 'calculadoras' ? (
          <CalculatorsView onSaveToHistory={handleSaveCalculation} initialCategory="eletrica" onToggleFavorite={handleAddFavorite} isFavorite={isFavorite} />
        ) : activeModuleView === 'projetos' ? (
          <FloorPlanEditorView
            key={sessionUserId ?? 'anonymous'}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            deadlines={deadlines}
            projects={projects}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
          />
        ) : activeModuleView === 'ia' ? (
          <AIStudiesView key={aiInitialTab} initialTab={aiInitialTab} />
        ) : currentTab === 'inicio' ? (
          <HomeView
            authenticatedName={authenticatedUser?.name}
            onNavigateModule={handleNavigateModule}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onOpenCalculatorWithData={() => handleNavigateModule('calculadoras')}
            latestCalculation={latest}
            favoritesCount={favorites.length}
            deadlines={deadlines}
          />
        ) : currentTab === 'biblioteca' ? (
          <LibraryView
            initialTab={librarySubTab}
            initialItemId={librarySubItemId}
            onSectionChange={(section) => router.push(pathForLibrarySection(section))}
            onItemChange={(section, itemId) => router.push(pathForLibrarySection(section, itemId))}
            onAddFavorite={handleAddFavorite}
            isFavorite={isFavorite}
            products={products}
            checklists={checklists}
            onToggleCheck={handleToggleCheck}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveNote={handleSaveNote}
          />
        ) : currentTab === 'favoritos' ? (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onNavigateToItem={(module, id) => handleNavigateModule(module, id)}
          />
        ) : (
          <MoreView
            userId={sessionUserId}
            historyItems={historyItems}
            deadlines={deadlines}
            notes={notes}
            onAddNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onReopenCalculation={() => handleNavigateModule('calculadoras')}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            syncState={syncState}
          />
        )}
      </main>

      <OfflineIndicator />



      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
        products={products}
      />

      <DeadlinesCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        deadlines={deadlines}
        onUpdateDeadlines={handleUpdateDeadlines}
      />

      <VoiceAgentOrbModal
        isOpen={isVoiceModalOpen}
        onClose={() => {
          setIsVoiceModalOpen(false);
          setIsAgentGuiding(false);
          setAgentState('sleeping');
        }}
        onStatusChange={setAgentState}
        onGuidingChange={setIsAgentGuiding}
        onNavigateToSection={handleTabChange}
        onNavigateToModule={handleNavigateModule}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </LiquidGlassScene>
  );
}

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1 mb-3"
  >
    ← Voltar para Início
  </button>
);
