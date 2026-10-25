/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, BookOpen, Star, MoreHorizontal } from 'lucide-react';
import { MainTab } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  currentTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  favoritesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  favoritesCount = 0,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const navItems: { id: MainTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'inicio', label: 'Início', Icon: Home },
    { id: 'biblioteca', label: 'Biblioteca', Icon: BookOpen },
    { id: 'favoritos', label: 'Favoritos', Icon: Star },
    { id: 'mais', label: 'Mais', Icon: MoreHorizontal },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md transition-colors safe-area-pb ${
        isDark
          ? 'bg-[#101827]/95 border-[#2A3A55] text-[#9FB0C8]'
          : 'bg-[#FFFFFF]/95 border-[#D9E0EC] text-[#5B6B82]'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] relative ${
                isActive
                  ? 'text-[#1F66D6] dark:text-[#5B9BFF] font-semibold'
                  : 'hover:text-[#E8EDF5] dark:hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Aba ${label}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {id === 'favoritos' && favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#1F66D6] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-[#1F66D6] dark:bg-[#5B9BFF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
