/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Voice Agent Orb Modal - Real-Time Speech-to-Speech Serverless Integration
 * Features central interactive glowing orb, audio visualizer, extended thinking, and speech synthesis.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
   Volume2,
  VolumeX,
  X,
   Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { RobotHeadAvatar } from './RobotHeadAvatar';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  thought?: string;
  timestamp: string;
  modelBadge?: string;
}

interface VoiceAgentOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'error') => void;
}

export const VoiceAgentOrbModal: React.FC<VoiceAgentOrbModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isFormGuiding, setIsFormGuiding] = useState(false);
  const [guideFieldIndex, setGuideFieldIndex] = useState(0);
  const [guideTargetRect, setGuideTargetRect] = useState<{ top: number; left: number } | null>(null);
  const guideFieldsRef = useRef<Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>([]);

  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, connectionStatus, isOpen]);

  useEffect(() => {
    const state = isListening ? 'listening' : connectionStatus;
    onStatusChange?.(state);
  }, [connectionStatus, isListening, onStatusChange]);

  useEffect(() => {
    if (isOpen) return;
    try { speechRecognitionRef.current?.stop(); } catch {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false);
    setIsFormGuiding(false);
    setGuideTargetRect(null);
    setConnectionStatus('idle');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Speak response aloud via Web Speech Synthesis (Speech-to-Speech output)
  const speakResponse = (text: string) => {
    if (!audioFeedbackEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '').slice(0, 350);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.onstart = () => setConnectionStatus('speaking');
      utterance.onend = () => setConnectionStatus('idle');
      utterance.onerror = () => setConnectionStatus('idle');
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
      setConnectionStatus('idle');
    }
  };

  // Stream query to serverless backend `/api/gemini/realtime-chat`
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputQuery).trim();
    if (!prompt || isGenerating) return;

    const userMsgId = `u-${Date.now()}`;
    const geminiMsgId = `g-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const initialGeminiMsg: ChatMessage = {
      id: geminiMsgId,
      sender: 'gemini',
      text: '',
      thought: '',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      modelBadge: 'Gemini',
    };

    setMessages((prev) => [...prev, userMsg, initialGeminiMsg]);
    setInputQuery('');
    setIsGenerating(true);
    setConnectionStatus('thinking');
    setExpandedThoughts((prev) => ({ ...prev, [geminiMsgId]: true }));

    try {
      if (!supabase) throw new Error('Serviço de autenticação indisponível.');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Sua sessão expirou. Entre novamente para utilizar a IA.');

      const response = await fetch('/api/gemini/realtime-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedThought = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'thought') {
                accumulatedThought += data.text;
                setConnectionStatus('thinking');
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === geminiMsgId ? { ...m, thought: accumulatedThought } : m
                  )
                );
              } else if (data.type === 'text') {
                accumulatedText += data.text;
                setConnectionStatus('speaking');
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === geminiMsgId ? { ...m, text: accumulatedText } : m
                  )
                );
              } else if (data.type === 'done') {
                setConnectionStatus('idle');
              }
            } catch (e) {}
          }
        }
      }

      if (accumulatedText) {
        speakResponse(accumulatedText);
      }
    } catch (err) {
      console.error('Erro na conversação em tempo real:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === geminiMsgId
            ? {
                ...m,
                text: m.text || 'Erro de conexão com o agente de voz serverless.',
                thought: '',
              }
            : m
        )
      );
      setConnectionStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const getGuideFieldLabel = (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, index: number) => {
    const explicit = field.getAttribute('aria-label') || field.labels?.[0]?.textContent?.trim();
    const wrappingLabel = field.closest('label')?.textContent?.trim();
    return explicit || wrappingLabel || field.getAttribute('placeholder') || field.name || `Campo ${index + 1}`;
  };

  const updateGuideTarget = (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
    field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    field.focus({ preventScroll: true });
    field.classList.add('robot-guide-highlight');
    const rect = field.getBoundingClientRect();
    setGuideTargetRect({
      top: Math.max(12, rect.top - 82),
      left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 104)),
    });
  };

  const speakGuidePrompt = (field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, index: number) => {
    const label = getGuideFieldLabel(field, index);
    const prompt = `Vamos preencher juntos. Qual valor devo colocar em ${label}?`;
    if (!audioFeedbackEnabled || !('speechSynthesis' in window)) {
      setConnectionStatus('listening');
      startVoiceCapture();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.98;
    utterance.onstart = () => setConnectionStatus('speaking');
    utterance.onend = () => {
      if (!isFormGuiding) return;
      setConnectionStatus('listening');
      startVoiceCapture();
    };
    utterance.onerror = () => {
      setConnectionStatus('listening');
      startVoiceCapture();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startFormGuide = () => {
    const fields = Array.from(document.querySelectorAll< HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement >(
      'main input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([disabled]), main textarea:not([disabled]), main select:not([disabled])'
    )).filter((field) => field.getClientRects().length > 0 && !field.readOnly);
    if (fields.length === 0) {
      const message = 'Não encontrei campos de formulário disponíveis nesta tela.';
      setMessages((prev) => [...prev, {
        id: `g-${Date.now()}`, sender: 'gemini', text: message,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Assistente',
      }]);
      speakResponse(message);
      return;
    }
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = fields;
    setGuideFieldIndex(0);
    setIsFormGuiding(true);
    updateGuideTarget(fields[0]);
    speakGuidePrompt(fields[0], 0);
  };

  const cancelFormGuide = () => {
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = [];
    setGuideTargetRect(null);
    setIsFormGuiding(false);
    setIsListening(false);
    try { speechRecognitionRef.current?.stop(); } catch {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setConnectionStatus('idle');
  };

  const applyGuidedAnswer = (answer: string) => {
    const field = guideFieldsRef.current[guideFieldIndex];
    if (!field) {
      cancelFormGuide();
      return;
    }

    let value = answer.trim();
    if (field instanceof HTMLSelectElement) {
      const normalized = value.toLocaleLowerCase('pt-BR');
      const option = Array.from(field.options).find((item) =>
        item.value.toLocaleLowerCase('pt-BR') === normalized ||
        item.textContent?.trim().toLocaleLowerCase('pt-BR') === normalized
      );
      if (!option) {
        speakGuidePrompt(field, guideFieldIndex);
        return;
      }
      value = option.value;
    } else if (field instanceof HTMLInputElement && field.type === 'number') {
      value = value.replace(',', '.').replace(/[^0-9.+-]/g, '');
    }

    const prototype = field instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));

    if (!field.checkValidity()) {
      field.reportValidity();
      speakGuidePrompt(field, guideFieldIndex);
      return;
    }

    field.classList.remove('robot-guide-highlight');
    const nextIndex = guideFieldIndex + 1;
    const nextField = guideFieldsRef.current[nextIndex];
    if (nextField) {
      setGuideFieldIndex(nextIndex);
      updateGuideTarget(nextField);
      speakGuidePrompt(nextField, nextIndex);
      return;
    }

    const doneMessage = 'Concluí o preenchimento dos campos encontrados. Revise os valores antes de salvar ou enviar o formulário.';
    setMessages((prev) => [...prev, {
      id: `g-${Date.now()}`, sender: 'gemini', text: doneMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      modelBadge: 'Assistente',
    }]);
    cancelFormGuide();
    setConnectionStatus('idle');
    speakResponse(doneMessage);
  };

  const startVoiceCapture = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('A captura de voz não é suportada diretamente neste navegador. Digite sua consulta no campo abaixo.');
      setIsListening(false);
      setConnectionStatus('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    speechRecognitionRef.current = recognition;
    setIsListening(true);
    setConnectionStatus('listening');

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        setInputQuery(finalTranscript);
        setIsListening(false);
        if (isFormGuiding) applyGuidedAnswer(finalTranscript);
        else {
          setConnectionStatus('idle');
          handleSendMessage(finalTranscript);
        }
      } else if (interimTranscript) {
        setInputQuery(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Erro microfone:', event);
      setIsListening(false);
      setConnectionStatus('idle');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!isFormGuiding) setConnectionStatus('idle');
    };
    try { recognition.start(); } catch {
      setIsListening(false);
      setConnectionStatus('idle');
    }
  };

  const toggleVoiceMode = () => {
    if (isListening) {
      try { speechRecognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      setConnectionStatus('idle');
      return;
    }
    startVoiceCapture();
  };

  const sampleVoicePrompts = [
    'Qual cabo e disjuntor para chuveiro 7500W?',
    'Exigências da NR-35 para ancoragem em altura',
    'Qual a diluição de APC para sujeira pesada?',
    'Como calcular queda de tensão NBR 5410?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-4 bg-transparent pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[82vh] transition-colors ${
          isDark
            ? 'bg-[#101827] border-[#2A3A55] text-[#E8EDF5]'
            : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
        }`}
      >
        {/* Header bar */}
        <div className="p-3 border-b border-[#2A3A55]/60 flex items-center justify-between gap-3 bg-gradient-to-r from-[#17243A] via-[#101827] to-[#17243A]">
          <div className="flex items-center gap-3">
            <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus} size={42} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white leading-tight">Assistente OBra ENGEP</h3>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#1F66D6] text-white font-bold">Ativo</span>
              </div>
              <p className="text-[11px] text-[#9FB0C8]">Mesmo agente, agora com orientação visual</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isFormGuiding && (
              <button onClick={cancelFormGuide} className="px-2.5 py-2 rounded-xl border border-[#F5B93A]/40 text-[#F5B93A] text-[11px] font-semibold">
                Encerrar guia
              </button>
            )}
            <button
              onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
              title={audioFeedbackEnabled ? 'Resposta em voz ativada' : 'Resposta em voz mutada'}
              className={`p-2 rounded-xl border text-xs transition ${audioFeedbackEnabled ? 'bg-[#1F66D6]/20 border-[#1F66D6]/40 text-[#5B9BFF]' : 'bg-black/20 border-white/5 text-[#9FB0C8]'}`}
            >
              {audioFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-[#9FB0C8] hover:text-white hover:bg-white/10 transition" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Robot companion follows the active form field without intercepting page gestures. */}
        {guideTargetRect && isFormGuiding && (
          <div className="fixed z-[70] pointer-events-none flex items-end gap-2" style={{ top: guideTargetRect.top, left: guideTargetRect.left }}>
            <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus === 'speaking' ? 'speaking' : 'working'} size={76} />
            <div className="max-w-[190px] rounded-2xl border border-[#8da6b7]/50 bg-[#101827]/95 px-3 py-2 text-[11px] text-white shadow-xl">
              Campo {guideFieldIndex + 1} de {guideFieldsRef.current.length}
              <div className="text-[#c7d7df]">{getGuideFieldLabel(guideFieldsRef.current[guideFieldIndex], guideFieldIndex)}</div>
            </div>
          </div>
        )}

        {/* Central Robot Head: tap to speak, same SpeechRecognition pipeline as before. */}
        <div className="py-4 px-4 bg-gradient-to-b from-[#17243A]/50 to-transparent flex flex-col items-center justify-center border-b border-[#2A3A55]/40 relative">
          <button
            onClick={toggleVoiceMode}
            aria-label={isListening ? 'Parar captura de voz' : 'Falar com o assistente'}
            className="rounded-2xl min-w-[112px] min-h-[112px] flex items-center justify-center focus-visible:outline-offset-4"
          >
            <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus} size={104} />
          </button>
          <div className="mt-2 text-center space-y-1">
            <div className="text-xs font-semibold text-[#c7d7df]">
              {isListening ? 'Ouvindo você…' : connectionStatus === 'thinking' ? 'Analisando sua solicitação…' : connectionStatus === 'speaking' ? 'Falando com você…' : isFormGuiding ? 'Preenchimento guiado ativo' : 'Toque no robô para conversar'}
            </div>
            <p className="text-[10px] text-[#9FB0C8]">O estado do robô acompanha o estado real da conversa.</p>
          </div>
        </div>

        {/* Quick Voice Prompts and contextual page guidance */}
        <div className="px-3 py-2 bg-[#17243A]/40 border-b border-[#2A3A55]/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={isFormGuiding ? cancelFormGuide : startFormGuide}
            disabled={isGenerating}
            className="px-2.5 py-1.5 rounded-lg bg-[#1F66D6]/20 border border-[#5B9BFF]/40 text-[#c7d7df] whitespace-nowrap font-semibold disabled:opacity-50"
          >
            {isFormGuiding ? 'Cancelar guia' : 'Guiar formulário por voz'}
          </button>
          <span className="text-[10px] text-[#9FB0C8] font-bold uppercase shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#F5B93A]" /> Pergunta rápida:
          </span>
          {sampleVoicePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isGenerating}
              className="px-2.5 py-1 rounded-lg bg-[#101827] border border-[#2A3A55] text-[#9FB0C8] hover:text-white hover:border-[#5B9BFF] whitespace-nowrap transition disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Conversation transcript & Extended thinking */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[350px]">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 text-xs text-[#9FB0C8]">
              Faça uma pergunta técnica por texto ou voz para receber orientações e esclarecer dúvidas.
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-bold text-[#9FB0C8] uppercase">
                  {msg.sender === 'user' ? 'Você' : 'Assistente'}
                </span>
                <span className="text-[10px] text-[#9FB0C8]/70">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-[#1F66D6] text-white rounded-br-none'
                    : 'bg-[#17243A] border border-[#2A3A55] text-[#E8EDF5] rounded-bl-none'
                }`}
              >
                {/* Extended Thinking accordion */}
                {msg.thought && (
                  <div className="rounded-xl border border-[#5B9BFF]/30 bg-black/40 overflow-hidden">
                    <button
                      onClick={() => toggleThought(msg.id)}
                      className="w-full px-2.5 py-1.5 text-left flex items-center justify-between text-[#5B9BFF] hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                        <Brain className="w-3.5 h-3.5 text-[#F5B93A]" />
                        <span>Raciocínio Estendido</span>
                      </div>
                      {expandedThoughts[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {expandedThoughts[msg.id] && (
                      <div className="px-2.5 pb-2 text-[10px] font-mono text-[#9FB0C8] border-t border-white/5 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        {msg.thought}
                      </div>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap select-text">
                  {msg.text || (
                    <span className="inline-flex items-center gap-2 text-[#9FB0C8] italic">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B9BFF]" />
                      Analisando requisitos técnicos...
                    </span>
                  )}
                </div>

                {msg.sender === 'gemini' && msg.text && (
                  <div className="pt-1 flex items-center justify-between border-t border-white/5 text-[10px] text-[#9FB0C8]">
                    <span>Fundamentação ABNT/NR</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-[#3DD68C]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <button
                        onClick={() => speakResponse(msg.text)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Falar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#2A3A55]/60 bg-[#17243A]/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Digite ou toque no robô para falar por voz..."
              disabled={isGenerating}
              className="flex-1 h-11 px-4 rounded-xl bg-[#101827] border border-[#6B7F9E]/50 text-white text-xs outline-none focus:border-[#1F66D6] placeholder:text-[#9FB0C8]/60"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isGenerating}
              className="h-11 px-4 rounded-xl bg-[#1F66D6] text-white hover:bg-[#1A57B8] text-xs font-semibold disabled:opacity-40 transition flex items-center justify-center"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
