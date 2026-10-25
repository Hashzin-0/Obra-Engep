/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopHeaderProps {
  onOpenVoiceAssistant?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenVoiceAssistant }) => (
  <header className="sticky top-0 z-30 px-4 py-2.5 border-b border-[#2A3A55] bg-[#101827]/95 text-[#E8EDF5] backdrop-blur-md">
    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101827] to-[#17243A] flex items-center justify-center border border-[#2A3A55] shrink-0 shadow-sm p-1">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" aria-hidden="true">
            <path d="M 6 22 L 20 8 L 34 22" stroke="#1F66D6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M 12 25 L 20 17 L 28 25" stroke="#F5B93A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="25" y="10" width="3" height="6" fill="#1F66D6" rx="1"/>
          </svg>
        </div>
        <h1 className="font-bold text-base leading-tight truncate tracking-tight text-white">OBra ENGEP</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onOpenVoiceAssistant && (
          <button onClick={onOpenVoiceAssistant} aria-label="Abrir assistente de voz" title="Assistente de voz"
            className="relative group p-1.5 rounded-xl border border-[#1F66D6]/40 bg-gradient-to-r from-[#17243A] to-[#101827] hover:border-[#5B9BFF] transition min-h-[44px] min-w-[44px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1F66D6]/30 via-[#A855F7]/30 to-[#06B6D4]/30 animate-pulse rounded-xl" />
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#1F66D6] via-[#A855F7] to-[#06B6D4] shadow-md shadow-[#1F66D6]/50 group-hover:scale-110 transition-transform">
              <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
          </button>
        )}
        <PWAInstallButton compact />
      </div>
    </div>
  </header>
);
