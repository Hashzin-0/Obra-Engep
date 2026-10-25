/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sun,
  Wind,
  AlertOctagon,
  Sparkles,
  Compass,
  ArrowRight,
  ShieldAlert,
  Mic,
  MicOff,
  Volume2,
  Send,
  Loader2,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AlertBanner } from '../components/AlertBanner';
import { LimitBar } from '../components/LimitBar';

export type AIModuleTab = 'solar' | 'ventilacao' | 'patologias';

interface AIStudiesViewProps {
  initialTab?: AIModuleTab;
}

export const AIStudiesView: React.FC<AIStudiesViewProps> = ({ initialTab = 'solar' }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [activeTab, setActiveTab] = useState<AIModuleTab>(initialTab);

  // Solar state
  const [latitude, setLatitude] = useState<string>('-23.55 (São Paulo / Região Sudeste)');
  const [buildingOrientation, setBuildingOrientation] = useState<number>(0); // 0 = North facing
  const [solarPeriod, setSolarPeriod] = useState<'verao' | 'inverno' | 'equinocio'>('verao');

  // Ventilation state
  const [windDirection, setWindDirection] = useState<'SE' | 'NE' | 'S' | 'NW'>('SE');
  const [openingLayout, setOpeningLayout] = useState<'opostas' | 'adjacentes' | 'mesma_parede'>('opostas');

  // Pathology state
  const [pathologyType, setPathologyType] = useState<'fissura_diagonal' | 'fissura_vertical' | 'infiltracao' | 'mofo' | 'corrosao'>('fissura_diagonal');
  const [pathologyLocation, setPathologyLocation] = useState<'viga_pilar' | 'alvenaria_vedacao' | 'laje' | 'rodape'>('viga_pilar');
  const [crackWidthMm, setCrackWidthMm] = useState<number>(1.5);

  return (
    <div className="space-y-5 pb-24">
      {/* Module Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'solar' as AIModuleTab, label: 'Estudo Solar', icon: Sun },
          { id: 'ventilacao' as AIModuleTab, label: 'Ventilação Cruzada', icon: Wind },
          { id: 'patologias' as AIModuleTab, label: 'Triagem de Patologias', icon: AlertOctagon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[44px] ${
              activeTab === id
                ? 'bg-[#1F66D6] text-white shadow-xs'
                : 'bg-[#17243A] text-[#9FB0C8] hover:text-white border border-[#2A3A55]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: ESTUDO SOLAR (Screen 18) */}
      {activeTab === 'solar' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Estudo Conceitual de Insolação">
            Análise qualitativa baseada na orientação cardeal e latitude aproximada. Estimativa conceitual que não substitui simulação física computacional com arquivo climático EPW.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Localização / Latitude de Referência</label>
                <input
                  type="text"
                  value={latitude}
                  disabled
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#2A3A55] text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Fachada Principal voltada para:</label>
                <select
                  value={buildingOrientation}
                  onChange={(e) => setBuildingOrientation(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white outline-none"
                >
                  <option value={0}>Norte (0°) — Alta insolação no inverno</option>
                  <option value={90}>Leste (90°) — Sol suave da manhã</option>
                  <option value={180}>Sul (180°) — Pouca insolação direta no inverno</option>
                  <option value={270}>Oeste (270°) — Sol quente da tarde (risco térmico)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Período do ano</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['verao', 'inverno', 'equinocio'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSolarPeriod(p)}
                      className={`h-11 rounded-lg border text-xs font-medium capitalize transition ${
                        solarPeriod === p
                          ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
                          : 'border-[#2A3A55] text-[#9FB0C8]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sun diagram & compass representation */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center justify-center py-6 text-center">
              <div className="relative w-44 h-44 rounded-full border-2 border-dashed border-[#5B9BFF]/40 flex items-center justify-center">
                {/* Cardinal markers */}
                <span className="absolute top-1 text-[11px] font-bold text-[#FF6B6B]">N</span>
                <span className="absolute bottom-1 text-[11px] font-bold text-[#9FB0C8]">S</span>
                <span className="absolute left-1.5 text-[11px] font-bold text-[#9FB0C8]">O</span>
                <span className="absolute right-1.5 text-[11px] font-bold text-[#9FB0C8]">L</span>

                {/* Sun Path Arc */}
                <div className="w-32 h-32 rounded-full border-t-4 border-[#F5B93A] animate-pulse" />
                <div className="absolute flex flex-col items-center">
                  <Sun className="w-8 h-8 text-[#F5B93A] mb-1" />
                  <span className="text-[10px] text-white font-mono font-bold">
                    Azimute: {buildingOrientation}°
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#E8EDF5] mt-3 font-medium">
                {buildingOrientation === 0 && 'Fachada Norte recebe sol generoso ao longo do dia, ideal para dormitórios e salas no hemisfério sul.'}
                {buildingOrientation === 90 && 'Fachada Leste recebe iluminação matinal agradável com aquecimento moderado.'}
                {buildingOrientation === 180 && 'Fachada Sul recebe luz difusa e suave sem radiação direta excessiva.'}
                {buildingOrientation === 270 && 'Fachada Oeste recebe alta carga térmica no período da tarde; recomenda-se brises ou vidros com controle solar.'}
              </p>
            </div>

            {/* Missing data & qualitative confidence (Page 7 requirement: "Confiança qualitativa e 'dados que faltam'") */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-xl bg-[#101827] border border-[#2A3A55] space-y-1">
                <span className="font-bold text-[#3DD68C] block uppercase tracking-wider text-[10px]">
                  Nível de Confiança
                </span>
                <p className="text-white font-medium">Conceitual / Qualitativo (Nível 2 de 5)</p>
                <p className="text-[11px] text-[#9FB0C8]">Válido para zoneamento inicial de ambientes e orientação preliminar.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101827] border border-[#2A3A55] space-y-1">
                <span className="font-bold text-[#F5B93A] block uppercase tracking-wider text-[10px]">
                  Dados que Faltam para Simulação Rigorosa
                </span>
                <p className="text-[11px] text-[#9FB0C8]">
                  • Modelo 3D de edifícios vizinhos (obstrução de sombra)
                  <br />• Fator solar do vidro (FS) e absortância da pintura
                  <br />• Série histórica climática horária (TRY/EPW)
                </p>
              </div>
            </div>
          </div>

          <LimitBar message="O estudo solar preliminar não substitui a comprovação de desempenho térmico da ABNT NBR 15575 realizada por consultor habilitado." />
        </div>
      )}

      {/* SUB-TAB 2: VENTILAÇÃO CRUZADA (Screen 19) */}
      {activeTab === 'ventilacao' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Ventilação Natural e Conforto Higrotérmico">
            Indica caminhos prováveis do fluxo de ar entre aberturas em ambientes habitáveis, indicando incerteza conforme obstáculos internos.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Disposição das Aberturas (Janelas/Portas):</label>
                <select
                  value={openingLayout}
                  onChange={(e) => setOpeningLayout(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white outline-none"
                >
                  <option value="opostas">Paredes Opostas (Fluxo Cruzado Direto — Excelente)</option>
                  <option value="adjacentes">Paredes Adjacentes em 90° (Fluxo Angular — Bom)</option>
                  <option value="mesma_parede">Mesma Parede (Ventilação Unilateral — Baixa)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Vento Dominante Local:</label>
                <select
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white outline-none"
                >
                  <option value="SE">Sudeste (SE) — Frequente no litoral/sudeste</option>
                  <option value="NE">Nordeste (NE) — Vento quente de verão</option>
                  <option value="S">Sul (S) — Frentes frias</option>
                  <option value="NW">Noroeste (NO) — Vento seco</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-[#06B6D4]">
                <Wind className="w-4 h-4" />
                <span>Diagnóstico do Potencial de Ventilação</span>
              </div>
              <p className="text-[#E8EDF5] leading-relaxed">
                {openingLayout === 'opostas' &&
                  'Configuração ideal para lavagem de ar. O gradiente de pressão entre a fachada de barlavento (entrada) e sotavento (saída) maximiza a taxa de renovação e o resfriamento passivo.'}
                {openingLayout === 'adjacentes' &&
                  'Boa circulação de ar com vórtice central. Recomenda-se manter portas internas desobstruídas para evitar zonas mortas de ar estagnado.'}
                {openingLayout === 'mesma_parede' &&
                  'Taxa de ventilação limitada. O ar circula apenas próximo à fachada; recomenda-se ventilação cruzada através de bandeiras ou dutos de exaustão induzida.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#101827] border border-[#2A3A55] text-[11px] text-[#9FB0C8]">
              <strong>Fator de Incerteza:</strong> Presença de divisórias de gesso, móveis altos e portas fechadas reduzem em até 60% o fluxo teórico simulado.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRIAGEM DE PATOLOGIAS (Screen 20) */}
      {activeTab === 'patologias' && (
        <div className="space-y-4">
          {/* Wireframe Page 7: "Sinais de perigo no topo, com orientação de isolar a área" */}
          <AlertBanner
            level="danger"
            title="SINAIS DE PERIGO ESTRUTURAL — PROCEDIMENTO DE URGÊNCIA"
          >
            Se notar fissuras inclinadas em vigas/pilares, flechas excessivas em lajes ou som oco com estalos: <strong>ISOLE IMEDIATAMENTE A ÁREA</strong>, evacue o local de risco e convoque a Defesa Civil ou um Engenheiro Calculista registrado no CREA. O app não emite laudo de estabilidade.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <h4 className="font-bold text-base text-white">Triagem Orientativa de Manifestações Patológicas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Tipo de Manifestação Observada:</label>
                <select
                  value={pathologyType}
                  onChange={(e) => setPathologyType(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white outline-none"
                >
                  <option value="fissura_diagonal">Fissura Inclinada (~45°)</option>
                  <option value="fissura_vertical">Fissura Vertical em Alvenaria</option>
                  <option value="infiltracao">Infiltração com Eflorescência / Bolhas</option>
                  <option value="mofo">Mofo e Bolor Recorrente</option>
                  <option value="corrosao">Armadura de Aço Exposta com Ferrugem</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Elemento Acometido:</label>
                <select
                  value={pathologyLocation}
                  onChange={(e) => setPathologyLocation(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white outline-none"
                >
                  <option value="viga_pilar">Viga ou Pilar de Concreto</option>
                  <option value="alvenaria_vedacao">Parede de Vedação / Tijolos</option>
                  <option value="laje">Laje de Forro ou Piso</option>
                  <option value="rodape">Rodapé / Base da Parede</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#9FB0C8]">Abertura estimada (mm):</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={crackWidthMm}
                  onChange={(e) => setCrackWidthMm(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Triaged Hypothesis Output */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
              <span className="font-bold text-[#F5B93A] uppercase tracking-wider text-[11px] block">
                Hipótese Técnica Preliminar (Triagem)
              </span>

              {pathologyType === 'fissura_diagonal' && pathologyLocation === 'viga_pilar' && (
                <div className="space-y-2 text-[#E8EDF5]">
                  <p className="text-[#FF6B6B] font-bold">
                    ⚠️ ALTO RISCO: Possível tensão cisalhante excessiva ou sobrecarga na viga/pilar.
                  </p>
                  <p>
                    Abertura de {crackWidthMm} mm em elemento de concreto estrutural exige vistoria técnica imediata com fissurômetro de precisão e escoramento preventivo se houver aumento progressivo.
                  </p>
                </div>
              )}

              {pathologyType === 'fissura_diagonal' && pathologyLocation === 'alvenaria_vedacao' && (
                <div className="space-y-2 text-[#E8EDF5]">
                  <p className="text-[#F5B93A] font-bold">
                    ⚠️ RISCO MODERADO: Provável recalque diferencial de fundação ou deformação excessiva da laje de apoio.
                  </p>
                  <p>
                    Instale selos de gesso ou réguas acrílicas para monitorar se a fissura é ativa (continua se movimentando).
                  </p>
                </div>
              )}

              {pathologyType === 'infiltracao' && (
                <div className="space-y-2 text-[#E8EDF5]">
                  <p className="text-[#06B6D4] font-bold">
                    💧 INFILTRAÇÃO OU UMIDADE ASCENDENTE
                  </p>
                  <p>
                    Falha na impermeabilização da viga baldrame ou vazamento em tubulação embutida de água fria/esgoto.
                  </p>
                </div>
              )}

              {pathologyType === 'corrosao' && (
                <div className="space-y-2 text-[#E8EDF5]">
                  <p className="text-[#FF6B6B] font-bold">
                    ⚠️ CORROSÃO DE ARMADURA COM DESPLACAMENTO DO COBRIMENTO
                  </p>
                  <p>
                    Despassivação do aço por carbonatação ou cloretos. Risco de perda de seção de aço útil e desprendimento de blocos de concreto.
                  </p>
                </div>
              )}
            </div>
          </div>

          <LimitBar message="A triagem de patologias do OBra ENGEP fornece apenas hipóteses educativas preliminares. Não substitui Laudo Pericial de Engenharia Diagnóstica." />
        </div>
      )}
    </div>
  );
};
