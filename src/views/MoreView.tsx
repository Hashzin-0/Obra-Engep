/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  History,
  BookMarked,
  Bell,
  Settings,
  HelpCircle,
  ShieldCheck,
  Trash2,
  Plus,
  ArrowRight,
  ExternalLink,
  Download,
  Upload,
  Info,
  Check,
  Moon,
  Sun,
  Laptop,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CalculationHistoryItem, NotebookNote, ProjectDeadline, SyncState } from '../types';
import { LimitBar } from '../components/LimitBar';
import { AlertBanner } from '../components/AlertBanner';
import {
  disablePushNotifications,
  enablePushNotifications,
  notificationPermission,
  pushSupported,
  sendTestPush,
  subscriptionState,
} from '../services/push';
import { buildBackup, restoreBackup } from '../services/persistence';
import { saveFeedback } from '../services/remoteRepository';
import { ensureAnonymousSession, isSupabaseConfigured } from '../lib/supabase';
import { exportToLocalCalendar, getGoogleCalendarUrl } from '../utils/calendarSync';
import { CalendarCheck, BellRing, Smartphone, Clock, Calendar } from 'lucide-react';

interface MoreViewProps {
  historyItems: CalculationHistoryItem[];
  deadlines?: ProjectDeadline[];
  notes?: NotebookNote[];
  onAddNote?: (note: NotebookNote) => void;
  onDeleteNote?: (id: string) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  onReopenCalculation: (item: CalculationHistoryItem) => void;
  onOpenOnboarding: () => void;
  onOpenCalendarModal?: () => void;
  syncState?: SyncState;
}

type SubSection = 'menu' | 'caderno' | 'historico' | 'notificacoes' | 'configuracoes' | 'sobre' | 'ajuda';

export const MoreView: React.FC<MoreViewProps> = ({
  historyItems,
  deadlines = [],
  notes: notesProp,
  onAddNote,
  onDeleteNote,
  onClearHistory,
  onDeleteHistoryItem,
  onReopenCalculation,
  onOpenOnboarding,
  onOpenCalendarModal,
  syncState,
}) => {
  const { theme, resolvedTheme, setTheme, fontScale, setFontScale } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [activeSection, setActiveSection] = useState<SubSection>('menu');
  const [notificationStatus, setNotificationStatus] = useState(() => notificationPermission());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<string | null>(null);
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || '';

  const [localNotes, setLocalNotes] = useState<NotebookNote[]>([]);
  const notes = notesProp ?? localNotes;
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  React.useEffect(() => {
    subscriptionState().then(setPushEnabled).catch(() => setPushEnabled(false));
  }, []);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    const item: NotebookNote = {
      id: crypto.randomUUID(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: 'Geral',
      tags: ['Anotação'],
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      timestamp: Date.now(),
    };
    if (onAddNote) onAddNote(item);
    else setLocalNotes((current) => [item, ...current]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = (id: string) => {
    if (onDeleteNote) onDeleteNote(id);
    else setLocalNotes((current) => current.filter((note) => note.id !== id));
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OBra_ENGEP_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    const result = restoreBackup(await file.text());
    setPushFeedback(result.message);
    if (result.ok) window.setTimeout(() => window.location.reload(), 900);
  };

  const activatePush = async () => {
    try {
      const result = await enablePushNotifications();
      setNotificationStatus(notificationPermission());
      setPushEnabled(true);
      setPushFeedback(result.message);
    } catch (error) {
      setPushFeedback(error instanceof Error ? error.message : 'Falha ao ativar notificações.');
    }
    window.setTimeout(() => setPushFeedback(null), 5000);
  };

  const deactivatePush = async () => {
    try {
      const result = await disablePushNotifications();
      setPushEnabled(false);
      setPushFeedback(result.message);
    } catch (error) {
      setPushFeedback(error instanceof Error ? error.message : 'Falha ao desativar notificações.');
    }
    window.setTimeout(() => setPushFeedback(null), 5000);
  };

  const testPush = async () => {
    try {
      const result = await sendTestPush();
      setPushFeedback(`Push de teste enviado: ${result.sent} dispositivo(s), ${result.failed} falha(s).`);
    } catch (error) {
      setPushFeedback(error instanceof Error ? error.message : 'Falha no push de teste.');
    }
    window.setTimeout(() => setPushFeedback(null), 5000);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* If inside sub-section, show back button */}
      {activeSection !== 'menu' && (
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1 mb-2"
        >
          ← Voltar para Mais opções
        </button>
      )}

      {/* MAIN MENU (Screen: Mais) */}
      {activeSection === 'menu' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-white">Mais Ferramentas & Ajustes</h2>
            <p className="text-xs text-[#9FB0C8]">
              Caderno pessoal, histórico de cálculos, configurações e diretrizes
            </p>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'caderno' as SubSection,
                title: 'Caderno Pessoal',
                desc: `${notes.length} notas e procedimentos de campo salvos`,
                icon: BookMarked,
                color: '#3DD68C',
              },
              {
                id: 'historico' as SubSection,
                title: 'Histórico de Cálculos',
                desc: `${historyItems.length} cálculos registrados com parâmetros`,
                icon: History,
                color: '#1F66D6',
              },
              {
                id: 'notificacoes' as SubSection,
                title: 'Notificações e Atualizações',
                desc: 'Versão 2.1 e avisos de revisão normativa',
                icon: Bell,
                color: '#F5B93A',
              },
              {
                id: 'configuracoes' as SubSection,
                title: 'Configurações do App',
                desc: 'Tema, tamanho de fonte, backup e armazenamento',
                icon: Settings,
                color: '#06B6D4',
              },
              {
                id: 'sobre' as SubSection,
                title: 'Sobre / Segurança & Responsabilidade',
                desc: 'Fontes oficiais, limites técnicos e ART/CREA',
                icon: ShieldCheck,
                color: '#5B9BFF',
              },
              {
                id: 'ajuda' as SubSection,
                title: 'Ajuda e Suporte Técnico',
                desc: 'Guia de navegação rápida e canal de contato',
                icon: HelpCircle,
                color: '#9FB0C8',
              },
            ].map(({ id, title, desc, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className="w-full p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] hover:border-[#1F66D6] transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${color}15`,
                      borderColor: `${color}35`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-[#5B9BFF] transition-colors">
                      {title}
                    </h4>
                    <p className="text-xs text-[#9FB0C8]">{desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#9FB0C8] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 25: CADERNO PESSOAL */}
      {activeSection === 'caderno' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Caderno Pessoal</h3>
              <p className="text-xs text-[#9FB0C8]">Anotações de campo, medidas e procedimentos</p>
            </div>
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="px-3 py-1.5 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Nota</span>
            </button>
          </div>

          {isAddingNote && (
            <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Criar Nova Anotação</h4>
              <input
                type="text"
                placeholder="Título da anotação (ex: Medidas do quadro de força)"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white text-sm outline-none"
                autoFocus
              />
              <textarea
                placeholder="Descreva detalhes, etapas ou procedimentos..."
                rows={3}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white text-xs outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNote(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#2A3A55] text-xs text-[#9FB0C8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#1F66D6] text-xs font-semibold text-white"
                >
                  Salvar Nota
                </button>
              </div>
            </form>
          )}

          {notes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2">
              <BookMarked className="w-8 h-8 text-[#9FB0C8] mx-auto opacity-40" />
              <h4 className="font-semibold text-white text-sm">Nenhuma anotação salva</h4>
              <p className="text-xs text-[#9FB0C8]">
                Registre observações de canteiro, procedimentos próprios e fotos.
              </p>
              <button
                onClick={() => setIsAddingNote(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#1F66D6] text-white text-xs font-semibold"
              >
                Escrever primeira anotação
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#3DD68C]">
                        {note.category} · {note.updatedAt}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-0.5">{note.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-[#9FB0C8] hover:text-[#FF6B6B]"
                      aria-label="Excluir nota"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#E8EDF5] leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 27: HISTÓRICO */}
      {activeSection === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Histórico de Cálculos</h3>
              <p className="text-xs text-[#9FB0C8]">Reabra qualquer cálculo com os dados pré-preenchidos</p>
            </div>
            {historyItems.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-[#FF6B6B] hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar tudo</span>
              </button>
            )}
          </div>

          {historyItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2">
              <History className="w-8 h-8 text-[#9FB0C8] mx-auto opacity-40" />
              <h4 className="font-semibold text-white text-sm">Histórico vazio</h4>
              <p className="text-xs text-[#9FB0C8]">
                Seus cálculos recentes aparecerão aqui para fácil consulta e alteração de parâmetros.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B9BFF]">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-[#9FB0C8]">{item.dateStr}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-0.5">{item.title}</h4>
                    </div>
                    <button
                      onClick={() => onDeleteHistoryItem(item.id)}
                      className="p-1.5 text-[#9FB0C8] hover:text-[#FF6B6B]"
                      aria-label="Excluir este cálculo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/25 flex items-baseline justify-between">
                    <span className="text-xs text-[#9FB0C8] font-mono">{item.formula}</span>
                    <span className="text-base font-bold text-[#5B9BFF] font-mono">
                      {item.resultValue.toLocaleString('pt-BR')} {item.resultUnit}
                    </span>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onReopenCalculation(item)}
                      className="text-xs font-semibold text-[#5B9BFF] hover:underline flex items-center gap-1"
                    >
                      <span>Reabrir e recalcular</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 28: SISTEMA DE GESTÃO DE NOTIFICAÇÕES & ATUALIZAÇÕES */}
      {activeSection === 'notificacoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Central de Notificações & Prazos</h3>
              <p className="text-xs text-[#9FB0C8]">Alertas Android Push e sincronização com calendário</p>
            </div>
            {onOpenCalendarModal && (
              <button
                onClick={onOpenCalendarModal}
                className="px-3 py-1.5 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Gerenciar Prazos</span>
              </button>
            )}
          </div>

          {/* Feedback banner */}
          {pushFeedback && (
            <div className="bg-[#12301F] border border-[#3DD68C]/40 p-3 rounded-xl text-xs text-[#3DD68C] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{pushFeedback}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#5B9BFF]" />
                <div>
                  <h4 className="font-bold text-sm text-white">Web Push (VAPID + Supabase)</h4>
                  <p className="text-[11px] text-[#9FB0C8]">
                    Lembretes enviados pela Edge Function, mesmo com o app fechado
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  pushEnabled && notificationStatus === 'granted'
                    ? 'bg-[#12301F] text-[#3DD68C] border-[#3DD68C]/40'
                    : notificationStatus === 'denied'
                    ? 'bg-[#3B1A1C] text-[#FF6B6B] border-[#FF6B6B]/40'
                    : 'bg-[#3A2E10] text-[#F5B93A] border-[#F5B93A]/40'
                }`}
              >
                {!pushSupported()
                  ? 'Indisponível'
                  : pushEnabled && notificationStatus === 'granted'
                    ? 'Ativo'
                    : notificationStatus === 'denied'
                      ? 'Bloqueado'
                      : 'Pendente'}
              </span>
            </div>

            {!pushSupported() && (
              <p className="text-[11px] text-[#F5B93A]">
                Configure VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY e use HTTPS (ou localhost) para habilitar Web Push.
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {!pushEnabled ? (
                <button
                  onClick={activatePush}
                  disabled={!pushSupported()}
                  className="px-3.5 py-2 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Ativar Web Push</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={testPush}
                    className="px-3.5 py-2 rounded-xl bg-[#F5B93A]/20 hover:bg-[#F5B93A]/30 text-[#F5B93A] border border-[#F5B93A]/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enviar Push de Teste</span>
                  </button>
                  <button
                    onClick={deactivatePush}
                    className="px-3.5 py-2 rounded-xl border border-[#2A3A55] text-[#9FB0C8] text-xs font-medium"
                  >
                    Desativar neste dispositivo
                  </button>
                </>
              )}

              <button
                onClick={async () => {
                  const success = await exportToLocalCalendar(deadlines);
                  if (success) {
                    setPushFeedback('Calendário exportado em formato .ics universal!');
                    setTimeout(() => setPushFeedback(null), 4000);
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-[#2A3A55] hover:border-[#1F66D6] text-[#E8EDF5] text-xs font-medium flex items-center gap-1.5 transition"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#5B9BFF]" />
                <span>Exportar Todos para Calendário (.ICS)</span>
              </button>
            </div>

            <p className="text-[11px] text-[#6B7F9E]">
              O agendamento é feito por pg_cron + pg_net no Supabase. A entrega usa VAPID; o Supabase guarda as
              inscrições e os prazos.
            </p>
          </div>

          {/* Upcoming Project Milestones with Calendar Sync */}
          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#5B9BFF]">
              Próximos Marcos e Vencimentos ({deadlines.length})
            </h4>

            <div className="space-y-2">
              {deadlines.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#101827] border border-[#2A3A55] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-[#9FB0C8]">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9FB0C8] mt-0.5">
                      {item.projectName} • Data: {item.dueDate.split('-').reverse().join('/')} às {item.dueTime || '09:00'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={getGoogleCalendarUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-[#1F66D6]/20 hover:bg-[#1F66D6]/40 text-[#5B9BFF] font-medium text-[10px] flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Google Cal</span>
                    </a>
                    <button
                      onClick={() => exportToLocalCalendar([item])}
                      className="px-2 py-1 rounded-lg bg-black/30 hover:bg-white/10 text-[#9FB0C8] hover:text-white text-[10px] font-medium flex items-center gap-1"
                      title="Baixar arquivo .ics"
                    >
                      <Download className="w-3 h-3" />
                      <span>.ICS</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Updates Log */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#9FB0C8]">
              Histórico de Versões e Normas
            </h4>
            <div className="p-4 rounded-2xl bg-[#17243A] border border-[#3DD68C]/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3DD68C]">Versão 2.2 com Web Push e Supabase</span>
                <span className="text-[10px] text-[#9FB0C8]">25/10/2026</span>
              </div>
              <p className="text-xs text-[#E8EDF5] leading-relaxed">
                Integração do sistema de gerenciamento de notificações Android Push, sincronização bidirecional de calendário (.ics / Google Calendar) e refinamento de UI/UX das pranchas técnicas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 29: CONFIGURAÇÕES */}
      {activeSection === 'configuracoes' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Configurações Gerais</h3>
            <p className="text-xs text-[#9FB0C8]">Ajustes de interface, dados locais e acessibilidade</p>
          </div>

          {/* Theme setting */}
          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aparência e Tema</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: 'dark' as const, label: 'Escuro', Icon: Moon },
                { mode: 'light' as const, label: 'Claro', Icon: Sun },
                { mode: 'system' as const, label: 'Sistema', Icon: Laptop },
              ].map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    theme === mode
                      ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
                      : 'border-[#2A3A55] text-[#9FB0C8] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility & Font Scaling (Page 4: escala até 200%) */}
          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Tamanho da Fonte (Acessibilidade em Campo)
              </h4>
              <span className="text-xs font-mono text-[#5B9BFF]">{fontScale}%</span>
            </div>
            <input
              type="range"
              min="90"
              max="200"
              step="5"
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full accent-[#1F66D6]"
            />
            <div className="flex justify-between text-[11px] text-[#9FB0C8]">
              <span>Padrão (100%)</span>
              <span>Grande (130%)</span>
              <span>Máximo (200%)</span>
            </div>
          </div>

          {/* Data Backup & Export (Page 9 requirement) */}
          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Armazenamento e Backup Local
            </h4>
            <p className="text-xs text-[#9FB0C8]">
              Os dados ficam em cache no dispositivo e são sincronizados com o Supabase quando configurado. Exporte um backup antes de trocar de aparelho.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={handleExportBackup}
                className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Backup JSON</span>
              </button>
              <label className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl border border-[#2A3A55] text-xs font-medium text-[#9FB0C8] hover:text-white text-center cursor-pointer">
                <Upload className="w-3.5 h-3.5 inline mr-1" />
                Importar Backup
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImportBackup(file);
                  }}
                />
              </label>
              <button
                onClick={onOpenOnboarding}
                className="py-2.5 px-3 rounded-xl border border-[#2A3A55] text-xs font-medium text-[#9FB0C8] hover:text-white"
              >
                Refazer Onboarding
              </button>
            </div>
            {syncState && (
              <p className="text-[11px] text-[#6B7F9E]">
                Supabase: {syncState.status}
                {syncState.message ? ` · ${syncState.message}` : ''}
                {syncState.lastSyncedAt
                  ? ` · última sincronização ${new Date(syncState.lastSyncedAt).toLocaleString('pt-BR')}`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 30: SOBRE & SEGURANÇA */}
      {activeSection === 'sobre' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Sobre o OBra ENGEP</h3>
            <p className="text-xs text-[#9FB0C8]">Manual técnico inteligente e responsabilidade técnica</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3 text-xs leading-relaxed text-[#E8EDF5]">
            <h4 className="text-sm font-bold text-white">Missão e Identidade</h4>
            <p>
              O <strong>OBra ENGEP</strong> foi desenvolvido para atender estudantes, técnicos, engenheiros e aplicadores em campo que necessitam de consultas rápidas, fórmulas de dimensionamento preliminar, checklists de segurança e padronização de procedimentos em estética automotiva.
            </p>

            <h4 className="text-sm font-bold text-white pt-2">Limites das Calculadoras e da IA</h4>
            <p>
              Nenhum algoritmo ou modelo substitui a vistoria presencial e a responsabilidade de um responsável técnico legalmente habilitado (Engenheiro Civil, Eletricista ou Mecânico). Intervenções estruturais, elétricas de média tensão ou hidrossanitárias exigem emissão de ART (CREA) ou RRT (CAU).
            </p>

            <h4 className="text-sm font-bold text-white pt-2">Fontes e Revisões</h4>
            <ul className="list-disc pl-4 space-y-1 text-[#9FB0C8]">
              <li>Ministério do Trabalho e Emprego — NR-06, NR-10, NR-12, NR-18, NR-33 e NR-35</li>
              <li>ABNT — NBR 5410, NBR 5626, NBR 6118, NBR 9050, NBR 9575 e NBR 15575</li>
              <li>Prefeitura de São Paulo — Código de Obras e Edificações (Lei 16.642/2017)</li>
            </ul>
          </div>

          <LimitBar message="Versão 2.2 (25/10/2026). Todos os direitos reservados à identidade OBra ENGEP." />
        </div>
      )}

      {/* AJUDA & SUPORTE */}
      {activeSection === 'ajuda' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3 text-xs text-[#E8EDF5]">
            <h3 className="text-base font-bold text-white">Como Usar em Campo</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-black/25">
                <strong className="text-[#5B9BFF] block">1. Calculadoras Rápidas:</strong>
                Acesse a aba Início ou Calculadoras para estimar corrente, volume de caixa d’água ou materiais com margem de perda.
              </div>
              <div className="p-3 rounded-xl bg-black/25">
                <strong className="text-[#3DD68C] block">2. Checklists de Segurança:</strong>
                Na Biblioteca, consulte as NRs e marque os itens verificados antes de iniciar trabalho em altura ou com eletricidade.
              </div>
              <div className="p-3 rounded-xl bg-black/25">
                <strong className="text-[#06B6D4] block">3. Estética Automotiva:</strong>
                Nunca aplique produtos sem antes checar a diluição registrada no rótulo e as cautelas contra mistura química.
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
            <h3 className="text-base font-bold text-white">Feedback e Suporte</h3>
            <p className="text-xs text-[#9FB0C8]">
              Encontrou erro de cálculo, link desatualizado ou problema de uso? Registre sua mensagem para análise.
            </p>
            {isSupabaseConfigured ? (
              <>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Descreva o problema, a tela e o resultado esperado."
                  className="w-full rounded-xl bg-[#101827] border border-[#6B7F9E] p-3 text-xs text-white outline-none focus:border-[#5B9BFF]"
                />
                <button
                  disabled={feedbackSending || !feedbackText.trim()}
                  onClick={async () => {
                    try {
                      setFeedbackSending(true);
                      const session = await ensureAnonymousSession();
                      if (!session) throw new Error('Sessão Supabase indisponível.');
                      await saveFeedback(session.userId, feedbackText.trim(), 'mais/ajuda');
                      setFeedbackResult('Feedback registrado. Obrigado pela contribuição.');
                      setFeedbackText('');
                    } catch (error) {
                      setFeedbackResult(error instanceof Error ? error.message : 'Falha ao registrar feedback.');
                    } finally {
                      setFeedbackSending(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] disabled:opacity-40 text-white text-xs font-semibold"
                >
                  {feedbackSending ? 'Enviando...' : 'Enviar feedback'}
                </button>
                {feedbackResult && <p className="text-[11px] text-[#3DD68C]">{feedbackResult}</p>}
              </>
            ) : (
              <p className="text-[11px] text-[#F5B93A]">
                Configure o Supabase para registrar feedback no app.
              </p>
            )}
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className="text-xs font-semibold text-[#5B9BFF] hover:underline">
                {supportEmail}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
