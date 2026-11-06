/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { RobotHeadAvatar, type RobotAgentState } from './RobotHeadAvatar';
import { PWAInstallButton } from './PWAInstallButton';
import { LiquidGlassSurface } from './LiquidGlassSurface';

interface TopHeaderProps {
  onOpenVoiceAssistant?: () => void;
  onBackToHome?: () => void;
  agentState?: RobotAgentState;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenVoiceAssistant, onBackToHome, agentState = 'idle' }) => (
  <LiquidGlassSurface
    className="liquid-glass-bar w-full"
    radius={0}
    glassColor="rgba(255,255,255,0.045)"
    borderColor="rgba(255,255,255,0.18)"
    style={{ position: 'sticky', top: 0, zIndex: 30, width: '100%', borderRadius: 0 }}
  >
    <header className="px-4 py-2.5 text-[var(--ink)]">
      <div className="max-w-4xl mx-auto grid grid-cols-3 items-center gap-3">
        <div className="flex items-center justify-start gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface)]/45 flex items-center justify-center border border-[var(--line)]/60 shrink-0 p-1">
            <img src="/icon.svg" alt="" aria-hidden="true" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-bold text-base leading-tight truncate tracking-tight">OBra ENGEP</h1>
        </div>
        <div className="flex items-center justify-center">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              aria-label="Abrir assistente de voz"
              title="Assistente de voz"
              className="liquid-glass-action relative group p-1 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <RobotHeadAvatar state={agentState} size={42} label="Abrir assistente OBra ENGEP" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-end min-w-0">
          <div className="min-w-0 [&_button]:max-w-full [&_button]:justify-center [&_button]:gap-1 [&_button]:px-2 [&_button]:text-[11px] sm:[&_button]:px-3 sm:[&_button]:text-xs">
            {onBackToHome ? (
              <button
                type="button"
                onClick={onBackToHome}
                className="liquid-glass-action min-h-10 inline-flex items-center rounded-xl px-2.5 text-xs font-semibold"
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
  </LiquidGlassSurface>
);
