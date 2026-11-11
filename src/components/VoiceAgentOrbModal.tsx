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
  Mic,
  MicOff,
  MessageSquare,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getSupabaseAccessToken, supabase } from '../lib/supabase';
import { RobotHeadAvatar } from './RobotHeadAvatar';
import type { ModuleId } from '../types';
import type { CanvasAgentApi, CanvasAgentKind } from '../views/FloorPlanEditorView';
import { contractModels } from '../data/contractsCatalog';

const LANGUAGE_HINTS: Record<string, string[]> = {
  'pt-BR': ['você', 'voce', 'seus', 'suas', 'favoritos', 'quero', 'preciso', 'como', 'qual', 'obrigado', 'não', 'nao'],
  'es-ES': ['hola', 'quiero', 'necesito', 'mis', 'favoritos', 'puedes', 'cómo', 'como', 'qué', 'que', 'gracias', 'favor'],
  'en-US': ['the', 'and', 'please', 'show', 'my', 'favorites', 'favourites', 'can', 'you', 'how', 'what', 'thanks'],
  'fr-FR': ['bonjour', 'veux', 'mes', 'favoris', 'comment', 'merci', 'vous', 'pouvez'],
};

function detectSpeechLanguage(text: string, fallback: string): string {
  const normalized = text.toLocaleLowerCase();
  if (/[ñ¿¡]/.test(normalized)) return 'es-ES';
  const words = new Set(normalized.match(/[a-záéíóúãõâêôçñü]+/g) ?? []);
  const scores = Object.entries(LANGUAGE_HINTS).map(([language, hints]) => ({
    language,
    score: hints.filter((word) => words.has(word)).length,
  })).sort((a, b) => b.score - a.score);
  return scores[0]?.score >= 2 ? scores[0].language : fallback;
}

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
  onStatusChange?: (state: 'sleeping' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'happy' | 'error') => void;
  onGuidingChange?: (guiding: boolean) => void;
  onNavigateToSection?: (section: 'inicio' | 'biblioteca' | 'favoritos' | 'mais') => void;
  onNavigateToModule?: (moduleId: ModuleId, itemId?: string) => void;
  getProjectOverview?: () => Array<{ id: string; name: string; type: string; stage: string; updatedAt: string; walls: number; rooms: number; openings: number }>;
  getCanvasAgent?: () => CanvasAgentApi | null;
}

export const VoiceAgentOrbModal: React.FC<VoiceAgentOrbModalProps> = ({ isOpen, onClose, onStatusChange, onGuidingChange, onNavigateToSection, onNavigateToModule, getProjectOverview, getCanvasAgent }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const isMicrophoneMutedRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'happy' | 'error'>('idle');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isFormGuiding, setIsFormGuiding] = useState(false);
  const [isTouringControls, setIsTouringControls] = useState(false);
  const isTouringControlsRef = useRef(false);
  const tourTargetsRef = useRef<HTMLElement[]>([]);
  const tourIndexRef = useRef(0);
  const [guideFieldIndex, setGuideFieldIndex] = useState(0);
  const guideFieldIndexRef = useRef(0);
  const isFormGuidingRef = useRef(false);
  const [guideTargetRect, setGuideTargetRect] = useState<{ top: number; left: number } | null>(null);
  const guideFieldsRef = useRef<Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>([]);

  const speechRecognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<WebSocket | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveOutputAudioContextRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const livePlaybackTimeRef = useRef(0);
  const liveOutputCompleteRef = useRef(false);
  const liveInteractionInProgressRef = useRef(false);
  const livePendingToolCallsRef = useRef(0);
  const livePlaybackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveTurnRef = useRef<{ userId: string; assistantId: string; userText: string; assistantText: string } | null>(null);
  const liveShouldStopRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastInputLanguageRef = useRef(
    typeof navigator !== 'undefined' ? navigator.language || 'pt-BR' : 'pt-BR'
  );

  const loadCurrentUserFavorites = async (limit = 30) => {
    if (!supabase) throw new Error('O acesso aos favoritos está indisponível.');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user || user.is_anonymous || user.app_metadata?.provider !== 'google') {
      throw new Error('Entre com sua conta Google para consultar seus favoritos.');
    }
    const { data, error } = await supabase
      .from('favorites')
      .select('item_type,item_id,title,subtitle,module_id,metadata,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(30, Math.max(1, limit)));
    if (error) throw new Error('Não foi possível carregar os favoritos da sua conta.');
    return data ?? [];
  };

  const getAuthenticatedGoogleUser = async () => {
    if (!supabase) throw new Error('O acesso aos dados da conta está indisponível.');
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user || user.is_anonymous || user.app_metadata?.provider !== 'google') {
      throw new Error('Entre com sua conta Google para consultar estes dados.');
    }
    return user;
  };

  const loadRecentCalculations = async (limit = 10) => {
    const user = await getAuthenticatedGoogleUser();
    const { data, error } = await supabase!
      .from('calculation_history')
      .select('id,title,category,result_value,result_unit,formula,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(20, Math.max(1, limit)));
    if (error) throw new Error('Não foi possível consultar o histórico de cálculos.');
    return data ?? [];
  };

  const loadUpcomingDeadlines = async (limit = 10) => {
    const user = await getAuthenticatedGoogleUser();
    const { data, error } = await supabase!
      .from('deadlines')
      .select('id,title,description,due_date,due_time,priority,status,category,project_name')
      .eq('user_id', user.id)
      .neq('status', 'concluido')
      .order('due_date', { ascending: true })
      .limit(Math.min(20, Math.max(1, limit)));
    if (error) throw new Error('Não foi possível consultar os prazos da conta.');
    return data ?? [];
  };

  const searchLibraryItems = async (query: string) => {
    if (!supabase || query.trim().length < 2) throw new Error('Informe ao menos dois caracteres para pesquisar na biblioteca.');
    const { data, error } = await supabase
      .from('library_items')
      .select('id,kind,code,title,summary,official_url')
      .ilike('title', `%${query.trim().slice(0, 100)}%`)
      .limit(8);
    if (error) throw new Error('Não foi possível pesquisar na biblioteca técnica.');
    return data ?? [];
  };

  const normalizeUiLabel = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();

  const getVisibleScreenControls = () => {
    const root = document.querySelector<HTMLElement>('main');
    if (!root) return [];
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="password"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [role="button"], [data-robot-guide]'
    ));
    return nodes
      .filter((node) => node.getClientRects().length > 0)
      .slice(0, 80)
      .map((node, index) => ({
        index,
        label: getGuideFieldLabel(node, index),
        role: node instanceof HTMLButtonElement ? 'button'
          : node instanceof HTMLSelectElement ? 'select'
            : node instanceof HTMLInputElement ? 'input'
              : node instanceof HTMLTextAreaElement ? 'textarea'
                : node.tagName.toLocaleLowerCase(),
        description: node.getAttribute('data-robot-description') ?? '',
        fieldKey: node.dataset.agentField ?? null,
        inputType: node instanceof HTMLInputElement ? node.type : undefined,
        placeholder: 'placeholder' in node ? String(node.getAttribute('placeholder') ?? '') : '',
        required: 'required' in node ? Boolean((node as HTMLInputElement).required) : false,
        min: 'min' in node ? String((node as HTMLInputElement).min ?? '') : undefined,
        max: 'max' in node ? String((node as HTMLInputElement).max ?? '') : undefined,
        step: 'step' in node ? String((node as HTMLInputElement).step ?? '') : undefined,
        options: node instanceof HTMLSelectElement
          ? Array.from(node.options).map((option) => ({ label: option.textContent?.trim() ?? '', value: option.value })).slice(0, 30)
          : undefined,
      }));
  };

  const fillCalculatorFields = async (fields: unknown, submit: boolean) => {
    if (!Array.isArray(fields) || fields.length === 0 || fields.length > 20) {
      throw new Error('Informe entre 1 e 20 pares de campo e valor.');
    }
    const root = document.querySelector<HTMLElement>('[data-calculator-form]');
    if (!root || root.getClientRects().length === 0) throw new Error('Abra uma calculadora antes de preencher os campos.');
    const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([type="file"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="date"]):not([type="time"]):not([type="month"]):not([type="week"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    )).filter((field) => field.getClientRects().length > 0 && !(field instanceof HTMLInputElement && field.readOnly) && !(field instanceof HTMLTextAreaElement && field.readOnly));

    const filled: string[] = [];
    const errors: string[] = [];
    for (const entry of fields) {
      if (!entry || typeof entry !== 'object' || !('label' in entry) || !('value' in entry)) {
        errors.push('Parâmetro de campo inválido.');
        continue;
      }
      const label = (entry as { label: unknown }).label;
      const value = (entry as { value: unknown }).value;
      if (typeof label !== 'string' || !label.trim() || !['string', 'number', 'boolean'].includes(typeof value)) {
        errors.push('Cada campo precisa de um rótulo e um valor textual, numérico ou booleano.');
        continue;
      }
      const wanted = normalizeUiLabel(label);
      const matches = controls.filter((field, index) => {
        const actual = normalizeUiLabel(getGuideFieldLabel(field, index));
        return actual === wanted || (wanted.length >= 4 && actual.includes(wanted));
      });
      if (matches.length !== 1) {
        errors.push(matches.length === 0
          ? `Campo "${label}" não encontrado na calculadora atual.`
          : `O rótulo "${label}" corresponde a mais de um campo; especifique melhor.`);
        continue;
      }
      const field = matches[0];
      let nextValue = String(value);
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        const normalized = normalizeUiLabel(nextValue);
        if (typeof value !== 'boolean' && !['sim', 'nao', 'true', 'false', '1', '0'].includes(normalized)) {
          errors.push(`O campo ${label} espera um valor verdadeiro/falso.`);
          continue;
        }
        const checked = typeof value === 'boolean' ? value : ['sim', 'true', '1'].includes(normalized);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
        setter?.call(field, checked);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push(label);
        continue;
      }
      if (field instanceof HTMLSelectElement) {
        const normalized = normalizeUiLabel(nextValue);
        const option = Array.from(field.options).find((item) =>
          normalizeUiLabel(item.value) === normalized || normalizeUiLabel(item.textContent ?? '') === normalized
        );
        if (!option) {
          errors.push(`Valor "${nextValue}" não corresponde a uma opção de ${label}.`);
          continue;
        }
        nextValue = option.value;
      } else if (field instanceof HTMLInputElement && field.type === 'number') {
        const numeric = typeof value === 'number' ? value : Number(nextValue.replace(',', '.'));
        if (!Number.isFinite(numeric)) {
          errors.push(`O valor de ${label} precisa ser numérico.`);
          continue;
        }
        nextValue = String(numeric);
      }
      const prototype = field instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      setter?.call(field, nextValue);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      if (!field.checkValidity()) {
        field.reportValidity();
        errors.push(`O valor informado para ${label} não passou na validação do campo.`);
        continue;
      }
      filled.push(label);
    }

    let submitted = false;
    if (submit && errors.length === 0) {
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
        .filter((button) => button.getClientRects().length > 0);
      const calculateButton = buttons.find((button) =>
        /^(calcular|dimensionar|gerar resultado)(?:\b|\s)/i.test(button.textContent?.trim() ?? '') || /^(calcular|dimensionar|gerar resultado)$/i.test(button.textContent?.trim() ?? '')
      );
      if (!calculateButton) throw new Error('Os campos foram preenchidos, mas não encontrei um botão de cálculo nesta tela.');
      calculateButton.click();
      submitted = true;
    }
    return { status: errors.length ? 'partial' : 'ok', filled, errors, submitted };
  };

  const fillContractFields = (fields: unknown) => {
    if (!Array.isArray(fields) || fields.length === 0 || fields.length > 30) throw new Error('Informe entre 1 e 30 pares de campo e valor.');
    const root = document.querySelector<HTMLElement>('[data-agent-form="contract-editor"]');
    if (!root || root.getClientRects().length === 0) throw new Error('Abra um modelo de contrato e entre na etapa de dados para preencher os campos.');
    const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])')).filter((field) => field.getClientRects().length > 0 && !field.readOnly);
    const filled: string[] = [];
    const errors: string[] = [];
    for (const entry of fields) {
      if (!entry || typeof entry !== 'object' || !('label' in entry) || !('value' in entry)) { errors.push('Parâmetro de campo inválido.'); continue; }
      const label = (entry as { label: unknown }).label;
      const value = (entry as { value: unknown }).value;
      if (typeof label !== 'string' || !label.trim() || !['string', 'number', 'boolean'].includes(typeof value)) { errors.push('Cada campo precisa de uma chave/rótulo e um valor textual, numérico ou booleano.'); continue; }
      const wanted = normalizeUiLabel(label);
      const matches = controls.filter((field, index) => {
        const key = field.dataset.agentField ?? '';
        return key === label || normalizeUiLabel(key) === wanted || normalizeUiLabel(getGuideFieldLabel(field, index)) === wanted;
      });
      if (matches.length !== 1) {
        errors.push(matches.length === 0 ? 'Campo "' + label + '" não encontrado no formulário do contrato atual.' : 'O identificador "' + label + '" corresponde a mais de um campo; use a chave exata.');
        continue;
      }
      const field = matches[0];
      const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, String(value));
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      if (!field.checkValidity()) { field.reportValidity(); errors.push('O valor informado para ' + label + ' não passou na validação.'); continue; }
      filled.push(field.dataset.agentField || getGuideFieldLabel(field, controls.indexOf(field)));
    }
    return { status: errors.length ? 'partial' : 'ok', filled, errors, saved: false, generated: false, message: 'Campos preenchidos. O documento não foi gerado nem salvo.' };
  };

  const highlightUiElement = (query: string) => {
    const root = document.querySelector<HTMLElement>('main');
    if (!root) throw new Error('A tela principal não está disponível.');
    const normalizedQuery = normalizeUiLabel(query.replace(/^(botao|botão|campo|aba|secao|seção)\s+/i, ''));
    if (normalizedQuery.length < 2) throw new Error('Informe o nome visível do elemento que deseja destacar.');
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [role="button"], [data-robot-guide], h1, h2, h3, [data-robot-label]'
    )).filter((node) => node.getClientRects().length > 0);
    const ranked = candidates.map((node, index) => {
      const label = getGuideFieldLabel(node, index);
      const normalized = normalizeUiLabel(label);
      const text = normalizeUiLabel(node.innerText ?? node.textContent ?? '');
      const accessible = normalizeUiLabel(node.getAttribute('aria-label') ?? '');
      const score = normalized === normalizedQuery || accessible === normalizedQuery || text === normalizedQuery
        ? 3
        : normalized.includes(normalizedQuery) || text.includes(normalizedQuery) || accessible.includes(normalizedQuery)
          ? 2 : 0;
      return { node, label, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    if (!ranked.length) throw new Error(`Não encontrei "${query}" nesta tela. Consulte get_current_screen_controls para ver os rótulos disponíveis.`);
    if (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].label !== ranked[1].label) {
      throw new Error(`Encontrei mais de um elemento correspondente a "${query}". Use o rótulo completo.`);
    }
    const target = ranked[0].node;
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    tourTargetsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = [];
    tourTargetsRef.current = [target];
    tourIndexRef.current = 0;
    isTouringControlsRef.current = true;
    setIsFormGuiding(false);
    isFormGuidingRef.current = false;
    setIsTouringControls(true);
    setIsVoiceMode(true);
    onGuidingChange?.(true);
    updateGuideTarget(target);
    return { status: 'ok', highlighted: ranked[0].label, message: 'Robô posicionado acima do elemento e destaque visual aplicado.' };
  };

  const resolveCanvasAgent = async (toolName: string): Promise<CanvasAgentApi> => {
    const startedAt = Date.now();
    const initialRoute = window.location.pathname;
    let api = getCanvasAgent?.() ?? null;
    console.info('[Gemini Live][Canvas] API resolution started.', {
      tool: toolName,
      route: initialRoute,
      apiAvailable: Boolean(api),
    });
    if (!api) {
      if (!onNavigateToModule) {
        console.error('[Gemini Live][Canvas] Navigation callback is unavailable.', { tool: toolName, route: initialRoute });
        throw new Error('A navegação para o Canvas não está disponível nesta sessão.');
      }
      console.info('[Gemini Live][Canvas] Requesting navigation to Projetos.', { tool: toolName, route: initialRoute });
      onNavigateToModule('projetos');
      for (let attempt = 1; attempt <= 40; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        api = getCanvasAgent?.() ?? null;
        if (api) {
          console.info('[Gemini Live][Canvas] Editor API became available.', {
            tool: toolName,
            attempts: attempt,
            elapsedMs: Date.now() - startedAt,
            route: window.location.pathname,
          });
          break;
        }
        if (attempt % 10 === 0) {
          console.info('[Gemini Live][Canvas] Waiting for editor registration.', {
            tool: toolName,
            attempts: attempt,
            elapsedMs: Date.now() - startedAt,
            route: window.location.pathname,
            canvasElements: document.querySelectorAll('canvas').length,
          });
        }
      }
    }
    if (!api) {
      const diagnostics = {
        tool: toolName,
        elapsedMs: Date.now() - startedAt,
        initialRoute,
        currentRoute: window.location.pathname,
        canvasElements: document.querySelectorAll('canvas').length,
        mainPresent: Boolean(document.querySelector('main')),
      };
      console.error('[Gemini Live][Canvas] Editor API registration timed out.', diagnostics);
      throw new Error('O editor de Projetos não registrou a API do Canvas após 4 segundos. Diagnóstico: rota ' + diagnostics.currentRoute + ', elementos canvas encontrados: ' + diagnostics.canvasElements + '. Consulte os logs [Gemini Live][Canvas].');
    }
    return api;
  };

  const executeLiveToolCalls = async (
    calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
    socket: WebSocket
  ) => {
    livePendingToolCallsRef.current += 1;
    setConnectionStatus('working');
    console.info('[Gemini Live] Tool call received.', { calls: calls.map((call) => call.name) });
    try {
    const functionResponses = await Promise.all(calls.map(async (call) => {
      const args = call.args ?? {};
      let stage = 'dispatch';
      try {
        let result: Record<string, unknown>;
        if (call.name === 'get_current_screen_controls') {
          const controls = getVisibleScreenControls();
          const calculator = document.querySelector<HTMLElement>('[data-calculator-form]');
          const activeForm = document.querySelector<HTMLElement>('[data-agent-form]');
          const screenTitle = document.querySelector<HTMLElement>('main h1, main h2')?.textContent?.trim() ?? '';
          result = { status: 'ok', route: window.location.pathname, screenTitle, calculatorId: calculator?.dataset.calculatorId ?? null, activeForm: activeForm?.dataset.agentForm ?? null, activeFormId: activeForm?.dataset.agentFormId ?? null, count: controls.length, controls };
        } else if (call.name === 'open_calculator') {
          const calculatorId = args.calculatorId;
          if (typeof calculatorId !== 'string' || !/^[a-z0-9_]{1,80}$/i.test(calculatorId)) {
            throw new Error('Informe um identificador válido de calculadora.');
          }
          if (!onNavigateToModule) throw new Error('A navegação para calculadoras não está disponível.');
          onNavigateToModule('calculadoras', calculatorId);
          let calculatorRoot: HTMLElement | null = null;
          for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
            calculatorRoot = Array.from(document.querySelectorAll<HTMLElement>('[data-calculator-form]'))
              .find((node) => node.dataset.calculatorId === calculatorId && node.getClientRects().length > 0) ?? null;
            if (calculatorRoot) break;
          }
          if (!calculatorRoot) throw new Error('A calculadora solicitada não foi encontrada no catálogo atual.');
          result = { status: 'ok', calculatorId, message: 'Calculadora aberta. Consulte os campos disponíveis antes de preenchê-los.' };
        } else if (call.name === 'fill_calculator_fields') {
          const calculatorId = args.calculatorId;
          if (typeof calculatorId === 'string' && calculatorId.trim()) {
            if (!/^[a-z0-9_]{1,80}$/i.test(calculatorId)) throw new Error('Informe um identificador válido de calculadora.');
            if (!onNavigateToModule) throw new Error('A navegação para calculadoras não está disponível.');
            onNavigateToModule('calculadoras', calculatorId);
          } else if (!window.location.pathname.startsWith('/calculadoras')) {
            if (!onNavigateToModule) throw new Error('A navegação para calculadoras não está disponível.');
            onNavigateToModule('calculadoras');
          }
          let calculatorRoot: HTMLElement | null = null;
          for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
            calculatorRoot = document.querySelector<HTMLElement>('[data-calculator-form]');
            if (calculatorRoot?.getClientRects().length && (!calculatorId || calculatorRoot.dataset.calculatorId === calculatorId)) break;
            calculatorRoot = null;
          }
          if (!calculatorRoot) throw new Error('A calculadora ainda não abriu ou o ID não corresponde à calculadora exibida.');
          const fillResult = await fillCalculatorFields(args.fields, args.submit === true);
          result = fillResult;
        } else if (call.name === 'open_contract_template') {
          const modelId = args.modelId;
          if (typeof modelId !== 'string' || !contractModels.some((model) => model.id === modelId)) throw new Error('O modelo solicitado não existe no catálogo de contratos. Use search_contract_templates para consultar os IDs disponíveis.');
          if (!onNavigateToModule) throw new Error('A navegação para contratos não está disponível.');
          onNavigateToModule('contratos', modelId);
          let contractForm: HTMLElement | null = null;
          for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
            contractForm = document.querySelector<HTMLElement>('[data-agent-form="contract-editor"]');
            if (contractForm?.dataset.agentFormId === modelId && contractForm.getClientRects().length) break;
            contractForm = null;
          }
          if (!contractForm) throw new Error('O modelo foi selecionado, mas o formulário ainda não ficou disponível. Consulte a tela e tente novamente.');
          const model = contractModels.find((item) => item.id === modelId)!;
          result = { status: 'ok', modelId, title: model.title, requiredFields: model.fields.filter((field) => field.required).map((field) => ({ key: field.key, label: field.label })), message: 'Modelo aberto. Consulte os controles antes de preencher.' };
        } else if (call.name === 'fill_contract_fields') {
          if (!window.location.pathname.startsWith('/contratos')) {
            if (!onNavigateToModule) throw new Error('A navegação para contratos não está disponível.');
            onNavigateToModule('contratos');
          }
          let contractForm: HTMLElement | null = null;
          for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
            contractForm = document.querySelector<HTMLElement>('[data-agent-form="contract-editor"]');
            if (contractForm?.getClientRects().length) break;
            contractForm = null;
          }
          if (!contractForm) throw new Error('O formulário de dados do contrato não está aberto. Selecione um modelo e tente novamente.');
          result = fillContractFields(args.fields);
        } else if (call.name === 'search_contract_templates') {
          const query = args.query;
          if (typeof query !== 'string' || query.trim().length < 2) throw new Error('Informe ao menos dois caracteres para pesquisar modelos de contrato.');
          const normalized = normalizeUiLabel(query);
          const matches = contractModels.filter((model) => normalizeUiLabel(model.title + ' ' + model.description + ' ' + model.regime + ' ' + model.category).includes(normalized)).slice(0, 8);
          result = { status: matches.length ? 'ok' : 'no_results', count: matches.length, templates: matches.map((model) => ({ id: model.id, title: model.title, category: model.category, regime: model.regime, description: model.description, requiredFields: model.fields.filter((field) => field.required).map((field) => ({ key: field.key, label: field.label })) })) };

        } else if (call.name === 'get_canvas_overview') {
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-get-overview';
          result = api.getOverview();
          console.info('[Gemini Live][Canvas] Overview completed.', { tool: call.name, status: result.status, route: window.location.pathname });
        } else if (call.name === 'select_canvas_level') {
          const id = args.id;
          if (typeof id !== 'string') throw new Error('Informe o ID exato do pavimento retornado por get_canvas_overview.');
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-select-level';
          result = api.selectLevel(id);
          console.info('[Gemini Live][Canvas] Level selection completed.', { tool: call.name, levelId: id, status: result.status });
        } else if (call.name === 'select_canvas_element') {
          const kind = args.kind, id = args.id;
          if (typeof kind !== 'string' || !['wall', 'opening', 'electrical', 'hydraulic', 'furniture'].includes(kind) || typeof id !== 'string') throw new Error('Informe o tipo e o ID exato do elemento retornado por get_canvas_overview.');
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-select-element';
          result = api.selectElement(kind as CanvasAgentKind, id);
          console.info('[Gemini Live][Canvas] Element selection completed.', { tool: call.name, kind, elementId: id, status: result.status });
          try { highlightUiElement('Planta 2D'); } catch { /* The object selection remains highlighted on the canvas. */ }
        } else if (call.name === 'add_canvas_element') {
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-add-element';
          result = api.addElement(args);
          console.info('[Gemini Live][Canvas] Element creation completed.', { tool: call.name, kind: args.kind, status: result.status });
        } else if (call.name === 'move_canvas_element') {
          const kind = args.kind, id = args.id, x = args.x, y = args.y;
          if (typeof kind !== 'string' || !['wall', 'opening', 'electrical', 'hydraulic', 'furniture'].includes(kind) || typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') throw new Error('Informe kind, ID, x e y numéricos do elemento.');
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-move-element';
          result = api.moveElement(kind as CanvasAgentKind, id, x, y);
          console.info('[Gemini Live][Canvas] Element move completed.', { tool: call.name, kind, elementId: id, status: result.status });
        } else if (call.name === 'delete_canvas_element') {
          const kind = args.kind, id = args.id, confirmed = args.confirmed;
          if (typeof kind !== 'string' || !['wall', 'opening', 'electrical', 'hydraulic', 'furniture'].includes(kind) || typeof id !== 'string' || typeof confirmed !== 'boolean') throw new Error('Informe kind, ID e confirmed booleano.');
          stage = 'canvas-api-resolution';
          const api = await resolveCanvasAgent(call.name);
          stage = 'canvas-delete-element';
          result = api.deleteElement(kind as CanvasAgentKind, id, confirmed);
          console.info('[Gemini Live][Canvas] Element deletion completed.', { tool: call.name, kind, elementId: id, status: result.status });
        } else if (call.name === 'get_project_overview') {
          if (!getProjectOverview) throw new Error('O resumo dos projetos não está disponível nesta sessão.');
          const projects = getProjectOverview();
          result = { status: projects.length ? 'ok' : 'no_results', count: projects.length, projects: projects.slice(0, 20) };
        } else if (call.name === 'highlight_ui_element') {
          const target = args.target;
          if (typeof target !== 'string') throw new Error('Informe o nome visível do elemento que deseja destacar.');
          result = highlightUiElement(target);
        } else if (call.name === 'clear_ui_highlight') {
          cancelFormGuide();
          result = { status: 'ok', message: 'Destaque removido e robô recolhido.' };
        } else if (call.name === 'get_recent_calculations') {
          const requestedLimit = typeof args.limit === 'number' ? args.limit : 10;
          const rows = await loadRecentCalculations(requestedLimit);
          result = {
            status: rows.length > 0 ? 'ok' : 'no_results',
            retryable: false,
            count: rows.length,
            calculations: rows.map((row) => ({
              id: row.id,
              title: row.title,
              category: row.category,
              result: row.result_value,
              unit: row.result_unit ?? '',
              formula: row.formula ?? '',
              createdAt: row.created_at,
            })),
          };
        } else if (call.name === 'get_upcoming_deadlines') {
          const requestedLimit = typeof args.limit === 'number' ? args.limit : 10;
          const rows = await loadUpcomingDeadlines(requestedLimit);
          result = {
            status: rows.length > 0 ? 'ok' : 'no_results',
            retryable: false,
            count: rows.length,
            deadlines: rows,
          };
        } else if (call.name === 'search_library') {
          const query = args.query;
          if (typeof query !== 'string' || query.trim().length < 2) throw new Error('Informe um termo com pelo menos dois caracteres.');
          const rows = await searchLibraryItems(query);
          result = {
            status: rows.length > 0 ? 'ok' : 'no_results',
            retryable: false,
            count: rows.length,
            items: rows,
          };
        } else if (call.name === 'get_user_favorites') {
          const requestedLimit = typeof args.limit === 'number' ? args.limit : 30;
          const rows = await loadCurrentUserFavorites(requestedLimit);
          result = {
            status: rows.length > 0 ? 'ok' : 'no_results',
            retryable: false,
            message: rows.length > 0 ? 'Favoritos carregados da conta autenticada.' : 'A conta não possui favoritos salvos.',
            count: rows.length,
            favorites: rows.map((row) => ({
              id: row.item_id,
              type: row.item_type,
              title: row.title,
              subtitle: row.subtitle ?? '',
              module: row.module_id,
              addedAt: row.created_at,
            })),
          };
        } else if (call.name === 'navigate_to_section') {
          const section = args.section;
          if (typeof section !== 'string') throw new Error('A seção solicitada é inválida.');
          const normalizedSection = section === 'fav' ? 'favoritos' : section === 'home' ? 'inicio' : section;
          const mainSections = ['inicio', 'biblioteca', 'favoritos', 'mais'];
          const moduleSections = ['calculadoras', 'manuais', 'projetos', 'ia', 'estetica', 'legislacao', 'contratos'];
          if (mainSections.includes(normalizedSection)) {
            if (!onNavigateToSection) throw new Error('A navegação principal não está disponível.');
            onNavigateToSection(normalizedSection as 'inicio' | 'biblioteca' | 'favoritos' | 'mais');
          } else if (moduleSections.includes(section)) {
            if (!onNavigateToModule) throw new Error('A navegação dos módulos não está disponível.');
            onNavigateToModule(section as ModuleId);
          } else {
            throw new Error('Esta seção não está disponível para navegação pelo assistente.');
          }
          result = { status: 'ok', retryable: false, message: 'Navegação concluída.', section };
        } else if (call.name === 'open_favorite') {
          const itemId = args.itemId;
          if (typeof itemId !== 'string' || !itemId.trim()) throw new Error('Informe o identificador do favorito.');
          const rows = await loadCurrentUserFavorites(30);
          const favorite = rows.find((row) => row.item_id === itemId);
          if (!favorite) throw new Error('Esse item não está nos seus favoritos.');
          const moduleId = favorite.module_id;
          if (typeof moduleId !== 'string' || !['calculadoras', 'manuais', 'projetos', 'ia', 'estetica', 'legislacao', 'contratos'].includes(moduleId)) {
            throw new Error('Não foi possível identificar a seção deste favorito.');
          }
          if (!onNavigateToModule) throw new Error('A abertura de módulos não está disponível.');
          onNavigateToModule(moduleId as ModuleId, favorite.item_id);
          result = { status: 'ok', retryable: false, message: 'Favorito aberto com sucesso.', title: favorite.title, module: moduleId, itemId: favorite.item_id };
        } else {
          throw new Error('Ferramenta não reconhecida.');
        }
        return { id: call.id, name: call.name, response: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao executar a ferramenta.';
        console.error('[Gemini Live][Tool] Execution failed.', {
          tool: call.name,
          stage,
          route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: message,
          canvasApiAvailable: call.name.includes('canvas_') || call.name === 'get_canvas_overview' ? Boolean(getCanvasAgent?.()) : undefined,
        });
        return {
          id: call.id,
          name: call.name,
          response: { status: 'error', retryable: false, message },
        };
      }
    }));

    if (socket.readyState === WebSocket.OPEN && liveSessionRef.current === socket) {
      console.info('[Gemini Live] Returning tool responses.', { count: functionResponses.length, names: functionResponses.map((item) => item.name) });
      socket.send(JSON.stringify({ toolResponse: { functionResponses } }));
      setConnectionStatus('thinking');
    }
    } finally {
      livePendingToolCallsRef.current = Math.max(0, livePendingToolCallsRef.current - 1);
    }
  };

  const stopGeminiLive = () => {
    liveShouldStopRef.current = true;
    try { liveProcessorRef.current?.disconnect(); } catch {}
    liveProcessorRef.current = null;
    try { liveStreamRef.current?.getTracks().forEach((track) => track.stop()); } catch {}
    liveStreamRef.current = null;
    for (const source of livePlaybackSourcesRef.current) {
      try { source.stop(); } catch {}
    }
    livePlaybackSourcesRef.current = [];
    try { liveSessionRef.current?.close(); } catch {}
    liveSessionRef.current = null;
    const audioContexts = [liveAudioContextRef.current, liveOutputAudioContextRef.current];
    liveAudioContextRef.current = null;
    liveOutputAudioContextRef.current = null;
    for (const audioContext of audioContexts) {
      if (audioContext && audioContext.state !== 'closed') void audioContext.close().catch(() => {});
    }
    liveTurnRef.current = null;
    livePlaybackTimeRef.current = 0;
    liveOutputCompleteRef.current = false;
    liveInteractionInProgressRef.current = false;
    livePendingToolCallsRef.current = 0;
    setIsListening(false);
    setIsGenerating(false);
    isMicrophoneMutedRef.current = false;
    setIsMicrophoneMuted(false);
    setConnectionStatus('idle');
  };

  const encodePcm16 = (samples: Float32Array): string => {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    }
    return btoa(binary);
  };

  const resampleAudio = (input: Float32Array, inputRate: number, outputRate: number): Float32Array => {
    if (inputRate === outputRate) return input;
    const ratio = inputRate / outputRate;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i += 1) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, input.length - 1);
      const fraction = position - left;
      output[i] = input[left] * (1 - fraction) + input[right] * fraction;
    }
    return output;
  };

  const appendLiveTranscript = (sender: 'user' | 'gemini', text: string) => {
    if (!text) return;
    if (!liveTurnRef.current) {
      liveTurnRef.current = {
        userId: 'live-u-' + Date.now(),
        assistantId: 'live-g-' + Date.now(),
        userText: '',
        assistantText: '',
      };
    }
    const turn = liveTurnRef.current;
    if (sender === 'user') turn.userText += text;
    else turn.assistantText += text;
    const id = sender === 'user' ? turn.userId : turn.assistantId;
    const value = sender === 'user' ? turn.userText : turn.assistantText;
    setMessages((previous) => {
      const existing = previous.some((message) => message.id === id);
      const message: ChatMessage = {
        id,
        sender,
        text: value,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelBadge: sender === 'gemini' ? 'Gemini Live' : undefined,
      };
      return existing ? previous.map((item) => item.id === id ? message : item) : [...previous, message];
    });
  };

  const playLiveAudio = (base64Audio: string, mimeType?: string) => {
    const audioContext = liveOutputAudioContextRef.current;
    if (!audioContext || audioContext.state === 'closed' || !base64Audio) return;
    const sampleRate = Number(mimeType?.match(/rate=(\d+)/i)?.[1] || 24000);
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const audioBuffer = audioContext.createBuffer(1, pcm.length, sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i] / 32768;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    const startAt = Math.max(audioContext.currentTime + 0.025, livePlaybackTimeRef.current);
    source.start(startAt);
    livePlaybackTimeRef.current = startAt + audioBuffer.duration;
    livePlaybackSourcesRef.current.push(source);
    source.onended = () => {
      livePlaybackSourcesRef.current = livePlaybackSourcesRef.current.filter((item) => item !== source);
      if (liveOutputCompleteRef.current && livePlaybackSourcesRef.current.length === 0) {
        setConnectionStatus(liveInteractionInProgressRef.current ? 'thinking' : 'listening');
      }
    };
  };

  const startGeminiLiveCapture = async () => {
    if (liveSessionRef.current || isGenerating) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setConnectionStatus('error');
      setMessages((previous) => [...previous, {
        id: 'live-error-' + Date.now(), sender: 'gemini',
        text: 'Este navegador não disponibiliza captura de áudio. Abra o OBra ENGEP em uma conexão HTTPS e permita o microfone.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Gemini Live',
      }]);
      return;
    }

    liveShouldStopRef.current = false;
    setIsGenerating(true);
    setConnectionStatus('thinking');

    let microphone: MediaStream | null = null;
    let socket: WebSocket | null = null;
    try {
      // Create/resume both contexts synchronously from the click gesture.
      const inputAudioContext = new AudioContext({ sampleRate: 16000 });
      const outputAudioContext = new AudioContext({ sampleRate: 24000 });
      liveAudioContextRef.current = inputAudioContext;
      liveOutputAudioContextRef.current = outputAudioContext;
      await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);

      const accessToken = await getSupabaseAccessToken();
      if (liveShouldStopRef.current) return;

      microphone = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      liveStreamRef.current = microphone;
      microphone.getAudioTracks().forEach((track) => { track.enabled = !isMicrophoneMutedRef.current; });
      console.info('[Gemini Live][Audio] Microphone stream acquired.', { trackCount: microphone.getAudioTracks().length, muted: isMicrophoneMutedRef.current });
      if (liveShouldStopRef.current) {
        microphone.getTracks().forEach((track) => track.stop());
        if (liveStreamRef.current === microphone) liveStreamRef.current = null;
        return;
      }

      const tokenResponse = await fetch('/api/gemini/live-token', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store',
      });
      if (liveShouldStopRef.current) return;
      if (!tokenResponse.ok) {
        let detail = '';
        try {
          const body = await tokenResponse.json() as { error?: string };
          detail = body.error || '';
        } catch {}
        throw new Error(detail || 'Não foi possível preparar o Gemini Live (HTTP ' + tokenResponse.status + ').');
      }
      const tokenPayload = await tokenResponse.json() as {
        token?: string;
        model?: string;
        wsBaseUrl?: string;
      };
      if (!tokenPayload.token || !tokenPayload.model || !tokenPayload.wsBaseUrl) {
        throw new Error('O servidor não retornou todos os dados necessários para abrir a sessão Gemini Live.');
      }

      const socketUrl = tokenPayload.wsBaseUrl + '?access_token=' + encodeURIComponent(tokenPayload.token);
      console.info('[Gemini Live] Opening WebSocket session.', { model: tokenPayload.model });
      socket = new WebSocket(socketUrl);
      liveSessionRef.current = socket;

      const liveConfig = {
        generationConfig: {
          responseModalities: ['AUDIO'],
          thinkingConfig: { thinkingLevel: 'low' },
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [{
            text: 'Você é o Assistente Técnico do OBra ENGEP. Detecte automaticamente o idioma falado pelo usuário e responda sempre nesse mesmo idioma; não force português, não mude para espanhol ou outro idioma sem que o usuário o use e acompanhe imediatamente qualquer mudança de idioma. Use rigor técnico e linguagem de campo. Cite normas aplicáveis sem reproduzir textos protegidos, explique premissas e limitações e não invente valores normativos. Em situações de risco, priorize desenergização, LOTO, AR/PT e EPI/EPC. Você é o agente operacional por voz do OBra ENGEP. Além de conversar, pode inspecionar a tela, abrir calculadoras, preencher campos e destacar elementos da interface com o robô flutuante. Para consultar favoritos use get_user_favorites; cálculos recentes use get_recent_calculations; prazos use get_upcoming_deadlines; biblioteca use search_library. Para navegação use navigate_to_section ou open_favorite. Para trabalhar com calculadoras: primeiro use open_calculator quando precisar selecionar uma calculadora; use get_current_screen_controls para descobrir os rótulos visíveis dos campos; use fill_calculator_fields com pares label/value exatos; só envie submit=true quando o usuário tiver pedido para calcular. Para contratos: use search_contract_templates para localizar um modelo; depois use open_contract_template com o ID retornado para abrir o formulário correspondente; use get_current_screen_controls para conferir os rótulos e chaves e fill_contract_fields para preencher somente os valores informados. Essa ferramenta nunca gera nem salva o documento; aguarde pedido explícito e use a ação apropriada da interface. Para projetos, use get_project_overview antes de responder sobre os projetos salvos e não invente detalhes da planta. Para editar plantas, use get_canvas_overview para identificar o projeto, pavimentos e IDs reais; use select_canvas_level para trocar o pavimento em edição e select_canvas_element para selecionar/destacar um objeto; add_canvas_element e move_canvas_element somente após pedido explícito do usuário; para rotas e tubulações, informe os dois pontos inicial/final. Coordenadas são pixels do Canvas, portanto confirme referências/posições com o usuário quando não estiverem claras. Antes de excluir qualquer objeto, explique o impacto e peça confirmação explícita; só então chame delete_canvas_element com confirmed=true. Não exclua paredes por voz, pois podem sustentar junções, aberturas e cômodos. Após cada alteração, confirme somente o resultado retornado pela ferramenta. Não invente valores ausentes: pergunte ao usuário antes de preencher um campo que dependa de informação não fornecida. Para apontar um controle, use highlight_ui_element com o texto visível/aria-label e explique o que ele faz; o robô se posicionará acima do alvo e o destacará. Use clear_ui_highlight quando terminar. Nunca diga que preencheu, calculou, abriu ou destacou sem receber sucesso da ferramenta. O preenchimento altera somente os campos indicados; não salva, envia, exclui ou confirma operações externas sem autorização explícita. Não repita uma ferramenta após erro ou ausência de resultados e não faça mais de duas chamadas consecutivas sem informar o usuário.',
          }],
        },
        tools: [{
          functionDeclarations: [
            {
              name: 'get_current_screen_controls',
              description: 'Inspeciona os campos e controles visíveis da tela atual. Use antes de preencher calculadoras ou destacar um controle quando não souber o rótulo exato.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'open_calculator',
              description: 'Abre uma calculadora específica no módulo de calculadoras. Use IDs como potencia_corrente, lei_ohm, dimensionamento_cabos, reservatorio, vazao_pressao, perda_carga, diametro_tubo, concreto_materiais, calculadora_telhado, alvenaria_blocos e calculadora_combustivel.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: { calculatorId: { type: 'STRING', description: 'ID da calculadora solicitada.' } },
                required: ['calculatorId'],
              },
            },
            {
              name: 'fill_calculator_fields',
              description: 'Preenche campos visíveis da calculadora aberta usando os rótulos reais da interface. Informe pares label/value. Não invente valores. submit deve ser true somente quando o usuário pedir para executar o cálculo.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: {
                  calculatorId: { type: 'STRING', description: 'ID opcional da calculadora a abrir antes de preencher.' },
                  fields: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        label: { type: 'STRING', description: 'Rótulo visível exato do campo.' },
                        value: { type: 'STRING', description: 'Valor do campo em texto. Envie números como texto decimal e caixas de seleção como true ou false.' },
                      },
                      required: ['label', 'value'],
                    },
                  },
                  submit: { type: 'BOOLEAN', description: 'Executar o cálculo após preencher. Use true somente quando solicitado.' },
                },
                required: ['fields'],
              },
            },
            {
              name: 'open_contract_template',
              description: 'Abre um modelo específico do catálogo de contratos pelo ID retornado por search_contract_templates e leva diretamente ao formulário de dados.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: { modelId: { type: 'STRING', description: 'ID exato do modelo retornado pela pesquisa.' } }, required: ['modelId'] },
            },
            {
              name: 'fill_contract_fields',
              description: 'Preenche os campos visíveis do formulário de um modelo de contrato selecionado. Aceita a chave exata do campo (por exemplo, contratante, objeto, valor) ou o rótulo visível. Nunca gera nem salva o documento.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: { fields: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, value: { type: 'STRING' } }, required: ['label', 'value'] } } }, required: ['fields'] },
            },
            {
              name: 'search_contract_templates',
              description: 'Pesquisa o catálogo real de modelos de contratos disponíveis no OBra ENGEP e retorna IDs, regimes e campos obrigatórios.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Tipo de contrato, atividade, regime ou termo de pesquisa.' } }, required: ['query'] },
            },

            {
              name: 'get_canvas_overview',
              description: 'Abre o módulo Projetos se necessário e consulta o projeto e pavimento ativos do Canvas, incluindo elementos com IDs, tipos, coordenadas e contagens.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'select_canvas_level',
              description: 'Troca o pavimento em edição pelo ID exato retornado por get_canvas_overview, preservando os dados dos demais pisos.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' } }, required: ['id'] },
            },
            {
              name: 'select_canvas_element',
              description: 'Seleciona e destaca um elemento existente no Canvas 2D pelo tipo e ID exato retornado por get_canvas_overview. O painel de propriedades fica disponível para inspeção.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: { kind: { type: 'STRING', enum: ['wall', 'opening', 'electrical', 'hydraulic', 'furniture'] }, id: { type: 'STRING' } }, required: ['kind', 'id'] },
            },
            {
              name: 'add_canvas_element',
              description: 'Adiciona um elemento real ao pavimento ativo. Para parede use kind=wall e x1,y1,x2,y2; para abertura use kind=opening, type door/window, wallId, x,y; para pontos elétricos/hidráulicos informe kind, type, x,y; para rotas elétricas wire/conduit ou tubulações water_pipe/sewage_pipe/vent_pipe/rain_pipe informe também x2,y2; para mobiliário informe kind=furniture, catalogId, x,y. Use somente quando o usuário pedir explicitamente a alteração.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {
                kind: { type: 'STRING', enum: ['wall', 'opening', 'electrical', 'hydraulic', 'furniture'] },
                type: { type: 'STRING' }, catalogId: { type: 'STRING' }, wallId: { type: 'STRING' },
                x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, x1: { type: 'NUMBER' }, y1: { type: 'NUMBER' },
                x2: { type: 'NUMBER' }, y2: { type: 'NUMBER' }, width: { type: 'NUMBER' }, thickness: { type: 'NUMBER' },
                diameterMm: { type: 'NUMBER' }, circuit: { type: 'STRING' }, label: { type: 'STRING' },
              }, required: ['kind'] },
            },
            {
              name: 'move_canvas_element',
              description: 'Move um elemento existente para as coordenadas x,y em pixels da planta. Aberturas permanecem anexadas à parede; rotas elétricas/hidráulicas preservam seu comprimento. Paredes inteiras não podem ser movidas por voz devido às junções e cômodos conectados.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {
                kind: { type: 'STRING', enum: ['wall', 'opening', 'electrical', 'hydraulic', 'furniture'] },
                id: { type: 'STRING' }, x: { type: 'NUMBER' }, y: { type: 'NUMBER' },
              }, required: ['kind', 'id', 'x', 'y'] },
            },
            {
              name: 'delete_canvas_element',
              description: 'Exclui uma abertura, componente elétrico/hidráulico ou móvel do pavimento ativo. Exige confirmed=true somente depois de o usuário confirmar explicitamente a exclusão. Paredes não podem ser excluídas por voz para preservar a topologia.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {
                kind: { type: 'STRING', enum: ['wall', 'opening', 'electrical', 'hydraulic', 'furniture'] },
                id: { type: 'STRING' }, confirmed: { type: 'BOOLEAN' },
              }, required: ['kind', 'id', 'confirmed'] },
            },
            {
              name: 'get_project_overview',
              description: 'Consulta os projetos reais já carregados na área de projetos, retornando nome, tipo, etapa, atualização e contagem resumida dos elementos da planta.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'highlight_ui_element',
              description: 'Move o robô flutuante para cima de um botão, campo, aba ou seção visível e aplica destaque visual no elemento. Use o rótulo visível ou aria-label.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: { target: { type: 'STRING', description: 'Texto visível ou rótulo acessível do elemento a destacar.' } },
                required: ['target'],
              },
            },
            {
              name: 'clear_ui_highlight',
              description: 'Remove o destaque visual e encerra a orientação flutuante do robô.',
              behavior: 'NON_BLOCKING',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'get_recent_calculations',
              description: 'Consulta os cálculos mais recentes salvos no histórico da conta autenticada. Use quando o usuário perguntar sobre seus cálculos recentes.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: { limit: { type: 'INTEGER', description: 'Quantidade máxima de resultados, entre 1 e 20.' } },
              },
            },
            {
              name: 'get_upcoming_deadlines',
              description: 'Consulta prazos e tarefas ainda não concluídos da conta autenticada.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: { limit: { type: 'INTEGER', description: 'Quantidade máxima de resultados, entre 1 e 20.' } },
              },
            },
            {
              name: 'search_library',
              description: 'Pesquisa títulos da biblioteca técnica do OBra ENGEP, incluindo normas, NRs, legislação e manuais.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: { query: { type: 'STRING', description: 'Termo técnico ou título a pesquisar.' } },
                required: ['query'],
              },
            },
            {
              name: 'get_user_favorites',
              description: 'Consulta os favoritos reais da conta Google autenticada. Use antes de responder perguntas sobre quais itens estão salvos.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: {
                  limit: { type: 'INTEGER', description: 'Quantidade máxima de favoritos a retornar, entre 1 e 30.' },
                },
              },
            },
            {
              name: 'navigate_to_section',
              description: 'Navega para uma seção ou módulo existente do aplicativo OBra ENGEP.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: {
                  section: {
                    type: 'STRING',
                    enum: ['inicio', 'home', 'biblioteca', 'favoritos', 'fav', 'mais', 'calculadoras', 'manuais', 'projetos', 'ia', 'estetica', 'legislacao', 'contratos'],
                    description: 'Identificador da seção de destino.',
                  },
                },
                required: ['section'],
              },
            },
            {
              name: 'open_favorite',
              description: 'Abre um item que foi retornado pela ferramenta get_user_favorites.',
              behavior: 'NON_BLOCKING',
              parameters: {
                type: 'OBJECT',
                properties: {
                  itemId: { type: 'STRING', description: 'ID exato do item favorito retornado anteriormente.' },
                },
                required: ['itemId'],
              },
            },
          ],
        }],
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            silenceDurationMs: 2000,
            prefixPaddingMs: 500,
            endOfSpeechSensitivity: 'END_SENSITIVITY_UNSPECIFIED',
            startOfSpeechSensitivity: 'START_SENSITIVITY_UNSPECIFIED',
          },
          activityHandling: 'ACTIVITY_HANDLING_UNSPECIFIED',
          turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
        },
      };

      await new Promise<void>((resolve, reject) => {
        let setupComplete = false;
        let settled = false;
        const setupTimeout = window.setTimeout(() => {
          if (!setupComplete && !settled) {
            settled = true;
            socket?.close();
            reject(new Error('Tempo limite excedido aguardando setupComplete do Gemini Live.'));
          }
        }, 20_000);

        socket!.onopen = () => {
          setConnectionStatus('thinking');
          socket!.send(JSON.stringify({
            setup: {
              model: tokenPayload.model,
              ...liveConfig,
            },
          }));
          console.info('[Gemini Live] WebSocket open; setup sent.');
        };

        socket!.onmessage = async (event) => {
          if (liveSessionRef.current !== socket) return;
          try {
            let rawData: string;
            if (typeof event.data === 'string') {
              rawData = event.data;
            } else if (event.data instanceof Blob) {
              rawData = await event.data.text();
            } else if (event.data instanceof ArrayBuffer) {
              rawData = new TextDecoder().decode(event.data);
            } else {
              return;
            }

            const message = JSON.parse(rawData);
            if (message.error) {
              const detail = message.error.message || message.error.code || 'Erro não especificado pelo Gemini Live.';
              console.error('[Gemini Live] Server rejected the session:', detail);
              if (!setupComplete && !settled) {
                settled = true;
                window.clearTimeout(setupTimeout);
                reject(new Error(detail));
              } else if (!liveShouldStopRef.current) {
                stopGeminiLive();
                setConnectionStatus('error');
                setMessages((previous) => [...previous, {
                  id: 'live-error-' + Date.now(), sender: 'gemini',
                  text: 'O Gemini Live encerrou a sessão com um erro: ' + detail,
                  timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  modelBadge: 'Gemini Live',
                }]);
              }
              return;
            }

            if (message.setupComplete && !setupComplete) {
              setupComplete = true;
              settled = true;
              window.clearTimeout(setupTimeout);
              console.info('[Gemini Live] Session setup completed.');
              resolve();
            }

            if (Array.isArray(message.toolCall?.functionCalls) && message.toolCall.functionCalls.length > 0) {
              void executeLiveToolCalls(message.toolCall.functionCalls, socket!);
            }

            const content = message.serverContent;
            const interactionStatus = message.interactionStatus ?? content?.interactionStatus;
            if (content) {
            if (content.inputTranscription?.text) {
              liveOutputCompleteRef.current = false;
              appendLiveTranscript('user', content.inputTranscription.text);
            }
            if (content.outputTranscription?.text) {
              appendLiveTranscript('gemini', content.outputTranscription.text);
            }

            const parts = content.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                liveOutputCompleteRef.current = false;
                setConnectionStatus('speaking');
                playLiveAudio(part.inlineData.data, part.inlineData.mimeType);
              } else if (part.text && !content.outputTranscription?.text) {
                appendLiveTranscript('gemini', part.text);
              }
            }

            if (content.interrupted) {
              liveInteractionInProgressRef.current = false;
              liveTurnRef.current = null;
              livePlaybackTimeRef.current = outputAudioContext.currentTime;
              for (const playbackSource of livePlaybackSourcesRef.current) {
                try { playbackSource.stop(); } catch {}
              }
              livePlaybackSourcesRef.current = [];
              liveOutputCompleteRef.current = false;
              setConnectionStatus('listening');
            } else if (content.turnComplete) {
              liveOutputCompleteRef.current = true;
              if (interactionStatus !== 'IN_PROGRESS') {
                liveInteractionInProgressRef.current = false;
                liveTurnRef.current = null;
              }
              if (livePlaybackSourcesRef.current.length === 0) {
                setConnectionStatus(liveInteractionInProgressRef.current ? 'thinking' : 'listening');
              }
            }

            }

            // Extended Thinking emits interactionStatus at the top level. A turnComplete
            // event is not necessarily the end of background reasoning or tool execution.
            if (interactionStatus === 'IN_PROGRESS') {
              liveInteractionInProgressRef.current = true;
              if (livePlaybackSourcesRef.current.length === 0) setConnectionStatus('thinking');
            } else if (interactionStatus === 'IDLE') {
              liveInteractionInProgressRef.current = false;
              liveTurnRef.current = null;
              if (livePlaybackSourcesRef.current.length === 0) setConnectionStatus('listening');
            }

          } catch (error) {
            console.warn('[Gemini Live] Could not decode WebSocket message:', error instanceof Error ? error.name : 'unknown');
          }
        };

        socket!.onerror = () => {
          if (!setupComplete && !settled) {
            settled = true;
            window.clearTimeout(setupTimeout);
            reject(new Error('Falha ao abrir o WebSocket com o Gemini Live.'));
          } else if (!liveShouldStopRef.current) {
            stopGeminiLive();
            setConnectionStatus('error');
            setMessages((previous) => [...previous, {
              id: 'live-error-' + Date.now(), sender: 'gemini',
              text: 'O navegador perdeu a conexão WebSocket com o Gemini Live.',
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              modelBadge: 'Gemini Live',
            }]);
          }
        };

        socket!.onclose = (event) => {
          if (liveShouldStopRef.current) return;
          const detail = 'O WebSocket do Gemini Live foi encerrado (código ' + event.code + (event.reason ? ', motivo: ' + event.reason : '') + ').';
          console.warn('[Gemini Live] Unexpected WebSocket close:', event.code, event.reason);
          if (!setupComplete) {
            if (!settled) {
              settled = true;
              window.clearTimeout(setupTimeout);
              reject(new Error(detail));
            }
            return;
          }
          stopGeminiLive();
          setConnectionStatus('error');
          setMessages((previous) => [...previous, {
            id: 'live-error-' + Date.now(), sender: 'gemini',
            text: detail,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            modelBadge: 'Gemini Live',
          }]);
        };
      });

      if (liveShouldStopRef.current) {
        socket.close();
        return;
      }
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error('A conexão Gemini Live foi encerrada antes de iniciar a captura do microfone.');
      }

      const source = inputAudioContext.createMediaStreamSource(microphone);
      const processor = inputAudioContext.createScriptProcessor(512, 1, 1);
      const muteOutput = inputAudioContext.createGain();
      muteOutput.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (liveShouldStopRef.current || liveSessionRef.current !== socket || livePendingToolCallsRef.current > 0) return;
        const input = event.inputBuffer.getChannelData(0);
        const pcm = resampleAudio(input, inputAudioContext.sampleRate, 16000);
        if (socket!.readyState === WebSocket.OPEN) {
          socket!.send(JSON.stringify({
            realtimeInput: {
              audio: { data: encodePcm16(pcm), mimeType: 'audio/pcm;rate=16000' },
            },
          }));
        }
      };
      source.connect(processor);
      processor.connect(muteOutput);
      muteOutput.connect(inputAudioContext.destination);
      liveProcessorRef.current = processor;
      setIsListening(true);
      setIsGenerating(false);
      setConnectionStatus('listening');
      console.info('[Gemini Live] Microphone streaming started at 16 kHz PCM.');
    } catch (error) {
      console.error('[Gemini Live] Session setup failed:', error instanceof Error ? error.message : 'unknown');
      stopGeminiLive();
      setConnectionStatus('error');
      setMessages((previous) => [...previous, {
        id: 'live-error-' + Date.now(), sender: 'gemini',
        text: error instanceof Error ? error.message : 'Não foi possível iniciar a sessão de voz.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Gemini Live',
      }]);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, connectionStatus, isOpen]);

  useEffect(() => {
    const state = !isOpen ? 'sleeping' : connectionStatus === 'speaking' || connectionStatus === 'thinking' || connectionStatus === 'error' ? connectionStatus : isListening ? 'listening' : connectionStatus;
    onStatusChange?.(state);
  }, [connectionStatus, isListening, isOpen, onStatusChange]);

  useEffect(() => {
    if (isOpen) return;
    stopGeminiLive();
    try { speechRecognitionRef.current?.stop(); } catch {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false);
    setIsVoiceMode(false);
    isFormGuidingRef.current = false;
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = [];
    setIsFormGuiding(false);
    isTouringControlsRef.current = false;
    setIsTouringControls(false);
    tourTargetsRef.current.forEach((target) => target.classList.remove('robot-guide-highlight'));
    tourTargetsRef.current = [];
    onGuidingChange?.(false);
    setGuideTargetRect(null);
    setConnectionStatus('idle');
    setIsVoiceMode(false);
  }, [isOpen, onGuidingChange]);

  useEffect(() => {
    if (!isOpen || (!isFormGuiding && !isTouringControls)) return;
    const updatePosition = () => {
      const target = isTouringControls
        ? tourTargetsRef.current[tourIndexRef.current]
        : guideFieldsRef.current[guideFieldIndexRef.current];
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setGuideTargetRect({ top: Math.max(12, rect.top - 82), left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 280)) });
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isFormGuiding, isTouringControls, guideFieldIndex]);

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
      utterance.lang = lastInputLanguageRef.current;
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
    lastInputLanguageRef.current = detectSpeechLanguage(
      prompt,
      typeof navigator !== 'undefined' ? navigator.language || 'pt-BR' : 'pt-BR'
    );

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
      const accessToken = await getSupabaseAccessToken();

      const response = await fetch('/api/gemini/realtime-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json() as { error?: unknown; message?: unknown };
          const candidate = typeof body.error === 'string' ? body.error : body.message;
          if (typeof candidate === 'string') detail = candidate;
        } catch {
          // Keep the HTTP status when the server does not return JSON.
        }
        throw new Error(detail
          ? `Falha na API (HTTP ${response.status}): ${detail}`
          : `Falha na API (HTTP ${response.status}).`);
      }
      if (!response.body) throw new Error('A API não iniciou o fluxo de resposta.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedThought = '';
      let accumulatedText = '';
      let streamError = '';
      let pending = '';

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'thought') {
            accumulatedThought += typeof data.text === 'string' ? data.text : '';
            setConnectionStatus('thinking');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === geminiMsgId ? { ...m, thought: accumulatedThought } : m
              )
            );
          } else if (data.type === 'text') {
            accumulatedText += typeof data.text === 'string' ? data.text : '';
            setConnectionStatus('speaking');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === geminiMsgId ? { ...m, text: accumulatedText } : m
              )
            );
          } else if (data.type === 'error') {
            streamError = typeof data.error === 'string' ? data.error : 'Falha ao processar a resposta do agente.';
          } else if (data.type === 'done') {
            setConnectionStatus('idle');
          }
        } catch {
          // Ignore malformed or non-data SSE lines; preserve the rest of the stream.
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        lines.forEach(processLine);
        if (done) break;
      }
      if (pending.trim()) processLine(pending);
      if (streamError) throw new Error(streamError);
      if (!accumulatedText.trim()) throw new Error('O agente encerrou a resposta sem retornar texto.');

      speakResponse(accumulatedText);
    } catch (err) {
      console.error('Erro na conversação em tempo real:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === geminiMsgId
            ? {
                ...m,
                text: m.text || (err instanceof Error
                  ? err.message.slice(0, 400)
                  : 'Não foi possível conectar ao agente. Tente novamente.'),
                thought: '',
              }
            : m
        )
      );
      setConnectionStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const getGuideFieldLabel = (field: HTMLElement, index: number) => {
    const labelList = (field as HTMLInputElement).labels;
    const explicit = field.getAttribute('aria-label') || labelList?.[0]?.textContent?.trim();
    const wrappingLabel = field.closest('label')?.textContent?.trim();
    return explicit || wrappingLabel || field.getAttribute('data-robot-label') || field.getAttribute('placeholder') || field.textContent?.trim() || (field as HTMLInputElement).name || `Campo ${index + 1}`;
  };

  const updateGuideTarget = (field: HTMLElement) => {
    field.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    field.focus({ preventScroll: true });
    field.classList.add('robot-guide-highlight');
    const rect = field.getBoundingClientRect();
    setGuideTargetRect({
      top: Math.max(12, rect.top - 82),
      left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 280)),
    });
  };

  const speakGuidePrompt = (field: HTMLElement, index: number) => {
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
      'main input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="date"]):not([type="time"]):not([type="month"]):not([type="week"]):not([disabled]), main textarea:not([disabled]), main select:not([disabled])'
    )).filter((field) => field.getClientRects().length > 0 && !(field instanceof HTMLInputElement && field.readOnly) && !(field instanceof HTMLTextAreaElement && field.readOnly));
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
    setIsVoiceMode(true);
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = fields;
    setGuideFieldIndex(0);
    guideFieldIndexRef.current = 0;
    isFormGuidingRef.current = true;
    setIsFormGuiding(true);
    onGuidingChange?.(true);
    const origin = document.querySelector<HTMLElement>('[data-robot-agent-trigger]');
    if (origin) {
      const rect = origin.getBoundingClientRect();
      setGuideTargetRect({ top: Math.max(12, rect.top - 82), left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 280)) });
      window.requestAnimationFrame(() => updateGuideTarget(fields[0]));
    } else updateGuideTarget(fields[0]);
    speakGuidePrompt(fields[0], 0);
  };

  const cancelFormGuide = () => {
    guideFieldsRef.current.forEach((field) => field.classList.remove('robot-guide-highlight'));
    guideFieldsRef.current = [];
    setGuideTargetRect(null);
    isFormGuidingRef.current = false;
    setIsFormGuiding(false);
    isTouringControlsRef.current = false;
    setIsTouringControls(false);
    tourTargetsRef.current.forEach((target) => target.classList.remove('robot-guide-highlight'));
    tourTargetsRef.current = [];
    onGuidingChange?.(false);
    setIsListening(false);
    try { speechRecognitionRef.current?.stop(); } catch {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setConnectionStatus('idle');
  };

  const speakControlTourStep = (target: HTMLElement, index: number) => {
    const label = getGuideFieldLabel(target, index);
    const description = target.getAttribute('data-robot-description') || 'Este controle está disponível nesta tela.';
    if (!audioFeedbackEnabled || !('speechSynthesis' in window)) {
      advanceControlTour();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${label}. ${description}`);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.98;
    utterance.onstart = () => setConnectionStatus('speaking');
    utterance.onend = () => advanceControlTour();
    utterance.onerror = () => advanceControlTour();
    window.speechSynthesis.speak(utterance);
  };

  const advanceControlTour = () => {
    if (!isTouringControlsRef.current) return;
    const nextIndex = tourIndexRef.current + 1;
    const nextTarget = tourTargetsRef.current[nextIndex];
    if (!nextTarget) {
      isTouringControlsRef.current = false;
      setIsTouringControls(false);
      tourTargetsRef.current.forEach((target) => target.classList.remove('robot-guide-highlight'));
      tourTargetsRef.current = [];
      setGuideTargetRect(null);
      onGuidingChange?.(false);
      setConnectionStatus('happy');
      window.setTimeout(() => setConnectionStatus('idle'), 1800);
      return;
    }
    tourIndexRef.current = nextIndex;
    tourTargetsRef.current[nextIndex - 1]?.classList.remove('robot-guide-highlight');
    updateGuideTarget(nextTarget);
    speakControlTourStep(nextTarget, nextIndex);
  };

  const startControlTour = () => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('main [data-robot-guide]'))
      .filter((target) => target.getClientRects().length > 0 && !(target instanceof HTMLButtonElement && target.disabled));
    if (targets.length === 0) {
      const message = 'Não encontrei controles com orientação visual nesta tela.';
      setMessages((prev) => [...prev, {
        id: `g-${Date.now()}`, sender: 'gemini', text: message,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelBadge: 'Assistente',
      }]);
      speakResponse(message);
      return;
    }
    setIsVoiceMode(true);
    cancelFormGuide();
    tourTargetsRef.current = targets;
    tourIndexRef.current = 0;
    isTouringControlsRef.current = true;
    setIsTouringControls(true);
    onGuidingChange?.(true);
    const origin = document.querySelector<HTMLElement>('[data-robot-agent-trigger]');
    if (origin) {
      const rect = origin.getBoundingClientRect();
      setGuideTargetRect({ top: Math.max(12, rect.top - 82), left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 280)) });
      window.requestAnimationFrame(() => updateGuideTarget(targets[0]));
    } else updateGuideTarget(targets[0]);
    speakControlTourStep(targets[0], 0);
  };

  const applyGuidedAnswer = (answer: string) => {
    const currentIndex = guideFieldIndexRef.current;
    const field = guideFieldsRef.current[currentIndex];
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
        speakGuidePrompt(field, currentIndex);
        return;
      }
      value = option.value;
    } else if (field instanceof HTMLInputElement && field.type === 'number') {
      value = value.replace(',', '.').replace(/[^0-9.+-]/g, '');
    }

    setConnectionStatus('working');
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
      speakGuidePrompt(field, currentIndex);
      return;
    }

    field.classList.remove('robot-guide-highlight');
    const nextIndex = currentIndex + 1;
    const nextField = guideFieldsRef.current[nextIndex];
    if (nextField) {
      guideFieldIndexRef.current = nextIndex;
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
    setConnectionStatus('happy');
    window.setTimeout(() => setConnectionStatus('idle'), 1800);
    speakResponse(doneMessage);
  };

  const startSpeechRecognitionCapture = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('A captura de voz não é suportada diretamente neste navegador. Digite sua consulta no campo abaixo.');
      setIsListening(false);
      setConnectionStatus('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lastInputLanguageRef.current || (typeof navigator !== 'undefined' ? navigator.language : 'pt-BR');
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
        if (isFormGuidingRef.current) applyGuidedAnswer(finalTranscript);
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
      setConnectionStatus('error');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!isFormGuidingRef.current) setConnectionStatus('idle');
    };
    try { recognition.start(); } catch {
      setIsListening(false);
      setConnectionStatus('idle');
    }
  };

  const startVoiceCapture = () => {
    if (isFormGuidingRef.current) {
      startSpeechRecognitionCapture();
      return;
    }
    void startGeminiLiveCapture();
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(true);
    if (liveSessionRef.current) {
      stopGeminiLive();
      return;
    }
    if (isListening && speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      setIsListening(false);
      setConnectionStatus('idle');
      return;
    }
    startVoiceCapture();
  };

  const toggleMicrophoneMute = () => {
    const nextMuted = !isMicrophoneMutedRef.current;
    isMicrophoneMutedRef.current = nextMuted;
    liveStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setIsMicrophoneMuted(nextMuted);
    console.info('[Gemini Live][Audio] Microphone mute changed.', { muted: nextMuted, activeTracks: liveStreamRef.current?.getAudioTracks().length ?? 0 });
  };

  const exitVoiceMode = () => {
    stopGeminiLive();
    cancelFormGuide();
    setIsVoiceMode(false);
    setConnectionStatus('idle');
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
        className={`pointer-events-auto ${isVoiceMode ? 'w-auto max-w-[360px] max-h-[88px]' : 'w-full max-w-xl max-h-[82vh]'} rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#101827] border-[#2A3A55] text-[#E8EDF5]'
            : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
        }`}
      >
        {/* Header bar */}
        <div className="p-3 border-b border-[#2A3A55]/60 flex items-center justify-between gap-3 bg-gradient-to-r from-[#17243A] via-[#101827] to-[#17243A]">
          <div className="flex items-center gap-3">
            {(!isFormGuiding && !isTouringControls) || isVoiceMode ? <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus} size={42} /> : null}
            {!isVoiceMode && <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white leading-tight">Assistente OBra ENGEP</h3>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#1F66D6] text-white font-bold">Aguardando</span>
              </div>
              <p className="text-[11px] text-[#9FB0C8]">Mesmo agente, agora com orientação visual</p>
            </div>}
            {isVoiceMode && <div className="flex items-center gap-1.5" aria-label="Controles do modo de voz">
              <button type="button" onClick={toggleMicrophoneMute} aria-label={isMicrophoneMuted ? 'Reativar microfone' : 'Silenciar microfone'} title={isMicrophoneMuted ? 'Reativar microfone' : 'Silenciar microfone'} className={`p-2 rounded-xl border transition ${isMicrophoneMuted ? 'border-red-400/50 bg-red-500/15 text-red-300' : 'border-[#5B9BFF]/40 bg-[#1F66D6]/15 text-[#9FC4FF]'}`}>
                {isMicrophoneMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button type="button" onClick={exitVoiceMode} aria-label="Voltar ao chat de texto" title="Voltar ao chat de texto" className="p-2 rounded-xl border border-[#5B9BFF]/40 bg-[#1F66D6]/15 text-[#9FC4FF] transition hover:bg-[#1F66D6]/30">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>}
          </div>
          <div className="flex items-center gap-1.5">

            {(isFormGuiding || isTouringControls) && (
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
        {guideTargetRect && (isFormGuiding || isTouringControls) && (
          <div className="fixed z-[70] pointer-events-none flex items-end gap-2 robot-guide-companion" style={{ top: guideTargetRect.top, left: guideTargetRect.left }}>
            <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus === 'speaking' ? 'speaking' : 'working'} size={76} />
            <div className="max-w-[190px] rounded-2xl border border-[#8da6b7]/50 bg-[#101827]/95 px-3 py-2 text-[11px] text-white shadow-xl">
              {isTouringControls ? `Controle ${tourIndexRef.current + 1} de ${tourTargetsRef.current.length}` : `Campo ${guideFieldIndex + 1} de ${guideFieldsRef.current.length}`}
              <div className="text-[#c7d7df]">{isTouringControls && tourTargetsRef.current[tourIndexRef.current] ? getGuideFieldLabel(tourTargetsRef.current[tourIndexRef.current], tourIndexRef.current) : guideFieldsRef.current[guideFieldIndex] ? getGuideFieldLabel(guideFieldsRef.current[guideFieldIndex], guideFieldIndex) : 'Preparando próximo campo'}</div>
            </div>
          </div>
        )}

        {/* Central Robot Head: tap to open a bidirectional Gemini Live WebSocket session. */}
        {!isVoiceMode && !isFormGuiding && !isTouringControls && <div className="py-4 px-4 bg-gradient-to-b from-[#17243A]/50 to-transparent flex flex-col items-center justify-center border-b border-[#2A3A55]/40 relative">
          <button
            onClick={toggleVoiceMode}
            aria-label={isListening ? 'Parar captura de voz' : 'Falar com o assistente'}
            className="rounded-2xl min-w-[112px] min-h-[112px] flex items-center justify-center focus-visible:outline-offset-4"
          >
            <RobotHeadAvatar state={isListening ? 'listening' : connectionStatus} size={104} />
          </button>
          <div className="mt-2 text-center space-y-1">
            <div className="text-xs font-semibold text-[#c7d7df]">
              {isListening ? 'Ouvindo você…' : connectionStatus === 'thinking' ? 'Analisando sua solicitação…' : connectionStatus === 'speaking' ? 'Falando com você…' : isFormGuiding ? 'Preenchimento guiado ativo' : isTouringControls ? 'Orientação da tela ativa' : 'Toque no robô para conversar'}
            </div>
            <p className="text-[10px] text-[#9FB0C8]">O estado do robô acompanha o estado real da conversa.</p>
          </div>
        </div>}

        {/* Quick Voice Prompts and contextual page guidance */}
        {!isVoiceMode && <div className="px-3 py-2 bg-[#17243A]/40 border-b border-[#2A3A55]/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={isFormGuiding || isTouringControls ? cancelFormGuide : startFormGuide}
            disabled={isGenerating}
            className="px-2.5 py-1.5 rounded-lg bg-[#1F66D6]/20 border border-[#5B9BFF]/40 text-[#c7d7df] whitespace-nowrap font-semibold disabled:opacity-50"
          >
            {isFormGuiding || isTouringControls ? 'Cancelar guia' : 'Guiar formulário por voz'}
          </button>
          <button type="button" onClick={startControlTour} disabled={isGenerating || isFormGuiding || isTouringControls} className="px-2.5 py-1.5 rounded-lg bg-[#3DD68C]/10 border border-[#3DD68C]/30 text-[#c7d7df] whitespace-nowrap font-semibold disabled:opacity-50">Mostrar controles</button>
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
        </div>}

        {/* Conversation transcript & Extended thinking */}
        {!isVoiceMode && <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[350px]">
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
        </div>}

        {/* Input Bar */}
        {!isVoiceMode && <div className="p-3 border-t border-[#2A3A55]/60 bg-[#17243A]/40">
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
        </div>}
      </div>
    </div>
  );
};
