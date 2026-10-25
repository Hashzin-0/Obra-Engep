/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Voice Agent Orb Modal - Real-Time Speech-to-Speech Serverless Integration
 * Features central interactive glowing orb, audio visualizer, extended thinking, and speech synthesis.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
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

interface VoiceAgentOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAgentOrbModal: React.FC<VoiceAgentOrbModalProps> = ({ isOpen, onClose }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-0',
      sender: 'gemini',
      text: 'Agente de Voz Serverless conectado com **Gemini 3.8 Extended Thinking**. Toque na Orb central ou fale para iniciar a conversação Speech-to-Speech.',
      thought: 'Inicialização serverless completa. Conexão bi-direcional pronta para streaming de voz e raciocínio técnico ABNT NBR 5410 / NR-35 / NR-10.',
      timestamp: 'Agora',
      modelBadge: 'Speech-to-Speech · Gemini 3.8',
    },
  ]);

  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({ 'm-0': true });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, connectionStatus, isOpen]);

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
      modelBadge: 'Gemini 3.8 Extended Thinking',
    };

    setMessages((prev) => [...prev, userMsg, initialGeminiMsg]);
    setInputQuery('');
    setIsGenerating(true);
    setConnectionStatus('thinking');
    setExpandedThoughts((prev) => ({ ...prev, [geminiMsgId]: true }));

    try {
      const response = await fetch('/api/gemini/realtime-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                thought: 'Falha temporária ao comunicar com a API do Gemini.',
              }
            : m
        )
      );
      setConnectionStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle speech input via browser SpeechRecognition
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
      alert('A captura de voz não é suportada diretamente neste navegador. Digite sua consulta no campo abaixo.');
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

    recognition.onerror = (e: any) => {
      console.warn('Erro microfone:', e);
      setIsListening(false);
      setConnectionStatus('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      setConnectionStatus('idle');
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const sampleVoicePrompts = [
    'Qual cabo e disjuntor para chuveiro 7500W?',
    'Exigências da NR-35 para ancoragem em altura',
    'Qual a diluição de APC para sujeira pesada?',
    'Como calcular queda de tensão NBR 5410?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-colors ${
          isDark
            ? 'bg-[#101827] border-[#2A3A55] text-[#E8EDF5]'
            : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
        }`}
      >
        {/* Header bar */}
        <div className="p-4 border-b border-[#2A3A55]/60 flex items-center justify-between gap-3 bg-gradient-to-r from-[#17243A] via-[#101827] to-[#17243A]">
          <div className="flex items-center gap-3">
            {/* Small Glowing Header Orb */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1F66D6] via-[#A855F7] to-[#06B6D4] p-0.5 shadow-md shadow-[#1F66D6]/40 flex items-center justify-center animate-pulse">
              <div className="w-full h-full rounded-full bg-[#101827] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#5B9BFF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white leading-tight">Agente de Voz Serverless</h3>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#1F66D6] text-white font-bold">
                  Speech-to-Speech
                </span>
              </div>
              <p className="text-[11px] text-[#9FB0C8]">Gemini 3.8 Extended Thinking</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
              title={audioFeedbackEnabled ? 'Resposta em voz ativada' : 'Resposta em voz mutada'}
              className={`p-2 rounded-xl border text-xs transition ${
                audioFeedbackEnabled
                  ? 'bg-[#1F66D6]/20 border-[#1F66D6]/40 text-[#5B9BFF]'
                  : 'bg-black/20 border-white/5 text-[#9FB0C8]'
              }`}
            >
              {audioFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#9FB0C8] hover:text-white hover:bg-white/10 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Voice Orb & Waveform Display */}
        <div className="py-6 px-4 bg-gradient-to-b from-[#17243A]/50 to-transparent flex flex-col items-center justify-center border-b border-[#2A3A55]/40 relative">
          {/* Animated Glowing Central Voice Orb */}
          <button
            onClick={toggleVoiceMode}
            className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
              isListening
                ? 'scale-110 shadow-2xl shadow-[#FF6B6B]/60'
                : connectionStatus === 'speaking'
                ? 'scale-105 shadow-2xl shadow-[#3DD68C]/60'
                : connectionStatus === 'thinking'
                ? 'shadow-2xl shadow-[#F5B93A]/60'
                : 'shadow-xl shadow-[#1F66D6]/40 hover:scale-105'
            }`}
          >
            {/* Multi-layered Pulsing Aura */}
            <div
              className={`absolute inset-0 rounded-full blur-md opacity-75 transition-all ${
                isListening
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#F5B93A] animate-ping'
                  : connectionStatus === 'speaking'
                  ? 'bg-gradient-to-r from-[#3DD68C] to-[#06B6D4] animate-pulse'
                  : connectionStatus === 'thinking'
                  ? 'bg-gradient-to-r from-[#F5B93A] to-[#A855F7] animate-spin'
                  : 'bg-gradient-to-tr from-[#1F66D6] via-[#A855F7] to-[#06B6D4] animate-pulse'
              }`}
            />

            {/* Glowing Orb Inner sphere */}
            <div
              className={`relative z-10 w-full h-full rounded-full p-1 bg-gradient-to-tr ${
                isListening
                  ? 'from-[#FF6B6B] via-[#F5B93A] to-[#FF6B6B]'
                  : connectionStatus === 'speaking'
                  ? 'from-[#3DD68C] via-[#06B6D4] to-[#3DD68C]'
                  : connectionStatus === 'thinking'
                  ? 'from-[#F5B93A] via-[#A855F7] to-[#1F66D6]'
                  : 'from-[#1F66D6] via-[#A855F7] to-[#06B6D4]'
              } flex items-center justify-center border-2 border-white/20`}
            >
              <div className="w-full h-full rounded-full bg-[#101827]/90 backdrop-blur-xs flex items-center justify-center">
                {isListening ? (
                  <MicOff className="w-9 h-9 text-[#FF6B6B] animate-bounce" />
                ) : connectionStatus === 'thinking' ? (
                  <Brain className="w-9 h-9 text-[#F5B93A] animate-spin" />
                ) : connectionStatus === 'speaking' ? (
                  <Volume2 className="w-9 h-9 text-[#3DD68C] animate-pulse" />
                ) : (
                  <Mic className="w-9 h-9 text-[#5B9BFF] group-hover:scale-110 transition-transform" />
                )}
              </div>
            </div>
          </button>

          {/* Dynamic Voice Status Label & Visualizer Bars */}
          <div className="mt-4 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              {isListening ? (
                <span className="text-xs font-bold text-[#FF6B6B] flex items-center gap-1 font-mono uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B6B] animate-ping" /> Ouvindo você... Fale a pergunta
                </span>
              ) : connectionStatus === 'thinking' ? (
                <span className="text-xs font-bold text-[#F5B93A] flex items-center gap-1 font-mono uppercase">
                  <Brain className="w-3.5 h-3.5 animate-spin" /> Raciocinando com NBRs & NRs...
                </span>
              ) : connectionStatus === 'speaking' ? (
                <span className="text-xs font-bold text-[#3DD68C] flex items-center gap-1 font-mono uppercase">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Respondedo por voz (Speech)...
                </span>
              ) : (
                <span className="text-xs text-[#9FB0C8] font-medium">
                  Toque na Orb acima ou clique no microfone para conversar por voz
                </span>
              )}
            </div>

            {/* Audio Waveform equalizers */}
            {(isListening || connectionStatus === 'speaking') && (
              <div className="flex items-center justify-center gap-1.5 h-6 pt-1">
                <span className="w-1 bg-[#5B9BFF] rounded-full h-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 bg-[#3DD68C] rounded-full h-3/4 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 bg-[#F5B93A] rounded-full h-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 bg-[#FF6B6B] rounded-full h-1/2 animate-bounce" style={{ animationDelay: '450ms' }} />
                <span className="w-1 bg-[#A855F7] rounded-full h-full animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Voice Prompts */}
        <div className="px-3 py-2 bg-[#17243A]/40 border-b border-[#2A3A55]/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-bold text-[#9FB0C8] uppercase">
                  {msg.sender === 'user' ? 'Você (Voz/Texto)' : 'Gemini 3.8'}
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
              placeholder="Digite ou aperte a Orb para falar por voz..."
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
