/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calculator,
  BookOpen,
  Compass,
  Sparkles,
  Car,
  Scale,
  ArrowRight,
  Search,
  Clock,
  Star,
  ChevronRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ModuleId, CalculationHistoryItem, ProjectDeadline } from '../types';
import { calculateProjectProgress } from '../utils/projectProgress';

interface HomeViewProps {
  onNavigateModule: (moduleId: ModuleId, subTab?: string) => void;
  onOpenSearch: () => void;
  onOpenCalculatorWithData?: (calc: CalculationHistoryItem) => void;
  onOpenCalendarModal?: () => void;
  onOpenVoiceAssistant?: () => void;
  authenticatedName?: string;
  latestCalculation?: CalculationHistoryItem | null;
  favoritesCount: number;
  deadlines?: ProjectDeadline[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateModule,
  onOpenSearch,
  onOpenCalculatorWithData,
  onOpenCalendarModal,
  onOpenVoiceAssistant,
  authenticatedName,
  latestCalculation,
  favoritesCount,
  deadlines = [],
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Calculate completion percentage for each active project based on status 'pendente' vs 'concluido'
  const projectStats = calculateProjectProgress(
    deadlines && deadlines.length > 0
      ? deadlines
      : (() => {
          try {
            const saved = localStorage.getItem('obra_engep_deadlines');
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        })()
  );
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('obra_engep_username') || 'Profissional';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const greetingName = authenticatedName?.trim() || userName;

  const modules = [
    {
      id: 'calculadoras' as ModuleId,
      name: 'Calculadoras',
      desc: 'Elétrica, Hidráulica, Materiais e Conversões',
      color: '#1F66D6',
      icon: Calculator,
      badge: 'Offline',
    },
    {
      id: 'manuais' as ModuleId,
      name: 'Manuais e NRs',
      desc: 'NR-35, NR-10, NR-06, NBR 5410 com checklists',
      color: '#3DD68C',
      icon: BookOpen,
      badge: 'Oficial',
    },
    {
      id: 'projetos' as ModuleId,
      name: 'Projetos e Plantas',
      desc: 'Editor gráfico com camadas e cotas reais',
      color: '#5B9BFF',
      icon: Compass,
      badge: 'Canvas 2D',
    },
    {
      id: 'ia' as ModuleId,
      name: 'IA e Estudos',
      desc: 'Sol, ventilação e patologias com transparência',
      color: '#A855F7',
      icon: Sparkles,
      badge: 'Assistente',
    },
    {
      id: 'estetica' as ModuleId,
      name: 'Estética Automotiva',
      desc: 'Matriz de sujeiras e diluições conforme rótulo',
      color: '#06B6D4',
      icon: Car,
      badge: 'Rótulo',
    },
    {
      id: 'legislacao' as ModuleId,
      name: 'Legislação',
      desc: 'Código de Obras SP Lei 16.642, Estadual e Federal',
      color: '#EAB308',
      icon: Scale,
      badge: 'Vigência',
    },
  ];

  const handleSaveName = (newName: string) => {
    const trimmed = newName.trim() || 'Profissional';
    setUserName(trimmed);
    localStorage.setItem('obra_engep_username', trimmed);
    setIsEditingName(false);
  };

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Greeting & Header: Olá, Luis (Maior e centralizado, sem tag v2.1) */}
      <section className="space-y-2 text-center py-2">
        <div className="flex flex-col items-center justify-center">
          {isEditingName ? (
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                defaultValue={userName}
                autoFocus
                onBlur={(e) => handleSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName(e.currentTarget.value)}
                className="text-3xl sm:text-4xl font-extrabold bg-transparent border-b-2 border-[#1F66D6] outline-none text-white text-center w-64 max-w-full"
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  if (input) handleSaveName(input.value);
                }}
                className="px-3 py-1 text-xs rounded-lg bg-[#1F66D6] text-white hover:bg-[#1A57B8]"
              >
                Salvar
              </button>
            </div>
          ) : (
            <h2
              onClick={() => { if (!authenticatedName) setIsEditingName(true); }}
              className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white dark:text-white inline-flex items-center justify-center gap-2 group transition-all ${authenticatedName ? '' : 'cursor-pointer hover:opacity-90'}`}
              title={authenticatedName ? 'Nome da conta Google' : 'Toque para editar seu nome'}
            >
              <span>Olá, {greetingName}</span>
              {!authenticatedName && <span className="text-xs text-[#9FB0C8] opacity-60 group-hover:opacity-100 font-normal underline decoration-dotted border border-[#2A3A55] px-2 py-0.5 rounded-md">editar</span>}
            </h2>
          )}
          <p className="text-xs sm:text-sm text-[#9FB0C8] mt-1.5 font-medium">Continue de onde parou</p>
        </div>

        {/* Motivational Quote Pill from Design Reference Images */}
        <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-[#17243A] via-[#1C2C47] to-[#17243A] border border-[#2A3A55] text-xs text-[#9FB0C8] flex items-center gap-2.5">
          <span className="text-[#F5B93A] font-serif text-lg leading-none select-none">“</span>
          <span className="italic text-[#E8EDF5] leading-snug">
            Planejamento, conhecimento e segurança constroem resultados.
          </span>
        </div>

        {/* Global Search Button Bar (Page 5 wireframe) */}
        <button
          onClick={onOpenSearch}
          aria-label="Abrir busca global"
          className={`w-full mt-3 p-3.5 rounded-2xl border text-left flex items-center justify-between transition group shadow-xs ${
            isDark
              ? 'bg-[#17243A] border-[#6B7F9E]/30 text-[#9FB0C8] hover:border-[#5B9BFF]'
              : 'bg-[#FFFFFF] border-[#7B8798]/30 text-[#5B6B82] hover:border-[#1F66D6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-[#5B9BFF]" />
            <span className="text-xs sm:text-sm">Buscar ferramentas, manuais, normas...</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/5 border border-white/5">
            Ctrl+K
          </span>
        </button>
      </section>

      {/* Real-time Gemini Live Card */}
      <section>
        <div
          onClick={() => (onOpenVoiceAssistant ? onOpenVoiceAssistant() : onNavigateModule('ia'))}
          className="cursor-pointer rounded-2xl border p-4 sm:p-5 transition group relative overflow-hidden bg-gradient-to-r from-[#17243A] via-[#1F3354] to-[#17243A] border-[#2A3A55] hover:border-[#5B9BFF] shadow-xs"
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 text-[#5B9BFF] font-semibold">
              <Sparkles className="w-4 h-4 text-[#F5B93A] animate-pulse" />
              <span className="uppercase tracking-wider">Conversação em Tempo Real</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1F66D6] text-white font-bold">
              Gemini Live
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Assistente Técnico de Voz & Texto
              </h3>
              <p className="text-xs text-[#9FB0C8] mt-1">
                Fale ou digite para calcular cabos, tirar dúvidas da NBR 5410, NR-35 e diluições com raciocínio analítico ao vivo.
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#1F66D6] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-[#1F66D6]/30">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Card: Continuar de onde parou (Wireframe Page 5: "Última calculadora Corrente: 17,29 A") */}
      <section>
        <div
          onClick={() => {
            if (onOpenCalculatorWithData && latestCalculation) onOpenCalculatorWithData(latestCalculation);
            else onNavigateModule('calculadoras', 'eletrica');
          }}
          className={`cursor-pointer rounded-2xl border p-4 sm:p-5 transition group relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-r from-[#17243A] to-[#1a2842] border-[#2A3A55] hover:border-[#5B9BFF]/60'
              : 'bg-gradient-to-r from-[#FFFFFF] to-[#F0F4FA] border-[#D9E0EC] hover:border-[#1F66D6]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#9FB0C8] mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#5B9BFF]" />
              <span className="font-semibold uppercase tracking-wider">Última calculadora utilizada</span>
            </div>
            <span className="text-[11px] text-[#3DD68C] font-mono">
              {latestCalculation?.dateStr || 'Sem cálculos'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-white dark:text-white flex items-baseline gap-1.5">
                <span>{latestCalculation?.title || 'Nenhum cálculo salvo'}:</span>
                <span className="text-[#5B9BFF] font-mono">
                  {latestCalculation
                    ? `${latestCalculation.resultValue.toLocaleString('pt-BR')} ${latestCalculation.resultUnit}`
                    : '—'}
                </span>
              </div>
              <p className="text-xs text-[#9FB0C8] mt-1 font-mono">
                {latestCalculation ? `${latestCalculation.formula} · ${latestCalculation.premises}` : 'Faça um cálculo para preencher o resumo.'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#1F66D6]/20 border border-[#1F66D6]/40 flex items-center justify-center shrink-0 group-hover:bg-[#1F66D6] group-hover:text-white transition">
              <ArrowRight className="w-4 h-4 text-[#5B9BFF] group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </section>

      {/* Visual Progress Bar Section: Progresso de Tarefas por Projeto Ativo */}
      {projectStats.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#3DD68C]" />
              <h3 className="font-bold text-sm tracking-tight text-white uppercase opacity-90">
                Progresso das Tarefas por Projeto
              </h3>
            </div>
            {onOpenCalendarModal && (
              <button
                onClick={onOpenCalendarModal}
                className="text-xs text-[#5B9BFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Ver cronograma</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projectStats.map((stat, idx) => {
              const isComplete = stat.percentage === 100;
              return (
                <div
                  key={idx}
                  onClick={onOpenCalendarModal}
                  className={`p-4 rounded-2xl border transition cursor-pointer group space-y-2.5 ${
                    isDark
                      ? 'bg-[#17243A] border-[#2A3A55] hover:border-[#1F66D6] hover:bg-[#1C2C47]'
                      : 'bg-[#FFFFFF] border-[#D9E0EC] hover:border-[#1F66D6] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white group-hover:text-[#5B9BFF] transition truncate">
                        {stat.projectName}
                      </h4>
                      <p className="text-[11px] text-[#9FB0C8]">
                        {stat.completedTasks} de {stat.totalTasks} tarefas concluídas
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                        isComplete
                          ? 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30'
                          : stat.percentage > 0
                          ? 'bg-[#1F66D6]/15 text-[#5B9BFF] border-[#1F66D6]/30'
                          : 'bg-white/5 text-[#9FB0C8] border-white/10'
                      }`}
                    >
                      {stat.percentage}%
                    </span>
                  </div>

                  {/* Visual Progress Bar Track and Gradient Fill */}
                  <div className="w-full bg-[#101827] rounded-full h-3 overflow-hidden p-0.5 border border-white/5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete
                          ? 'bg-gradient-to-r from-[#10B981] to-[#3DD68C]'
                          : 'bg-gradient-to-r from-[#1F66D6] via-[#3B82F6] to-[#5B9BFF]'
                      }`}
                      style={{ width: `${Math.max(stat.percentage, stat.completedTasks > 0 ? 5 : 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-[#9FB0C8]">
                      Status: {stat.completedTasks} concluída(s)
                    </span>
                    <span
                      className={`font-semibold ${
                        stat.pendingTasks > 0 ? 'text-[#F5B93A]' : 'text-[#3DD68C]'
                      }`}
                    >
                      {stat.pendingTasks > 0 ? `${stat.pendingTasks} pendente(s)` : 'Etapa 100% finalizada'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6 Core Modules Grid (Page 2 & 6: Calculadoras, Manuais e NRs, Projetos e Plantas, IA e Estudos, Estética Automotiva, Legislação) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight text-white uppercase opacity-90">
            Módulos Principais
          </h3>
          <span className="text-xs text-[#9FB0C8]">6 ferramentas ativas</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigateModule(mod.id)}
                className={`text-left p-4 rounded-2xl border transition group flex flex-col justify-between min-h-[120px] ${
                  isDark
                    ? 'bg-[#17243A] border-[#2A3A55] hover:border-[#6B7F9E] hover:bg-[#1f2f4c]'
                    : 'bg-[#FFFFFF] border-[#D9E0EC] hover:border-[#1F66D6] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition"
                    style={{
                      backgroundColor: `${mod.color}15`,
                      borderColor: `${mod.color}40`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: mod.color }} />
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                    style={{
                      color: mod.color,
                      borderColor: `${mod.color}40`,
                      backgroundColor: `${mod.color}10`,
                    }}
                  >
                    {mod.badge}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="font-bold text-sm leading-tight text-white group-hover:text-[#5B9BFF] transition-colors">
                    {mod.name}
                  </h4>
                  <p className="text-[11px] text-[#9FB0C8] line-clamp-1 mt-0.5">
                    {mod.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Acesso Rápido (Page 5 wireframe: "NR 35 · Trabalho em altura") */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight text-white uppercase opacity-90">
            Acesso Rápido em Campo
          </h3>
          <span className="text-xs text-[#9FB0C8]">Consultas frequentes</span>
        </div>

        <div className="space-y-2">
          {onOpenCalendarModal && (
            <button
              onClick={onOpenCalendarModal}
              className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                isDark
                  ? 'bg-gradient-to-r from-[#17243A] to-[#1e2a42] border-[#F5B93A]/40 hover:border-[#F5B93A]'
                  : 'bg-[#FFFFFF] border-[#F5B93A]/50 hover:border-[#F5B93A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5B93A]/20 border border-[#F5B93A]/40 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#F5B93A]" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>Cronograma & Prazos da Obra</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#F5B93A]/20 text-[#F5B93A] font-bold">
                      Push & Calendário
                    </span>
                  </div>
                  <div className="text-xs text-[#9FB0C8]">Alertas Android de vistorias e sincronização (.ics / Google)</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#F5B93A]" />
            </button>
          )}

          <button
            onClick={() => onNavigateModule('manuais', 'nr-35')}
            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
              isDark
                ? 'bg-[#17243A] border-[#2A3A55] hover:border-[#3DD68C]'
                : 'bg-[#FFFFFF] border-[#D9E0EC] hover:border-[#1F66D6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#3DD68C]/15 border border-[#3DD68C]/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#3DD68C]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">NR 35 · Trabalho em altura</div>
                <div className="text-xs text-[#9FB0C8]">Checklist de ancoragem, AR e plano de resgate</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9FB0C8]" />
          </button>

          <button
            onClick={() => onNavigateModule('estetica', 'limpa-estofados')}
            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
              isDark
                ? 'bg-[#17243A] border-[#2A3A55] hover:border-[#06B6D4]'
                : 'bg-[#FFFFFF] border-[#D9E0EC] hover:border-[#1F66D6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 text-[#06B6D4]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">Limpa Estofados APC · Diluição 1:10</div>
                <div className="text-xs text-[#9FB0C8]">Tempo de ação 5 a 10 min · pH neutro</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9FB0C8]" />
          </button>

          <button
            onClick={() => onNavigateModule('legislacao', 'sp-coe-16642')}
            className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
              isDark
                ? 'bg-[#17243A] border-[#2A3A55] hover:border-[#EAB308]'
                : 'bg-[#FFFFFF] border-[#D9E0EC] hover:border-[#1F66D6]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EAB308]/15 border border-[#EAB308]/30 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-[#EAB308]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">Código de Obras SP · Lei 16.642/2017</div>
                <div className="text-xs text-[#9FB0C8]">Regras de calçadas, recuos e licenciamento</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9FB0C8]" />
          </button>
        </div>
      </section>

      {/* Fixed bottom guarantee statement (Page 2) */}
      <section className="rounded-2xl border border-[#2A3A55] bg-[#101827]/60 p-4 text-xs text-[#9FB0C8] flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-[#5B9BFF] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white block font-medium">Promessa do produto</strong>
          &ldquo;Tudo que você precisa para consultar, calcular, aprender e organizar — com segurança e responsabilidade.&rdquo;
        </div>
      </section>
    </div>
  );
};
