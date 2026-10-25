/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Deadlines, Milestone Management, Calendar Sync & Android Push Notification Center
 */

import React, { useState } from 'react';
import {
  Calendar,
  Bell,
  BellRing,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Share2,
  X,
  Smartphone,
  CalendarCheck,
  Filter,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ProjectDeadline } from '../types';
import { exportToLocalCalendar, getGoogleCalendarUrl } from '../utils/calendarSync';
import {
  getNotificationStatus,
  requestNotificationPermission,
  sendAndroidPushNotification,
} from '../utils/notifications';
import {
  filterDeadlinesByPeriod,
  QuickFilterPeriod,
} from '../utils/projectProgress';

interface DeadlinesCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadlines: ProjectDeadline[];
  onUpdateDeadlines: (updated: ProjectDeadline[]) => void;
}

export const DeadlinesCalendarModal: React.FC<DeadlinesCalendarModalProps> = ({
  isOpen,
  onClose,
  deadlines,
  onUpdateDeadlines,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [notificationStatus, setNotificationStatus] = useState(() => getNotificationStatus());
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Quick Filter State (Hoje, Esta Semana, Este Mês, Todos)
  const [activePeriod, setActivePeriod] = useState<QuickFilterPeriod>('todos');

  // New deadline form state with Priority (Alta, Média, Baixa)
  const [newTitle, setNewTitle] = useState('');
  const [newProjectName, setNewProjectName] = useState('Casa Unifamiliar');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [newTime, setNewTime] = useState('09:00');
  const [newPriority, setNewPriority] = useState<'alta' | 'media' | 'baixa'>('alta');
  const [newCategory, setNewCategory] = useState<ProjectDeadline['category']>('estrutural');
  const [newReminderMinutes, setNewReminderMinutes] = useState(1440); // 24h

  if (!isOpen) return null;

  // Compute counts for quick period filters
  const countHoje = filterDeadlinesByPeriod(deadlines, 'hoje').length;
  const countSemana = filterDeadlinesByPeriod(deadlines, 'semana').length;
  const countMes = filterDeadlinesByPeriod(deadlines, 'mes').length;
  const filteredDeadlines = filterDeadlinesByPeriod(deadlines, activePeriod);

  const handleRequestPush = async () => {
    const perm = await requestNotificationPermission();
    setNotificationStatus(getNotificationStatus());
    if (perm === 'granted') {
      await sendAndroidPushNotification(
        '🔔 OBra ENGEP — Notificações Ativadas',
        'Você receberá lembretes automáticos de prazos, vistorias e etapas de projetos no seu Android!',
        { type: 'test' }
      );
      setFeedbackMsg('Notificações Android Push ativadas com sucesso!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg('Permissão de notificação negada ou não concedida.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSendTestPush = async (deadline: ProjectDeadline) => {
    const ok = await sendAndroidPushNotification(
      `⚠️ Prazo Próximo (${deadline.priority.toUpperCase()}): ${deadline.title}`,
      `Data: ${deadline.dueDate} às ${deadline.dueTime || '09:00'} · Projeto: ${deadline.projectName || 'Geral'}. Verifique os requisitos técnicos no app.`
    );
    if (ok) {
      setFeedbackMsg(`Alerta push enviado para "${deadline.title}"!`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg('Ative a permissão de notificações para receber alertas push no Android.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSyncAllToCalendar = async () => {
    const active = deadlines.filter((d) => d.status !== 'concluido');
    const success = await exportToLocalCalendar(active);
    if (success) {
      setFeedbackMsg('Arquivo .ics gerado! Abra o arquivo baixado para importar todos os prazos no seu Calendário do celular.');
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = deadlines.map((d) => {
      if (d.id === id) {
        return {
          ...d,
          status: d.status === 'concluido' ? ('pendente' as const) : ('concluido' as const),
        };
      }
      return d;
    });
    onUpdateDeadlines(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deadlines.filter((d) => d.id !== id);
    onUpdateDeadlines(updated);
  };

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const item: ProjectDeadline = {
      id: `dead-${Date.now()}`,
      title: newTitle.trim(),
      projectName: newProjectName.trim(),
      description: newDescription.trim(),
      dueDate: newDate,
      dueTime: newTime,
      priority: newPriority,
      status: 'pendente',
      category: newCategory,
      reminderMinutesBefore: newReminderMinutes,
      notified: false,
    };

    const updated = [item, ...deadlines];
    onUpdateDeadlines(updated);
    setIsAddingDeadline(false);
    setNewTitle('');
    setNewDescription('');

    setFeedbackMsg(`Prazo "${item.title}" criado com prioridade ${newPriority.toUpperCase()}!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gerenciador de Prazos e Notificações"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto ${
          isDark
            ? 'bg-[#17243A] border-[#2A3A55] text-[#E8EDF5]'
            : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
        }`}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A3A55] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1F66D6]/20 border border-[#1F66D6]/40 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#5B9BFF]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white leading-tight">
                Cronograma, Prazos & Notificações Push
              </h3>
              <p className="text-xs text-[#9FB0C8]">
                Alertas Android, priorização e sincronização direta com seu calendário local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9FB0C8] hover:text-white transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback toast banner */}
        {feedbackMsg && (
          <div className="bg-[#12301F] border-b border-[#3DD68C]/30 px-4 py-2.5 text-xs text-[#3DD68C] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Quick Action Control Bar */}
        <div className="p-3.5 sm:p-4 bg-black/20 border-b border-[#2A3A55] flex flex-wrap items-center justify-between gap-2">
          {/* Push status & toggle button */}
          <div className="flex items-center gap-2">
            {notificationStatus.permission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#12301F] text-[#3DD68C] border border-[#3DD68C]/30">
                <BellRing className="w-3.5 h-3.5" />
                <span>Notificações Android: Ativas</span>
              </span>
            ) : (
              <button
                onClick={handleRequestPush}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5B93A]/20 hover:bg-[#F5B93A]/30 text-[#F5B93A] border border-[#F5B93A]/40 transition active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Ativar Notificações Android Push</span>
              </button>
            )}
          </div>

          {/* Sync All & Add buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAllToCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1F66D6] hover:bg-[#1A57B8] text-white transition active:scale-95 shadow-sm"
              title="Exporta todos os prazos em arquivo .ics para o app de calendário do celular"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Sincronizar com Calendário</span>
            </button>
            <button
              onClick={() => setIsAddingDeadline(!isAddingDeadline)}
              className={`p-1.5 rounded-xl border transition ${
                isAddingDeadline
                  ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
                  : 'border-[#2A3A55] hover:border-[#1F66D6] text-[#9FB0C8] hover:text-white'
              }`}
              title="Adicionar Novo Prazo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add New Deadline Form with Priority Field */}
          {isAddingDeadline && (
            <form
              onSubmit={handleCreateDeadline}
              className="p-4 rounded-2xl bg-[#101827] border border-[#1F66D6]/40 space-y-3"
            >
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#5B9BFF]">
                  Novo Prazo / Marco de Obra
                </h4>
                <span className="text-[10px] text-[#9FB0C8]">Campos com prioridade e alerta</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[#9FB0C8]">Título da Etapa / Tarefa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Concretagem da laje, vistoria de aterramento..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9FB0C8]">Projeto Associado</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9FB0C8]">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  >
                    <option value="estrutural">Estrutural (Concreto/Aço)</option>
                    <option value="seguranca">Segurança (NRs / Linha de Vida)</option>
                    <option value="eletrica">Elétrica (NBR 5410)</option>
                    <option value="hidraulica">Hidráulica (NBR 5626)</option>
                    <option value="alvara">Alvará & Licenciamento COE</option>
                    <option value="estetica">Estética Automotiva</option>
                    <option value="obra">Obra Geral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#9FB0C8]">Data Limite *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9FB0C8]">Horário Previsto</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  />
                </div>

                {/* Priority Selector Field (Alta, Média, Baixa) with visual color indicators */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[#9FB0C8] flex items-center justify-between">
                    <span>Nível de Prioridade</span>
                    <span className="text-[10px] text-white/60">
                      {newPriority === 'alta'
                        ? 'Crítico / Bloqueante'
                        : newPriority === 'media'
                        ? 'Cronograma Padrão'
                        : 'Apoio / Secundário'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPriority('alta')}
                      className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer ${
                        newPriority === 'alta'
                          ? 'bg-[#EF4444]/25 text-[#FF6B6B] border-[#EF4444] shadow-xs ring-1 ring-[#EF4444]/40'
                          : 'bg-[#17243A] border-[#2A3A55] text-[#9FB0C8] hover:text-white hover:border-[#EF4444]/50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0 animate-pulse" />
                      <span>Alta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPriority('media')}
                      className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer ${
                        newPriority === 'media'
                          ? 'bg-[#F5B93A]/25 text-[#F5B93A] border-[#F5B93A] shadow-xs ring-1 ring-[#F5B93A]/40'
                          : 'bg-[#17243A] border-[#2A3A55] text-[#9FB0C8] hover:text-white hover:border-[#F5B93A]/50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F5B93A] shrink-0" />
                      <span>Média</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPriority('baixa')}
                      className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer ${
                        newPriority === 'baixa'
                          ? 'bg-[#10B981]/25 text-[#3DD68C] border-[#10B981] shadow-xs ring-1 ring-[#10B981]/40'
                          : 'bg-[#17243A] border-[#2A3A55] text-[#9FB0C8] hover:text-white hover:border-[#10B981]/50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                      <span>Baixa</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[#9FB0C8]">Alerta Lembrete Push</label>
                  <select
                    value={newReminderMinutes}
                    onChange={(e) => setNewReminderMinutes(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white outline-none focus:border-[#1F66D6]"
                  >
                    <option value={60}>1 hora antes</option>
                    <option value={120}>2 horas antes</option>
                    <option value={1440}>1 dia antes (24h)</option>
                    <option value={2880}>2 dias antes (48h)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[#9FB0C8]">Descrição / Requisitos Técnicos</label>
                  <textarea
                    rows={2}
                    placeholder="Instruções de segurança, normas a conferir, fornecedores..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#17243A] border border-[#6B7F9E] text-white text-xs outline-none focus:border-[#1F66D6]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3A55]">
                <button
                  type="button"
                  onClick={() => setIsAddingDeadline(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#2A3A55] text-xs text-[#9FB0C8] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-xs font-semibold text-white cursor-pointer shadow-xs"
                >
                  Salvar e Agendar Alerta
                </button>
              </div>
            </form>
          )}

          {/* Quick Filter Buttons (Hoje, Esta Semana, Este Mês, Todos) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#101827] border border-[#2A3A55] text-xs">
            {[
              { id: 'todos' as QuickFilterPeriod, label: 'Todos', count: deadlines.length },
              { id: 'hoje' as QuickFilterPeriod, label: 'Hoje', count: countHoje },
              { id: 'semana' as QuickFilterPeriod, label: 'Esta Semana', count: countSemana },
              { id: 'mes' as QuickFilterPeriod, label: 'Este Mês', count: countMes },
            ].map((filter) => {
              const isActive = activePeriod === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActivePeriod(filter.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition text-xs cursor-pointer ${
                    isActive
                      ? 'bg-[#1F66D6] text-white shadow-xs'
                      : 'text-[#9FB0C8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-[#9FB0C8]'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List of Filtered Deadlines */}
          {filteredDeadlines.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-black/20 border border-[#2A3A55] space-y-2">
              <Calendar className="w-8 h-8 text-[#9FB0C8] mx-auto opacity-40" />
              <h4 className="font-semibold text-white text-sm">
                Nenhum prazo encontrado para {activePeriod === 'hoje' ? 'Hoje' : activePeriod === 'semana' ? 'Esta Semana' : activePeriod === 'mes' ? 'Este Mês' : 'o período'}
              </h4>
              <p className="text-xs text-[#9FB0C8]">
                {activePeriod !== 'todos'
                  ? 'Alterne para "Todos" ou adicione um novo prazo clicando no botão + acima.'
                  : 'Adicione marcos de cronograma para receber alertas push e sincronizar com seu calendário.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeadlines.map((item) => {
                const isDone = item.status === 'concluido';
                const gCalUrl = getGoogleCalendarUrl(item);

                // Priority style definitions
                const isAlta = item.priority === 'alta';
                const isMedia = item.priority === 'media';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition space-y-2.5 relative border-l-4 ${
                      isAlta
                        ? 'border-l-[#EF4444]'
                        : isMedia
                        ? 'border-l-[#F5B93A]'
                        : 'border-l-[#10B981]'
                    } ${
                      isDone
                        ? 'bg-black/20 border-white/5 opacity-60'
                        : isDark
                        ? 'bg-[#101827] border-[#2A3A55] hover:border-[#1F66D6]'
                        : 'bg-[#F8FAFC] border-[#D9E0EC] hover:border-[#1F66D6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id)}
                          className="mt-0.5 text-[#9FB0C8] hover:text-[#3DD68C] shrink-0 cursor-pointer"
                          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
                        >
                          <CheckCircle2
                            className={`w-5 h-5 ${isDone ? 'text-[#3DD68C] fill-[#3DD68C]/20' : ''}`}
                          />
                        </button>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md bg-[#1F66D6]/20 text-[#5B9BFF]">
                              {item.category}
                            </span>

                            {/* Visual Indicator of Priority with colored dot & badge */}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isAlta
                                  ? 'bg-[#EF4444]/15 text-[#FF6B6B] border-[#EF4444]/30'
                                  : isMedia
                                  ? 'bg-[#F5B93A]/15 text-[#F5B93A] border-[#F5B93A]/30'
                                  : 'bg-[#10B981]/15 text-[#3DD68C] border-[#10B981]/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAlta
                                    ? 'bg-[#EF4444] animate-pulse'
                                    : isMedia
                                    ? 'bg-[#F5B93A]'
                                    : 'bg-[#10B981]'
                                }`}
                              />
                              <span>Prioridade {item.priority}</span>
                            </span>

                            {item.projectName && (
                              <span className="text-[10px] text-[#9FB0C8]">
                                • {item.projectName}
                              </span>
                            )}
                          </div>

                          <h4
                            className={`font-bold text-sm leading-snug text-white ${
                              isDone ? 'line-through text-[#9FB0C8]' : ''
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>
                      </div>

                      {/* Date Badge */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#5B9BFF]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.dueDate.split('-').reverse().join('/')}</span>
                        </div>
                        <span className="text-[10px] text-[#9FB0C8]">
                          às {item.dueTime || '09:00'}
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-[#9FB0C8] pl-7 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Action buttons on item: Sync to Google Cal, Export .ics, Test Push Notification */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 pl-7 flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {/* Direct Google Calendar Link */}
                        <a
                          href={gCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#1F66D6]/15 hover:bg-[#1F66D6]/30 text-[#5B9BFF] font-medium flex items-center gap-1 text-[11px]"
                          title="Adicionar evento no Google Calendar"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Google Calendar</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>

                        {/* Export single .ics */}
                        <button
                          onClick={() => exportToLocalCalendar([item], `${item.title.slice(0, 20)}.ics`)}
                          className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-white/10 text-[#9FB0C8] hover:text-white font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                          title="Baixar arquivo .ics para Calendário local"
                        >
                          <Download className="w-3 h-3" />
                          <span>.ICS</span>
                        </button>

                        {/* Trigger test push notification */}
                        <button
                          onClick={() => handleSendTestPush(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#F5B93A]/15 hover:bg-[#F5B93A]/30 text-[#F5B93A] font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                          title="Enviar notificação push imediata deste prazo"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Testar Push</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-[#9FB0C8] hover:text-[#FF6B6B] transition cursor-pointer"
                        aria-label="Excluir prazo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#2A3A55] bg-black/30 flex items-center justify-between text-xs text-[#9FB0C8]">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#5B9BFF]" />
            Android Push API & iCalendar RFC 5545
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-xs transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
