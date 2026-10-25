/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingModal } from './components/OnboardingModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

import { HomeView } from './views/HomeView';
import { CalculatorsView } from './views/CalculatorsView';
import { LibraryView } from './views/LibraryView';
import { FloorPlanEditorView } from './views/FloorPlanEditorView';
import { AIStudiesView } from './views/AIStudiesView';
import { FavoritesView } from './views/FavoritesView';
import { MoreView } from './views/MoreView';

import { DeadlinesCalendarModal } from './components/DeadlinesCalendarModal';
import { VoiceAgentOrbModal } from './components/VoiceAgentOrbModal';

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
import { ensureAnonymousSession, isSupabaseConfigured, supabase } from './lib/supabase';
import {
  clearHistory as clearRemoteHistory,
  deleteDeadline as deleteRemoteDeadline,
  deleteFavorite as deleteRemoteFavorite,
  deleteHistory as deleteRemoteHistory,
  deleteNote as deleteRemoteNote,
  deleteProduct as deleteRemoteProduct,
  deleteProject as deleteRemoteProject,
  loadRemoteData,
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
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { theme, fontScale, setTheme, setFontScale } = useTheme();
  const [currentTab, setCurrentTab] = useState<MainTab>('inicio');
  const [activeModuleView, setActiveModuleView] = useState<ModuleId | null>(null);
  const [librarySubTab, setLibrarySubTab] = useState<'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais'>('nrs');
  const [librarySubItemId, setLibrarySubItemId] = useState<string | undefined>(undefined);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
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
  const [projects, setProjects] = useState<FloorPlanProject[]>(() =>
    readStored<FloorPlanProject[]>(STORAGE_KEYS.projects, []).map((project) => ({
      ...project,
      id: ensureUuid(project.id),
    }))
  );

  const [syncState, setSyncState] = useState<SyncState>({
    status: isSupabaseConfigured ? 'connecting' : 'disabled',
    message: isSupabaseConfigured ? undefined : 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  });
  const [remoteReady, setRemoteReady] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const [authenticatedUser, setAuthenticatedUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const syncAuthState = (session: Session | null) => {
      if (!active) return;
      const user = session?.user;
      setAuthenticatedUser(user && !user.is_anonymous ? { id: user.id, email: user.email } : null);
      userIdRef.current = user?.id ?? null;
    };

    void supabase.auth.getSession().then(({ data }) => syncAuthState(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const connect = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session || cancelled) return;
        userIdRef.current = session.userId;

        const remote = await loadRemoteData(session.userId);
        if (cancelled) return;

        const local = {
          deadlines: readStored<ProjectDeadline[]>(STORAGE_KEYS.deadlines, []),
          history: readStored<CalculationHistoryItem[]>(STORAGE_KEYS.history, []),
          favorites: readStored<FavoriteItem[]>(STORAGE_KEYS.favorites, []),
          notes: readStored<NotebookNote[]>(STORAGE_KEYS.notebook, []),
          products: readStored<AutomotiveProductItem[]>(STORAGE_KEYS.products, []),
          checklists: readStored<Record<string, Record<string, boolean>>>(STORAGE_KEYS.nrChecks, {}),
          projects: readStored<FloorPlanProject[]>(STORAGE_KEYS.projects, []),
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
          projects: local.projects.filter((item) => !remote.projects.some((remoteItem) => remoteItem.id === item.id)),
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
          projects: mergeById(remote.projects, local.projects),
        };

        setDeadlines(merged.deadlines);
        setHistoryItems(merged.history);
        setFavorites(merged.favorites);
        setNotes(merged.notes);
        setProducts(merged.products);
        setChecklists(merged.checklists);
        setProjects(merged.projects);

        writeStored(STORAGE_KEYS.deadlines, merged.deadlines);
        writeStored(STORAGE_KEYS.history, merged.history);
        writeStored(STORAGE_KEYS.favorites, merged.favorites);
        writeStored(STORAGE_KEYS.notebook, merged.notes);
        writeStored(STORAGE_KEYS.products, merged.products);
        writeStored(STORAGE_KEYS.nrChecks, merged.checklists);
        writeStored(STORAGE_KEYS.projects, merged.projects);

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
          Object.keys(localOnly.checklists).length ||
          localOnly.projects.length
        ) {
          await pushLocalData(session.userId, localOnly);
        }

        setSyncState({ status: 'synced', lastSyncedAt: Date.now() });
        setRemoteReady(true);
      } catch (error) {
        setSyncState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Falha ao conectar ao Supabase.',
        });
        setRemoteReady(true);
      }
    };

    void connect();
    return () => {
      cancelled = true;
    };
  }, []);

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
    writeStored(STORAGE_KEYS.projects, updated);
    writeStored(STORAGE_KEYS.activeProject, project);
    if (userIdRef.current) {
      void saveRemoteProject(userIdRef.current, project).then(markSynced).catch(reportSyncError);
    }
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter((project) => project.id !== id);
    setProjects(updated);
    writeStored(STORAGE_KEYS.projects, updated);
    if (userIdRef.current) {
      void deleteRemoteProject(userIdRef.current, id).then(markSynced).catch(reportSyncError);
    }
  };

  const handleNavigateModule = (moduleId: ModuleId, subItem?: string) => {
    if (moduleId === 'calculadoras') {
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
      if (subItem) setLibrarySubItemId(subItem);
    } else if (moduleId === 'estetica') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('estetica');
      if (subItem) setLibrarySubItemId(subItem);
    } else if (moduleId === 'legislacao') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('legislacao');
      if (subItem) setLibrarySubItemId(subItem);
    }
  };

  const handleSelectSearchResult = (category: string, itemId: string) => {
    if (category === 'calculadoras') {
      setActiveModuleView('calculadoras');
      setCurrentTab('inicio');
    } else if (category === 'nrs') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('nrs');
      setLibrarySubItemId(itemId);
    } else if (category === 'abnt') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('abnt');
    } else if (category === 'legislacao') {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('legislacao');
    } else if (category.startsWith('estetica')) {
      setActiveModuleView(null);
      setCurrentTab('biblioteca');
      setLibrarySubTab('estetica');
      setLibrarySubItemId(itemId);
    }
  };

  const handleTabChange = (tab: MainTab) => {
    setCurrentTab(tab);
    setActiveModuleView(null);
    setLibrarySubItemId(undefined);
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      window.alert('O login ainda precisa das variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na implantação.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
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
    try {
      const anonymousSession = await ensureAnonymousSession();
      userIdRef.current = anonymousSession?.userId ?? null;
    } catch (error) {
      reportSyncError(error);
    }
  };

  const latest = historyItems[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col transition-colors selection:bg-[#1F66D6] selection:text-white">
      <TopHeader
        onGoogleSignIn={authenticatedUser ? undefined : handleGoogleSignIn}
        authenticatedEmail={authenticatedUser ? (authenticatedUser.email || 'Conta conectada') : undefined}
        onSignOut={authenticatedUser ? handleSignOut : undefined}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
        pendingDeadlinesCount={deadlines.filter((deadline) => deadline.status !== 'concluido').length}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        title={
          activeModuleView === 'calculadoras'
            ? 'Calculadoras'
            : activeModuleView === 'projetos'
              ? 'Projetos e Plantas'
              : activeModuleView === 'ia'
                ? 'IA e Estudos'
                : currentTab === 'biblioteca'
                  ? 'Biblioteca Técnica'
                  : currentTab === 'favoritos'
                    ? 'Favoritos'
                    : currentTab === 'mais'
                      ? 'Mais'
                      : 'OBra ENGEP'
        }
        subtitle={
          activeModuleView ? 'Toque na barra inferior para voltar' : 'Seu manual técnico inteligente'
        }
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-3">
        {activeModuleView === 'calculadoras' ? (
          <div>
            <BackButton onClick={() => setActiveModuleView(null)} />
            <CalculatorsView onSaveToHistory={handleSaveCalculation} initialCategory="eletrica" />
          </div>
        ) : activeModuleView === 'projetos' ? (
          <div>
            <BackButton onClick={() => setActiveModuleView(null)} />
            <FloorPlanEditorView
              onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
              deadlines={deadlines}
              projects={projects}
              onSaveProject={handleSaveProject}
              onDeleteProject={handleDeleteProject}
            />
          </div>
        ) : activeModuleView === 'ia' ? (
          <div>
            <BackButton onClick={() => setActiveModuleView(null)} />
            <AIStudiesView key={aiInitialTab} initialTab={aiInitialTab} />
          </div>
        ) : currentTab === 'inicio' ? (
          <HomeView
            onNavigateModule={handleNavigateModule}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onOpenCalculatorWithData={() => setActiveModuleView('calculadoras')}
            latestCalculation={latest}
            favoritesCount={favorites.length}
            deadlines={deadlines}
          />
        ) : currentTab === 'biblioteca' ? (
          <LibraryView
            initialTab={librarySubTab}
            initialItemId={librarySubItemId}
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
            historyItems={historyItems}
            deadlines={deadlines}
            notes={notes}
            onAddNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onReopenCalculation={() => {
              setActiveModuleView('calculadoras');
              setCurrentTab('inicio');
            }}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            syncState={syncState}
          />
        )}
      </main>

      <OfflineIndicator />

      <BottomNav
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        favoritesCount={favorites.length}
      />

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
        onClose={() => setIsVoiceModalOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
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
