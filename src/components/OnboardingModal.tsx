/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Moon, Sun, Laptop, Check, AlertTriangle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, ModuleId } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const AVAILABLE_MODULES: { id: ModuleId; title: string; desc: string; icon: string }[] = [
  { id: 'calculadoras', title: 'Calculadoras Técnicas', desc: 'Elétrica, hidráulica, materiais e conversões', icon: '⚡' },
  { id: 'manuais', title: 'Manuais e NRs', desc: 'Normas regulamentadoras e checklists de segurança', icon: '📜' },
  { id: 'projetos', title: 'Projetos e Plantas', desc: 'Editor gráfico com camadas e cotas', icon: '📐' },
  { id: 'ia', title: 'IA e Estudos', desc: 'Estudo solar, ventilação e patologias', icon: '🧠' },
  { id: 'estetica', title: 'Estética Automotiva', desc: 'Catálogo de sujeiras e fichas de produtos com diluição', icon: '✨' },
  { id: 'legislacao', title: 'Legislação Oficial', desc: 'Códigos de obras federal, estadual SP e municipal SP', icon: '⚖️' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState<number>(1);
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([
    'calculadoras',
    'manuais',
    'projetos',
  ]);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);

  if (!isOpen) return null;

  const toggleModule = (id: ModuleId) => {
    if (selectedModules.includes(id)) {
      if (selectedModules.length > 1) {
        setSelectedModules(selectedModules.filter((m) => m !== id));
      }
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const handleFinish = () => {
    if (!responsibilityAccepted) return;
    localStorage.setItem('obra_engep_favorite_modules', JSON.stringify(selectedModules));
    localStorage.setItem('obra_engep_onboarded', 'true');
    onComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Primeira configuração do OBra ENGEP"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#17243A] border border-[#2A3A55] p-6 shadow-2xl text-[#E8EDF5] my-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A3A55]">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#5B9BFF]">
              Passo {step} de 3
            </span>
            <span className="text-xs text-[#9FB0C8]">· Configuração Inicial</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`w-6 h-1.5 rounded-full transition-colors ${
                  step >= i ? 'bg-[#1F66D6]' : 'bg-[#2A3A55]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Theme & Language */}
        {step === 1 && (
          <div className="py-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Bem-vindo ao OBra ENGEP</h2>
              <p className="text-sm text-[#9FB0C8] mt-1">
                Seu manual técnico inteligente para obras, instalações e estética automotiva.
                Escolha a sua preferência visual:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { mode: 'dark' as ThemeMode, label: 'Escuro', sub: 'Padrão campo', Icon: Moon },
                { mode: 'light' as ThemeMode, label: 'Claro', sub: 'Sol forte', Icon: Sun },
                { mode: 'system' as ThemeMode, label: 'Sistema', sub: 'Automático', Icon: Laptop },
              ].map(({ mode, label, sub, Icon }) => {
                const isSelected = theme === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition min-h-[56px] ${
                      isSelected
                        ? 'border-[#1F66D6] bg-[#1F66D6]/15 text-white ring-2 ring-[#1F66D6]/40'
                        : 'border-[#2A3A55] bg-[#101827]/60 text-[#9FB0C8] hover:border-[#6B7F9E]'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5 text-[#5B9BFF]" />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[11px] opacity-70">{sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[#2A3A55] p-3 text-xs text-[#9FB0C8] bg-[#101827]/40 flex items-center justify-between">
              <span>Idioma técnico pré-definido:</span>
              <span className="font-semibold text-white px-2 py-0.5 rounded-md bg-[#1F66D6]/20 text-[#5B9BFF]">
                Português (Brasil) · ABNT
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Favorite Modules */}
        {step === 2 && (
          <div className="py-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Módulos Prioritários</h2>
              <p className="text-sm text-[#9FB0C8] mt-1">
                Selecione as ferramentas que você mais utiliza para acesso rápido na tela inicial:
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {AVAILABLE_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition min-h-[52px] ${
                      isChecked
                        ? 'border-[#1F66D6] bg-[#1F66D6]/15 text-white'
                        : 'border-[#2A3A55] bg-[#101827]/40 text-[#9FB0C8] hover:border-[#6B7F9E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{mod.icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{mod.title}</div>
                        <div className="text-xs text-[#9FB0C8]">{mod.desc}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        isChecked
                          ? 'bg-[#1F66D6] border-[#1F66D6] text-white'
                          : 'border-[#6B7F9E] bg-transparent'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Technical Responsibility & Official Sources */}
        {step === 3 && (
          <div className="py-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#3DD68C]" />
                Segurança e Responsabilidade
              </h2>
              <p className="text-sm text-[#9FB0C8] mt-1">
                Compromisso com o uso técnico responsável e transparência de limites:
              </p>
            </div>

            <div className="rounded-xl border border-[#F5B93A]/40 bg-[#3A2E10]/80 p-4 text-xs space-y-2.5 text-[#F5B93A]">
              <div className="flex items-start gap-2 font-semibold text-sm text-white">
                <AlertTriangle className="w-4 h-4 text-[#F5B93A] shrink-0 mt-0.5" />
                <span>Aviso Técnico Obrigatório</span>
              </div>
              <p className="leading-relaxed opacity-90 text-[#E8EDF5]">
                As calculadoras e estimativas deste aplicativo destinam-se a planejamento preliminar,
                estudos e consultas rápidas. Elas <strong>não substituem</strong> projetos executivos formais,
                análises de risco (AR/APR), permissões de trabalho (PT) ou a responsabilidade técnica de engenheiros e profissionais habilitados (com emissão de ART ou RRT).
              </p>
              <p className="leading-relaxed opacity-90 text-[#E8EDF5]">
                Todo conteúdo técnico, normas ABNT e NRs devem ser consultados em suas fontes oficiais vigentes.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-[#2A3A55] bg-[#101827]/60 cursor-pointer hover:border-[#6B7F9E] transition">
              <input
                type="checkbox"
                checked={responsibilityAccepted}
                onChange={(e) => setResponsibilityAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#6B7F9E] text-[#1F66D6] focus:ring-[#1F66D6]"
              />
              <span className="text-xs text-[#E8EDF5] leading-snug">
                Estou ciente e concordo que os cálculos e orientações são estimativas e que atividades
                regulamentadas exigem validação técnica e cumprimento das normas oficiais vigentes.
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-[#2A3A55] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-[#6B7F9E]/40 text-sm font-medium text-[#9FB0C8] hover:text-white"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-sm font-semibold text-white flex items-center gap-1.5"
            >
              <span>Avançar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!responsibilityAccepted}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition ${
                responsibilityAccepted
                  ? 'bg-[#1F66D6] hover:bg-[#1A57B8] text-white shadow-md'
                  : 'bg-[#2A3A55] text-[#9FB0C8] cursor-not-allowed opacity-60'
              }`}
            >
              <span>Começar a usar</span>
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
