/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Moon, Sun, Laptop, Mic } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';

interface TopHeaderProps {
  onOpenSearch: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenCalendarModal?: () => void;
  pendingDeadlinesCount?: number;
  title?: string;
  subtitle?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenSearch,
  onOpenVoiceAssistant,
  onOpenCalendarModal,
  pendingDeadlinesCount = 0,
  title,
  subtitle,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <header
      className={`sticky top-0 z-30 px-4 py-2.5 border-b backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-[#101827]/90 border-[#2A3A55] text-[#E8EDF5]'
          : 'bg-[#FFFFFF]/90 border-[#D9E0EC] text-[#101827]'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Title (Matching Images: House roof mark + OBra ENGEP) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101827] to-[#17243A] flex items-center justify-center border border-[#2A3A55] shrink-0 shadow-sm relative p-1">
            <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
              {/* Blue outer roof */}
              <path d="M 6 22 L 20 8 L 34 22" stroke="#1F66D6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Orange inner roof/accent */}
              <path d="M 12 25 L 20 17 L 28 25" stroke="#F5B93A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Small chimney / crossbeam */}
              <rect x="25" y="10" width="3" height="6" fill="#1F66D6" rx="1"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base leading-tight truncate tracking-tight text-white dark:text-white">
                {title || 'OBra ENGEP'}
              </h1>
              <span className="hidden sm:inline-block text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#1F66D6]/20 text-[#5B9BFF]">
                PRO
              </span>
            </div>
            <p className="text-[11px] truncate text-[#9FB0C8] dark:text-[#9FB0C8]">
              {subtitle || 'Engenharia · Construção · Segurança'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Calendar & Deadlines Sync Trigger */}
          {onOpenCalendarModal && (
            <button
              onClick={onOpenCalendarModal}
              aria-label="Abrir prazos e sincronizar calendário"
              title="Cronograma, prazos e sincronização de calendário"
              className="p-2 rounded-xl text-[#F5B93A] hover:bg-[#F5B93A]/15 transition border border-transparent hover:border-[#F5B93A]/30 min-h-[44px] min-w-[44px] flex items-center justify-center relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {pendingDeadlinesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B6B] animate-ping" />
              )}
            </button>
          )}

          {/* Voice Assistant Glowing Orb Trigger */}
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              aria-label="Ativar Agente de Voz Speech to Speech"
              title="Agente de Voz Real-Time · Gemini 3.8 Extended Thinking (Speech-to-Speech Serverless)"
              className="relative group p-1.5 rounded-xl border border-[#1F66D6]/40 bg-gradient-to-r from-[#17243A] to-[#101827] hover:border-[#5B9BFF] transition min-h-[44px] min-w-[44px] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
            >
              {/* Animated orb glowing ring background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1F66D6]/30 via-[#A855F7]/30 to-[#06B6D4]/30 animate-pulse rounded-xl" />
              <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#1F66D6] via-[#A855F7] to-[#06B6D4] shadow-md shadow-[#1F66D6]/50 group-hover:scale-110 transition-transform">
                <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
            </button>
          )}

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            aria-label="Buscar ferramentas, normas e produtos"
            className="p-2 rounded-xl text-[#9FB0C8] hover:text-white hover:bg-white/5 dark:hover:bg-white/5 transition border border-transparent hover:border-[#6B7F9E]/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            aria-label={`Alternar tema atual: ${theme}`}
            title={`Tema: ${theme}`}
            className="p-2 rounded-xl text-[#9FB0C8] hover:text-white hover:bg-white/5 dark:hover:bg-white/5 transition border border-transparent hover:border-[#6B7F9E]/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#5B9BFF]" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-[#F5B93A]" />
            ) : (
              <Laptop className="w-4 h-4 text-[#3DD68C]" />
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton compact />
        </div>
      </div>
    </header>
  );
};
