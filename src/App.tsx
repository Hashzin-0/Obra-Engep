/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
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
import { INITIAL_DEADLINES } from './data/initialData';
import { checkUpcomingDeadlines, sendAndroidPushNotification } from './utils/notifications';

import { MainTab, ModuleId, CalculationHistoryItem, FavoriteItem, ProjectDeadline } from './types';

// Default initial calculation matching page 5 & 11 test case: 3500 / (220 * 0.92) = 17.29 A
const DEFAULT_LATEST_CALC: CalculationHistoryItem = {
  id: 'calc-init-1',
  title: 'Corrente',
  category: 'eletrica',
  timestamp: Date.now(),
  dateStr: '25/10/2026',
  resultValue: 17.29,
  resultUnit: 'A',
  formula: 'I = P / (V × FP)',
  premises: 'Monofásico: P=3500 W, V=220 V, FP=0.92',
  inputs: { Potência: '3500 W', Tensão: '220 V', FP: 0.92 },
  limitWarning: 'Dimensionamento de condutores exige validação profissional conforme NBR 5410.',
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('inicio');
  const [activeModuleView, setActiveModuleView] = useState<ModuleId | null>(null);
  const [librarySubTab, setLibrarySubTab] = useState<any>('nrs');
  const [librarySubItemId, setLibrarySubItemId] = useState<string | undefined>(undefined);

  // Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState<'solar' | 'ventilacao' | 'patologias'>('solar');

  // Calendar & Deadlines Modal
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Project Deadlines & Milestones
  const [deadlines, setDeadlines] = useState<ProjectDeadline[]>(() => {
    const saved = localStorage.getItem('obra_engep_deadlines');
    return saved ? JSON.parse(saved) : INITIAL_DEADLINES;
  });

  const handleUpdateDeadlines = (updated: ProjectDeadline[]) => {
    setDeadlines(updated);
    localStorage.setItem('obra_engep_deadlines', JSON.stringify(updated));
  };

  // Background Android push notification checker for upcoming tasks
  useEffect(() => {
    const checkTimer = () => {
      checkUpcomingDeadlines(deadlines, (dueItem) => {
        sendAndroidPushNotification(
          `⚠️ Lembrete de Prazo: ${dueItem.title}`,
          `Projeto: ${dueItem.projectName || 'Geral'} · Vencimento: ${dueItem.dueDate} às ${dueItem.dueTime || '09:00'}`
        );
        // Mark notified
        const updated = deadlines.map((d) => (d.id === dueItem.id ? { ...d, notified: true } : d));
        setDeadlines(updated);
        localStorage.setItem('obra_engep_deadlines', JSON.stringify(updated));
      });
    };

    checkTimer();
    const interval = setInterval(checkTimer, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [deadlines]);

  // Onboarding
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return localStorage.getItem('obra_engep_onboarded') !== 'true';
  });

  // History & Favorites
  const [historyItems, setHistoryItems] = useState<CalculationHistoryItem[]>(() => {
    const saved = localStorage.getItem('obra_engep_history');
    return saved ? JSON.parse(saved) : [DEFAULT_LATEST_CALC];
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    const saved = localStorage.getItem('obra_engep_favorites');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'fav-nr35',
            type: 'norma',
            title: 'NR 35 · Trabalho em altura',
            subtitle: 'Requisitos de ancoragem, AR e plano de resgate',
            moduleId: 'manuais',
            addedAt: Date.now(),
          },
          {
            id: 'fav-calc-eletrica',
            type: 'calculadora',
            title: 'Calculadora Elétrica Monofásica',
            subtitle: 'I = P / (V × FP)',
            moduleId: 'calculadoras',
            addedAt: Date.now(),
          },
        ];
  });

  const handleSaveCalculation = (item: CalculationHistoryItem) => {
    const updated = [item, ...historyItems.filter((h) => h.id !== item.id)].slice(0, 50);
    setHistoryItems(updated);
    localStorage.setItem('obra_engep_history', JSON.stringify(updated));
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = historyItems.filter((h) => h.id !== id);
    setHistoryItems(updated);
    localStorage.setItem('obra_engep_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem('obra_engep_history');
  };

  const handleAddFavorite = (item: FavoriteItem) => {
    if (favorites.some((f) => f.id === item.id)) {
      // Toggle off
      const updated = favorites.filter((f) => f.id !== item.id);
      setFavorites(updated);
      localStorage.setItem('obra_engep_favorites', JSON.stringify(updated));
    } else {
      const updated = [item, ...favorites];
      setFavorites(updated);
      localStorage.setItem('obra_engep_favorites', JSON.stringify(updated));
    }
  };

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  const handleRemoveFavorite = (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    localStorage.setItem('obra_engep_favorites', JSON.stringify(updated));
  };

  // Navigation router
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

  const latest = historyItems[0] || DEFAULT_LATEST_CALC;

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col transition-colors selection:bg-[#1F66D6] selection:text-white">
        {/* Top Header */}
        <TopHeader
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
          pendingDeadlinesCount={deadlines.filter((d) => d.status !== 'concluido').length}
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
            activeModuleView
              ? 'Toque na barra inferior para voltar'
              : 'Seu manual técnico inteligente'
          }
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-3">
          {/* Subview or Tab Rendering */}
          {activeModuleView === 'calculadoras' ? (
            <div>
              <button
                onClick={() => setActiveModuleView(null)}
                className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1 mb-3"
              >
                ← Voltar para Início
              </button>
              <CalculatorsView
                onSaveToHistory={handleSaveCalculation}
                initialCategory="eletrica"
              />
            </div>
          ) : activeModuleView === 'projetos' ? (
            <div>
              <button
                onClick={() => setActiveModuleView(null)}
                className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1 mb-3"
              >
                ← Voltar para Início
              </button>
              <FloorPlanEditorView
                onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
                deadlines={deadlines}
              />
            </div>
          ) : activeModuleView === 'ia' ? (
            <div>
              <button
                onClick={() => setActiveModuleView(null)}
                className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1 mb-3"
              >
                ← Voltar para Início
              </button>
              <AIStudiesView key={aiInitialTab} initialTab={aiInitialTab} />
            </div>
          ) : currentTab === 'inicio' ? (
            <HomeView
              onNavigateModule={handleNavigateModule}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
              onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
              onOpenCalculatorWithData={(calc) => {
                setActiveModuleView('calculadoras');
              }}
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
            />
          ) : currentTab === 'favoritos' ? (
            <FavoritesView
              favorites={favorites}
              onRemoveFavorite={handleRemoveFavorite}
              onNavigateToItem={(mod, id) => handleNavigateModule(mod, id)}
            />
          ) : (
            <MoreView
              historyItems={historyItems}
              deadlines={deadlines}
              onClearHistory={handleClearHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onReopenCalculation={(calc) => {
                setActiveModuleView('calculadoras');
                setCurrentTab('inicio');
              }}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            />
          )}
        </main>

        {/* Global Floating Elements */}
        <OfflineIndicator />

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onChangeTab={handleTabChange}
          favoritesCount={favorites.length}
        />

        {/* Global Search Modal (Screen 04) */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectResult={handleSelectSearchResult}
        />

        {/* Deadlines & Calendar Sync Modal */}
        <DeadlinesCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          deadlines={deadlines}
          onUpdateDeadlines={handleUpdateDeadlines}
        />

        {/* Voice Agent Orb Modal (Serverless Speech-to-Speech) */}
        <VoiceAgentOrbModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
        />

        {/* Onboarding Modal (Screen 02) */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={() => setIsOnboardingOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
}
