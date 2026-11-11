/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeftIcon as ArrowLeft } from '@animateicons/react/lucide';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { RobotHeadAvatar, type RobotAgentState } from './RobotHeadAvatar';
import { PWAInstallButton } from './PWAInstallButton';
import { LiquidGlassSurface } from './LiquidGlassSurface';

interface TopHeaderProps {
  onOpenVoiceAssistant?: () => void;
  onBackToHome?: () => void;
  agentState?: RobotAgentState;
  isAgentGuiding?: boolean;
  voiceAssistantOpen?: boolean;
  isVoiceMode?: boolean;
  isMicrophoneMuted?: boolean;
  onStartVoiceMode?: () => void;
  onToggleMicrophoneMute?: () => void;
  onExitVoiceMode?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenVoiceAssistant, onBackToHome, agentState = 'sleeping', isAgentGuiding = false, voiceAssistantOpen = false, isVoiceMode = false, isMicrophoneMuted = false, onStartVoiceMode, onToggleMicrophoneMute, onExitVoiceMode }) => (
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
        <div className="flex items-center justify-center gap-1">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              aria-label="Abrir assistente de texto"
              data-robot-agent-trigger="header"
              title="Assistente OBra ENGEP"
              className="liquid-glass-action relative group p-1 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <RobotHeadAvatar state={agentState} size={42} label={isAgentGuiding ? 'Assistente orientando a interface' : 'Assistente OBra ENGEP'} />
            </button>
          )}
          {voiceAssistantOpen && !isVoiceMode && onStartVoiceMode && (
            <button type="button" onClick={onStartVoiceMode} aria-label="Iniciar conversa por voz" title="Iniciar conversa por voz" className="liquid-glass-action h-9 w-9 rounded-xl flex items-center justify-center text-[#5B9BFF] border border-[#5B9BFF]/30">
              <Mic className="h-4 w-4" />
            </button>
          )}
          {voiceAssistantOpen && isVoiceMode && (
            <>
              <button type="button" onClick={onToggleMicrophoneMute} aria-label={isMicrophoneMuted ? 'Reativar microfone' : 'Silenciar microfone'} title={isMicrophoneMuted ? 'Reativar microfone' : 'Silenciar microfone'} className={`liquid-glass-action h-9 w-9 rounded-xl flex items-center justify-center border ${isMicrophoneMuted ? 'border-red-400/50 text-red-500 bg-red-500/10' : 'border-[#5B9BFF]/30 text-[#5B9BFF]'}`}>
                {isMicrophoneMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button type="button" onClick={onExitVoiceMode} aria-label="Voltar ao chat de texto" title="Voltar ao chat de texto" className="liquid-glass-action h-9 w-9 rounded-xl flex items-center justify-center text-[#5B9BFF] border border-[#5B9BFF]/30">
                <MessageSquare className="h-4 w-4" />
              </button>
            </>
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
                <ArrowLeft size={16} className="w-4 h-4 shrink-0" />
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
