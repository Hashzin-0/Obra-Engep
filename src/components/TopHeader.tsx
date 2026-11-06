/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Mic } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopHeaderProps {
  onOpenVoiceAssistant?: () => void;
  onBackToHome?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenVoiceAssistant, onBackToHome }) => (
  <header className="liquid-glass-bar sticky top-0 z-30 px-4 py-2.5 border-b text-[var(--ink)]">
    <div className="max-w-4xl mx-auto grid grid-cols-3 items-center gap-3">
      <div className="flex items-center justify-start gap-2 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--surface)] flex items-center justify-center border border-[var(--line)] shrink-0 shadow-sm p-1">
          <img src="/icon.svg" alt="" aria-hidden="true" className="w-full h-full object-contain" />
        </div>
        <h1 className="font-bold text-base leading-tight truncate tracking-tight">OBra ENGEP</h1>
      </div>
      <div className="flex items-center justify-center">
        {onOpenVoiceAssistant && (
          <button onClick={onOpenVoiceAssistant} aria-label="Abrir assistente de voz" title="Assistente de voz"
            className="relative group p-1.5 rounded-xl border border-[var(--brand-blue-strong)] bg-[var(--surface-raised)] hover:border-[var(--brand-sage-strong)] transition min-h-[44px] min-w-[44px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[var(--brand-sage)]/25 rounded-xl" />
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[var(--brand-blue)] shadow-md group-hover:scale-110 transition-transform">
              <Mic className="w-3.5 h-3.5 text-[#293b41]" />
            </div>
          </button>
        )}
      </div>
      <div className="flex items-center justify-end min-w-0">
        <div className="min-w-0 [&_button]:max-w-full [&_button]:justify-center [&_button]:gap-1 [&_button]:px-2 [&_button]:text-[11px] sm:[&_button]:px-3 sm:[&_button]:text-xs">
          {onBackToHome ? (
            <button
              type="button"
              onClick={onBackToHome}
              className="min-h-10 inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-2.5 text-xs font-semibold hover:bg-[var(--surface-inset)] transition"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Voltar ao início</span>
            </button>
          ) : (
            <PWAInstallButton compact />
          )}
        </div>
      </div>
    </div>
  </header>
);
