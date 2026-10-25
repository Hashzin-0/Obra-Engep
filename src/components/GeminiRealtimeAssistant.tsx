/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Real-time Conversational Assistant with Gemini 3.8 Extended Thinking
 * Full voice + text live streaming with visible reasoning, audio wave visualizer, and normative grounding.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Brain,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Zap,
  ShieldAlert,
  Loader2,
  Radio,
  FileText,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  thought?: string;
  timestamp: string;
  modelBadge?: string;
}

interface GeminiRealtimeAssistantProps {
  initialPrompt?: string;
  compact?: boolean;
  onClose?: () => void;
}

export const GeminiRealtimeAssistant: React.FC<GeminiRealtimeAssistantProps> = ({
  initialPrompt,
  compact = false,
  onClose,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [inputQuery, setInputQuery] = useState(initialPrompt || '');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-0',
      sender: 'gemini',
      text: 'Olá, Luis! Sou o Assistente Técnico do OBra ENGEP operando com **Gemini 3.8 Extended Thinking**. Estou pronto para dialogar em tempo real por voz ou texto sobre cálculos elétricos (NBR 5410), trabalho em altura (NR-35), desenergização (NR-10), diluições automotivas e plantas técnicas. Como posso apoiar sua obra agora?',
      thought: 'Sessão inicializada. Modelo carregado: Gemini 3.8 com raciocínio estendido ativo. Monitoramento de normas ABNT e NRs em tempo real.',
      timestamp: 'Agora',
      modelBadge: 'Gemini 3.8 Extended Thinking',
    },
  ]);

  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({ 'm-0': false });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'thinking' | 'streaming' | 'listening'>('idle');

  // WebSocket Live audio reference
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, connectionStatus]);

  // Handle Copy message
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle thought accordion
  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Speak text aloud using browser SpeechSynthesis
  const speakText = (text: string) => {
    if (!audioFeedbackEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Remove markdown bolding for smooth speech
      const cleanText = text.replace(/[*#_`]/g, '').slice(0, 320);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Real-time Streaming Chat with Extended Thinking
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputQuery).trim();
    if (!prompt || isGenerating) return;

    const userMessageId = `u-${Date.now()}`;
    const geminiMessageId = `g-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const initialGeminiMsg: ChatMessage = {
      id: geminiMessageId,
      sender: 'gemini',
      text: '',
      thought: '',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      modelBadge: 'Gemini 3.8 Extended Thinking',
    };

    setMessages((prev) => [...prev, userMsg, initialGeminiMsg]);
    setInputQuery('');
    setIsGenerating(true);
    setConnectionStatus('thinking');
    // Open the thinking block automatically so the user sees the extended thinking unfold
    setExpandedThoughts((prev) => ({ ...prev, [geminiMessageId]: true }));

    try {
      const response = await fetch('/api/gemini/realtime-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Servidor retornou status ${response.status}`);
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
                    m.id === geminiMessageId ? { ...m, thought: accumulatedThought } : m
                  )
                );
              } else if (data.type === 'text') {
                accumulatedText += data.text;
                setConnectionStatus('streaming');
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === geminiMessageId ? { ...m, text: accumulatedText } : m
                  )
                );
              } else if (data.type === 'done') {
                setConnectionStatus('idle');
              }
            } catch (e) {
              // Ignore line parse errors in stream
            }
          }
        }
      }

      // Voice output of final answer
      if (accumulatedText) {
        speakText(accumulatedText);
      }
    } catch (err: any) {
      console.error('Real-time conversation error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === geminiMessageId
            ? {
                ...m,
                text:
                  m.text ||
                  'Não foi possível concluir a transmissão da resposta em tempo real. Por favor, tente novamente.',
                thought: m.thought || 'Tentativa de conexão com o modelo 3.8 interrompida.',
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
      setConnectionStatus('idle');
    }
  };

  // Toggle Live Voice Mic using Web Speech API with fallback
  const toggleVoiceMode = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setConnectionStatus('idle');
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Seu navegador não suporta captura contínua de microfone via Web Speech. Digite sua dúvida no campo abaixo.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInputQuery(finalTranscript);
        setIsListening(false);
        setConnectionStatus('idle');
        handleSendMessage(finalTranscript);
      } else if (interimTranscript) {
        setInputQuery(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setConnectionStatus('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (connectionStatus === 'listening') {
        setConnectionStatus('idle');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  const engineeringPrompts = [
    'Qual disjuntor e cabo usar para chuveiro 7500W 220V?',
    'Quais os requisitos de ponto de ancoragem na NR-35?',
    'Qual a diluição de APC para limpeza pesada de estofados?',
    'Como calcular a queda de tensão máxima permitida pela NBR 5410?',
    'Quais os procedimentos de LOTO e desenergização na NR-10?',
  ];

  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all ${
        compact ? 'h-[520px]' : 'min-h-[580px] max-h-[82vh]'
      } ${
        isDark
          ? 'bg-[#101827] border-[#2A3A55] text-[#E8EDF5]'
          : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
      }`}
    >
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 border-b border-[#2A3A55]/60 flex items-center justify-between gap-3 bg-gradient-to-r from-[#17243A]/80 to-[#101827]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#1F66D6]/20 border border-[#1F66D6]/40 flex items-center justify-center shrink-0 text-[#5B9BFF]">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold truncate text-white">Gemini 3.8 Real-Time</h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#1F66D6] text-white font-semibold">
                Extended Thinking
              </span>
            </div>
            <p className="text-[11px] text-[#9FB0C8] truncate">
              Voz e texto em tempo real com raciocínio analítico para campo
            </p>
          </div>
        </div>

        {/* Audio output & controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
            aria-label={audioFeedbackEnabled ? 'Desativar áudio falado' : 'Ativar áudio falado'}
            title={audioFeedbackEnabled ? 'Áudio de resposta ativo' : 'Áudio de resposta mudo'}
            className={`p-2 rounded-xl border text-xs transition ${
              audioFeedbackEnabled
                ? 'bg-[#1F66D6]/20 border-[#1F66D6]/40 text-[#5B9BFF]'
                : 'bg-black/20 border-white/5 text-[#9FB0C8]'
            }`}
          >
            {audioFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#9FB0C8] hover:text-white hover:bg-white/10 text-xs"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Suggested Engineering Prompts */}
      <div className="px-3.5 py-2 border-b border-[#2A3A55]/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#17243A]/40 text-xs">
        <span className="text-[10px] text-[#9FB0C8] uppercase font-bold shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-[#F5B93A]" /> Sugestões:
        </span>
        {engineeringPrompts.map((p, idx) => (
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

      {/* Live Audio Visualizer Banner when listening */}
      {isListening && (
        <div className="p-3 bg-gradient-to-r from-[#FF6B6B]/20 via-[#1F66D6]/20 to-[#FF6B6B]/20 border-b border-[#FF6B6B]/40 flex items-center justify-center gap-3 animate-pulse">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-4 bg-[#FF6B6B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-6 bg-[#5B9BFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-8 bg-[#3DD68C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-1.5 h-5 bg-[#F5B93A] rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
          </div>
          <span className="text-xs font-bold text-white">
            Ouvindo sua consulta técnica em tempo real... Fale agora.
          </span>
        </div>
      )}

      {/* Conversation Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender header */}
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-bold text-[#9FB0C8] uppercase">
                {msg.sender === 'user' ? 'Você' : 'Gemini 3.8'}
              </span>
              <span className="text-[10px] text-[#9FB0C8]/70">{msg.timestamp}</span>
              {msg.modelBadge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1F66D6]/20 text-[#5B9BFF] font-mono">
                  {msg.modelBadge}
                </span>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed shadow-sm space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-[#1F66D6] text-white rounded-br-none'
                  : 'bg-[#17243A] border border-[#2A3A55] text-[#E8EDF5] rounded-bl-none'
              }`}
            >
              {/* Extended Thinking Section (Collapsible Accordion) */}
              {msg.thought && (
                <div className="rounded-xl border border-[#5B9BFF]/30 bg-black/30 overflow-hidden">
                  <button
                    onClick={() => toggleThought(msg.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-[#5B9BFF] hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                      <Brain className="w-3.5 h-3.5 text-[#F5B93A]" />
                      <span>Raciocínio Estendido (Extended Thinking)</span>
                    </div>
                    {expandedThoughts[msg.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedThoughts[msg.id] && (
                    <div className="px-3 pb-3 pt-1 text-[11px] font-mono text-[#9FB0C8] border-t border-white/5 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {msg.thought}
                    </div>
                  )}
                </div>
              )}

              {/* Main message text */}
              <div className="whitespace-pre-wrap select-text">
                {msg.text || (
                  <span className="inline-flex items-center gap-2 text-[#9FB0C8] italic">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B9BFF]" />
                    Formulando resposta com verificação normativa...
                  </span>
                )}
              </div>

              {/* Actions toolbar */}
              {msg.sender === 'gemini' && msg.text && (
                <div className="pt-1 flex items-center justify-between border-t border-white/5 text-[10px] text-[#9FB0C8]">
                  <span>OBra ENGEP · Verificação Técnica</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1 rounded hover:text-white flex items-center gap-1 transition"
                      title="Copiar resposta técnica"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#3DD68C]" />
                          <span className="text-[#3DD68C]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => speakText(msg.text)}
                      className="p-1 rounded hover:text-white flex items-center gap-1 transition"
                      title="Ouvir resposta em áudio"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Ouvir</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Real-time status indicator */}
        {connectionStatus === 'thinking' && (
          <div className="flex items-center gap-2 text-xs text-[#F5B93A] bg-[#17243A] p-3 rounded-xl border border-[#F5B93A]/30 w-fit">
            <Brain className="w-4 h-4 animate-spin" />
            <span className="font-mono">Gemini 3.8 processando raciocínio estendido e normas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls form */}
      <div className="p-3 sm:p-4 border-t border-[#2A3A55]/60 bg-[#17243A]/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Real-time Voice Mic button */}
          <button
            type="button"
            onClick={toggleVoiceMode}
            aria-label={isListening ? 'Parar microfone' : 'Falar comando de voz'}
            title={isListening ? 'Toque para finalizar escuta' : 'Toque para falar por voz'}
            className={`w-12 h-12 rounded-xl border transition flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-[#FF6B6B] border-[#FF6B6B] text-white animate-pulse shadow-lg shadow-[#FF6B6B]/30'
                : 'bg-[#1F66D6] hover:bg-[#1A57B8] border-[#1F66D6] text-white shadow-xs'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                isListening
                  ? 'Fale no microfone... Estamos ouvindo'
                  : 'Fale por voz ou digite sua consulta técnica...'
              }
              disabled={isGenerating}
              className="w-full h-12 px-4 rounded-xl bg-[#101827] border border-[#6B7F9E]/50 text-white text-xs sm:text-sm outline-none focus:border-[#1F66D6] placeholder:text-[#9FB0C8]/60 transition"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputQuery.trim() || isGenerating}
            aria-label="Enviar pergunta"
            className="w-12 h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white disabled:opacity-40 disabled:hover:bg-[#1F66D6] flex items-center justify-center shrink-0 transition"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>

        <p className="text-[10px] text-center text-[#9FB0C8]/80 mt-2">
          Respostas fundamentadas nas normas ABNT (NBR 5410, 5626, 6118) e NRs do MTE. Não substitui ART/RRT de responsável técnico.
        </p>
      </div>
    </div>
  );
};
