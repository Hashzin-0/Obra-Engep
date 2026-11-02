/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Building2,
  ArrowLeftRight,
  ShieldAlert,
  Info,
  ChevronRight,
  ArrowLeft,
  Bookmark,
  Check,
  Gauge,
  Fuel,
  Layers,
  ShieldCheck,
  Disc,
  Sliders,
  Box,
  Grid,
  Home,
  Scale,
  Cpu,
  Maximize2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  calculateCurrent,
  calculatePower,
  calculateOhmsLawVoltage,
  estimateVoltageDrop,
  calculateReservoirCapacity,
  calculateFlowRate,
  calculateMasonryMaterials,
  calculateRoofArea,
  calculateHazenWilliams,
  calculateRecommendedDiameter,
  calculateCableSizing,
  type CableSizingResult,
} from '../utils/calculations';
import { ResultCard } from '../components/ResultCard';
import { FuelCalculatorView } from './FuelCalculatorView';
import { ElectricalCalculatorsView } from './ElectricalCalculatorsView';
import { ElectricalReferenceToolsView, ELECTRICAL_REFERENCE_TOOLS } from './ElectricalReferenceToolsView';
import { AdvancedElectricalCalculatorView, ADVANCED_ELECTRICAL_TOOLS } from './AdvancedElectricalCalculatorView';
import { ElectricalFormulasView } from './ElectricalFormulasView';
import { LimitBar } from '../components/LimitBar';
import { AlertBanner } from '../components/AlertBanner';
import { CalculationHistoryItem, FavoriteItem } from '../types';

interface CalculatorsViewProps {
  initialCategory?: string;
  onSaveToHistory: (item: CalculationHistoryItem) => void;
  onToggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  prefillItem?: CalculationHistoryItem | null;
}

type CategoryType = 'eletrica' | 'hidraulica' | 'estrutural' | 'outras';

interface ToolDef {
  id: string;
  category: CategoryType;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  isPopular?: boolean;
  tag?: string;
}

const TOOLS_DIRECTORY: ToolDef[] = [
  // ELÉTRICA (from board 3)
  {
    id: 'potencia_corrente',
    category: 'eletrica',
    title: 'Potência, corrente e tensão',
    subtitle: 'Cálculos básicos e avançados monofásicos e trifásicos',
    icon: Zap,
    isPopular: true,
    tag: 'Principal',
  },
  {
    id: 'lei_ohm',
    category: 'eletrica',
    title: 'Lei de Ohm',
    subtitle: 'Tensão, corrente, resistência e potência dissipada',
    icon: Gauge,
  },
  {
    id: 'dimensionamento_cabos',
    category: 'eletrica',
    title: 'Dimensionamento de cabos',
    subtitle: 'Com queda de tensão admissível e proteção NBR 5410',
    icon: Layers,
    tag: 'Normativo',
  },
  {
    id: 'circuitos_disjuntores',
    category: 'eletrica',
    title: 'Circuitos e disjuntores',
    subtitle: 'Seleção da curva (B/C) e capacidade de interrupção',
    icon: ShieldCheck,
  },
  {
    id: 'conversao_eletrica',
    category: 'eletrica',
    title: 'Conversão de unidades elétricas',
    subtitle: 'W, kW, kVA, CV, HP e fatores de conversão',
    icon: ArrowLeftRight,
  },

  {
    id: 'formulas_eletricas',
    category: 'eletrica',
    title: 'Fórmulas Elétricas',
    subtitle: 'Biblioteca de fórmulas, conversões e relações elétricas',
    icon: Grid,
    tag: 'Referência',
  },

  {
    id: 'calculadora_iluminacao',
    category: 'eletrica',
    title: 'Calculadora de iluminação',
    subtitle: 'Iluminância em lux, área, fluxo luminoso e quantidade de lâmpadas',
    icon: Sparkles,
  },
  {
    id: 'capacidade_conducao_corrente',
    category: 'eletrica',
    title: 'Capacidade de condução de corrente',
    subtitle: 'Bitola, método de instalação, isolação e fatores de correção',
    icon: Zap,
    tag: 'Estimativa técnica',
  },
  {
    id: 'calculadora_resistores',
    category: 'eletrica',
    title: 'Calculadora de resistores',
    subtitle: 'Código de cores, resistência nominal e tolerância',
    icon: Cpu,
  },
  {
    id: 'calculadora_corrente',
    category: 'eletrica',
    title: 'Calculadora de corrente',
    subtitle: 'Corrente monofásica e trifásica a partir da potência',
    icon: Gauge,
  },
  {
    id: 'calculadora_fita_led',
    category: 'eletrica',
    title: 'Fonte para fitas de LED',
    subtitle: 'Potência, tensão, corrente, margem da fonte e queda de tensão',
    icon: Zap,
  },

  ...ELECTRICAL_REFERENCE_TOOLS.map((tool) => ({
    id: 'ref_' + tool.id,
    category: 'eletrica' as const,
    title: tool.title,
    subtitle: tool.subtitle,
    icon: Grid,
  })),
  ...ADVANCED_ELECTRICAL_TOOLS.map((tool) => ({
    id: 'calc_' + tool.id,
    category: 'eletrica' as const,
    title: tool.title,
    subtitle: tool.subtitle,
    icon: Zap,
  })),
  
  // HIDRÁULICA
  {
    id: 'reservatorio',
    category: 'hidraulica',
    title: 'Consumo e reservatório predial',
    subtitle: 'Dimensionamento de volume da caixa d’água e reserva',
    icon: Building2,
    isPopular: true,
  },
  {
    id: 'vazao_pressao',
    category: 'hidraulica',
    title: 'Vazão e pressão',
    subtitle: 'Q = Volume / Tempo e conversão de coluna d’água (mca)',
    icon: Droplets,
  },
  {
    id: 'perda_carga',
    category: 'hidraulica',
    title: 'Perda de carga em tubulações',
    subtitle: 'Estimativa por Hazen-Williams para PVC e CPVC',
    icon: Disc,
  },
  {
    id: 'diametro_tubo',
    category: 'hidraulica',
    title: 'Diâmetro recomendado de tubulações',
    subtitle: 'Critérios de velocidade máxima (NBR 5626)',
    icon: Sliders,
  },

  // ESTRUTURAL (INFORMATIVO & APOIO)
  {
    id: 'concreto_materiais',
    category: 'estrutural',
    title: 'Cálculo de concreto e materiais',
    subtitle: 'Traço em volume de cimento, areia, brita e água',
    icon: Box,
    isPopular: true,
  },
  {
    id: 'tabela_aco',
    category: 'estrutural',
    title: 'Tabela de barras de aço CA-50/60',
    subtitle: 'Bitolas comerciais, massa linear e seções (NBR 7480)',
    icon: Grid,
  },
  {
    id: 'calculadora_telhado',
    category: 'estrutural',
    title: 'Calculadora de telhado e cobertura',
    subtitle: 'Área real inclinada e quantitativo com perdas',
    icon: Home,
  },
  {
    id: 'pesos_proprios',
    category: 'estrutural',
    title: 'Pesos próprios de materiais',
    subtitle: 'Cargas permanentes para consulta de projeto (NBR 6120)',
    icon: Scale,
  },

  // OUTRAS / CONVERSÕES
  {
    id: 'conversor_pressao',
    category: 'outras',
    title: 'Conversor de pressão técnica',
    subtitle: 'bar, mca, psi, kPa, kgf/cm² e atm',
    icon: Gauge,
    isPopular: true,
  },
  {
    id: 'conversor_potencia',
    category: 'outras',
    title: 'Conversor de potência mecânica/elétrica',
    subtitle: 'W, kW, CV, HP e BTU/h',
    icon: Cpu,
  },
  {
    id: 'alvenaria_blocos',
    category: 'outras',
    title: 'Alvenaria e consumo de blocos',
    subtitle: 'Área líquida com margem de perda editável em destaque',
    icon: Building2,
  },
  {
    id: 'calculadora_combustivel',
    category: 'outras',
    title: 'Consumo e custos de combustível',
    subtitle: 'Eficiência, custo por km, viagens, autonomia e estudo E85',
    icon: Fuel,
    isPopular: true,
  },
  {
    id: 'conversor_areas',
    category: 'outras',
    title: 'Conversor de áreas e terrenos',
    subtitle: 'm², ft², hectares e alqueires (paulista e mineiro)',
    icon: Maximize2,
  },
];

function parseNumberInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function safeCalculation<T>(callback: () => T): T | null {
  try {
    return callback();
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Valores inválidos.');
    return null;
  }
}

export const CalculatorsView: React.FC<CalculatorsViewProps> = ({
  initialCategory = 'eletrica',
  onSaveToHistory,
  onToggleFavorite,
  isFavorite,
  prefillItem,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Active Category matching board 3: Elétrica, Hidráulica, Estrutural, Outras
  const [activeCategory, setActiveCategory] = useState<CategoryType>(
    initialCategory === 'materiais' || initialCategory === 'conversoes'
      ? 'outras'
      : (initialCategory as CategoryType) || 'eletrica'
  );

  // Selected tool inside category (defaults to 'potencia_corrente' for immediate utility)
  const [selectedToolId, setSelectedToolId] = useState<string | null>('potencia_corrente');


  // Electrical Tab State (Potência, Corrente, Tensão, Cabo)
  const [elecSubTab, setElecSubTab] = useState<'potencia' | 'corrente' | 'tensao' | 'cabo'>('corrente');
  const [elecPower, setElecPower] = useState<number>(Number.NaN); // 3500 W from wireframe
  const [elecVoltage, setElecVoltage] = useState<number>(Number.NaN); // 220 V from wireframe
  const [elecFP, setElecFP] = useState<number>(Number.NaN); // 0.92 from wireframe
  const [elecCurrentInput, setElecCurrentInput] = useState<number>(Number.NaN);
  const [elecResistance, setElecResistance] = useState<number>(Number.NaN);
  const [elecLengthMeters, setElecLengthMeters] = useState<number>(Number.NaN);
  const [elecSectionMm2, setElecSectionMm2] = useState<number>(Number.NaN);
  const [elecResult, setElecResult] = useState<any>(null);
  const [cableResult, setCableResult] = useState<CableSizingResult | null>(null);
  const [elecConvValue, setElecConvValue] = useState<number>(Number.NaN);
  const [elecConvUnit, setElecConvUnit] = useState<'W' | 'kW' | 'CV' | 'HP'>('kW');

  // Hydraulic State
  const [hydOccupants, setHydOccupants] = useState<number>(Number.NaN);
  const [hydConsumptionPerDay, setHydConsumptionPerDay] = useState<number>(Number.NaN);
  const [hydReserveDays, setHydReserveDays] = useState<number>(Number.NaN);
  const [hydVolumeLiters, setHydVolumeLiters] = useState<number>(Number.NaN);
  const [hydTimeMinutes, setHydTimeMinutes] = useState<number>(Number.NaN);
  const [hydPipeLength, setHydPipeLength] = useState<number>(Number.NaN);
  const [hydPipeDiameterMm, setHydPipeDiameterMm] = useState<number>(Number.NaN);
  const [hydResult, setHydResult] = useState<any>(null);
  const [hydFlowLmin, setHydFlowLmin] = useState<number>(Number.NaN);
  const [hydMaxVelocity, setHydMaxVelocity] = useState<number>(Number.NaN);
  const [hydMaterial, setHydMaterial] = useState<'PVC' | 'Cobre' | 'Aço galvanizado'>('PVC');
  const [hydHeadLossResult, setHydHeadLossResult] = useState<any>(null);
  const [hydDiameterResult, setHydDiameterResult] = useState<any>(null);

  // Structural & Materials State
  const [matWallLength, setMatWallLength] = useState<number>(Number.NaN);
  const [matWallHeight, setMatWallHeight] = useState<number>(Number.NaN);
  const [matOpeningsArea, setMatOpeningsArea] = useState<number>(Number.NaN);
  const [matWasteMargin, setMatWasteMargin] = useState<number>(Number.NaN);
  const [matRoofLength, setMatRoofLength] = useState<number>(Number.NaN);
  const [matRoofWidth, setMatRoofWidth] = useState<number>(Number.NaN);
  const [matRoofSlope, setMatRoofSlope] = useState<number>(Number.NaN);
  const [matConcreteVolumeM3, setMatConcreteVolumeM3] = useState<number>(Number.NaN);
  const [matResult, setMatResult] = useState<any>(null);

  // Conversions State
  const [convInputValue, setConvInputValue] = useState<number>(Number.NaN);

  const toggleToolFavorite = (tool: ToolDef) => {
    onToggleFavorite({
      id: tool.id,
      type: 'calculadora',
      title: tool.title,
      subtitle: tool.subtitle,
      moduleId: 'calculadoras',
      metadata: { category: tool.category },
      addedAt: Date.now(),
    });
  };

  // Electrical Handler
  const handleCalcElectric = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const requiredInputs = elecSubTab === 'corrente'
      ? [elecPower, elecVoltage, elecFP]
      : elecSubTab === 'potencia'
        ? [elecVoltage, elecCurrentInput, elecFP]
        : elecSubTab === 'tensao'
          ? [elecResistance, elecCurrentInput]
          : [elecLengthMeters, elecCurrentInput, elecSectionMm2, elecVoltage];
    if (!requiredInputs.every(Number.isFinite)) {
      alert('Preencha todos os campos numéricos antes de calcular.');
      return;
    }
    try {
    if (elecSubTab === 'corrente') {
      const res = calculateCurrent(elecPower, elecVoltage, elecFP);
      setElecResult(res);
      onSaveToHistory({
        id: crypto.randomUUID(),
        title: 'Corrente Elétrica Monofásica',
        category: 'eletrica',
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('pt-BR'),
        resultValue: res.value,
        resultUnit: res.unit,
        formula: res.formula,
        premises: res.premises,
        inputs: { Potência: `${elecPower} W`, Tensão: `${elecVoltage} V`, FP: elecFP },
        limitWarning: res.limitWarning,
      });
    } else if (elecSubTab === 'potencia') {
      const res = calculatePower(elecVoltage, elecCurrentInput, elecFP);
      setElecResult(res);
    } else if (elecSubTab === 'tensao') {
      const res = calculateOhmsLawVoltage(elecResistance, elecCurrentInput);
      setElecResult(res);
    } else if (elecSubTab === 'cabo') {
      const res = estimateVoltageDrop(elecLengthMeters, elecCurrentInput, elecSectionMm2, elecVoltage);
      setElecResult(res);
    }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Valores inválidos para o cálculo.');
    }
  };

  // Filter tools for current category
  const currentCategoryTools = TOOLS_DIRECTORY.filter((t) => t.category === activeCategory);
  const currentTool = TOOLS_DIRECTORY.find((t) => t.id === selectedToolId);

  return (
    <div className="space-y-5 pb-24">
      {/* Top Category Filter Pills (Exact order from Board 3: Elétrica, Hidráulica, Estrutural, Outras) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'eletrica' as CategoryType, label: 'Elétrica', icon: Zap },
          { id: 'hidraulica' as CategoryType, label: 'Hidráulica', icon: Droplets },
          { id: 'estrutural' as CategoryType, label: 'Estrutural', icon: ShieldAlert },
          { id: 'outras' as CategoryType, label: 'Outras', icon: ArrowLeftRight },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveCategory(id);
                // When clicking a category, automatically pick its first prominent tool
                const first = TOOLS_DIRECTORY.find((t) => t.category === id);
                if (first) setSelectedToolId(first.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[44px] ${
                isActive
                  ? 'bg-[#1F66D6] text-white shadow-sm ring-1 ring-blue-400/40'
                  : 'bg-[#17243A] text-[#9FB0C8] hover:text-white border border-[#2A3A55]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                {TOOLS_DIRECTORY.filter((t) => t.category === id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* DIRECTORY VIEW (When selectedToolId is null or as tool list below) */}
      {!selectedToolId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#9FB0C8] px-1">
            <span>Selecione uma ferramenta para calcular:</span>
            <span>{currentCategoryTools.length} calculadoras disponíveis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentCategoryTools.map((tool) => {
              const ToolIcon = tool.icon;
              const isFav = isFavorite(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => setSelectedToolId(tool.id)}
                  className="group relative flex items-center justify-between p-4 rounded-2xl bg-[#17243A] hover:bg-[#1E2E48] border border-[#2A3A55] hover:border-[#1F66D6] transition cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#1F66D6] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
                      <ToolIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white group-hover:text-[#5B9BFF] transition truncate">
                          {tool.title}
                        </h4>
                        {tool.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-[#5B9BFF] font-medium shrink-0">
                            {tool.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9FB0C8] line-clamp-1 mt-0.5">
                        {tool.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleToolFavorite(tool);
                      }}
                      className="p-1.5 text-[#9FB0C8] hover:text-[#F5B93A] transition"
                      title={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isFav ? 'fill-[#F5B93A] text-[#F5B93A]' : ''}`}
                      />
                    </button>
                    <ChevronRight className="w-5 h-5 text-[#6B7F9E] group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footnote card from board 3 */}
          <div className="p-4 rounded-2xl bg-[#17243A]/60 border border-[#2A3A55] text-xs text-[#9FB0C8] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="w-4 h-4 text-[#F5B93A]" />
              <span>Padrão Técnico OBra ENGEP</span>
            </div>
            <p className="leading-relaxed">
              Cada calculadora possui <strong>entrada de dados simples</strong>,{' '}
              <strong>resultados claros e detalhados</strong>, <strong>explicações e fórmulas</strong>{' '}
              e opção de <strong>salvar nos favoritos</strong>. Atualizadas com base nas normas
              técnicas brasileiras (NBR 5410, NBR 5626, NBR 6118, NBR 6120).
            </p>
          </div>
        </div>
      )}

      {/* DEDICATED TOOL CALCULATION SCREEN (When selectedToolId is active) */}
      {selectedToolId && currentTool && (
        <div className="space-y-4">
          {/* Active Tool Sub-header with Back & Favorite Actions */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#17243A] border border-[#2A3A55]">
            <button
              onClick={() => setSelectedToolId(null)}
              className="flex items-center gap-2 text-xs font-semibold text-[#5B9BFF] hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleToolFavorite(currentTool)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 text-xs text-[#E8EDF5] transition"
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    isFavorite(currentTool.id) ? 'fill-[#F5B93A] text-[#F5B93A]' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isFavorite(currentTool.id) ? 'Favoritado' : 'Salvar Favorito'}
                </span>
              </button>
            </div>
          </div>

          {/* 1. ELÉTRICA: POTÊNCIA, CORRENTE E TENSÃO (Exact Screen 3 & 5 from Wireframe) */}
          {currentTool.id === 'potencia_corrente' && (
            <div className="space-y-4">
              {/* Subtabs from board 3: [ Potência ] [ Corrente ] [ Tensão ] [ Cabo ] */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#17243A] border border-[#2A3A55]">
                {[
                  { id: 'potencia', label: 'Potência' },
                  { id: 'corrente', label: 'Corrente' },
                  { id: 'tensao', label: 'Tensão' },
                  { id: 'cabo', label: 'Cabo' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setElecSubTab(st.id as any);
                      // Changing subtabs must only switch the form; calculate only after explicit submit.
                      setElecResult(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-center transition ${
                      elecSubTab === st.id
                        ? 'bg-[#1F66D6] text-white shadow-xs'
                        : 'text-[#9FB0C8] hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Form Inputs (56dp height and #6B7F9E border matching wireframe) */}
              <form onSubmit={handleCalcElectric} className="space-y-4">
                {elecSubTab === 'corrente' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium flex items-center justify-between">
                        <span>Potência (W)</span>
                        <span className="text-[10px] text-white/50">Carga ativa</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={Number.isFinite(elecPower) ? elecPower : ''}
                        onChange={(e) => setElecPower(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg focus:border-[#1F66D6] outline-none"
                        placeholder="Ex: 3500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium flex items-center justify-between">
                        <span>Tensão (V)</span>
                        <span className="text-[10px] text-white/50">127V ou 220V</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={Number.isFinite(elecVoltage) ? elecVoltage : ''}
                        onChange={(e) => setElecVoltage(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg focus:border-[#1F66D6] outline-none"
                        placeholder="Ex: 220"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium flex items-center justify-between">
                        <span>Fator de potência (FP)</span>
                        <span className="text-[10px] text-white/50">cos φ</span>
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.01"
                        value={Number.isFinite(elecFP) ? elecFP : ''}
                        onChange={(e) => setElecFP(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg focus:border-[#1F66D6] outline-none"
                        placeholder="Ex: 0.92"
                      />
                    </div>
                  </div>
                )}

                {elecSubTab === 'potencia' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Tensão (V)</label>
                      <input
                        type="number"
                        value={Number.isFinite(elecVoltage) ? elecVoltage : ''}
                        onChange={(e) => setElecVoltage(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Corrente medida (A)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={Number.isFinite(elecCurrentInput) ? elecCurrentInput : ''}
                        onChange={(e) => setElecCurrentInput(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Fator de potência (FP)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={Number.isFinite(elecFP) ? elecFP : ''}
                        onChange={(e) => setElecFP(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {elecSubTab === 'tensao' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Resistência da carga (Ω)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={Number.isFinite(elecResistance) ? elecResistance : ''}
                        onChange={(e) => setElecResistance(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Corrente no condutor (A)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={Number.isFinite(elecCurrentInput) ? elecCurrentInput : ''}
                        onChange={(e) => setElecCurrentInput(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {elecSubTab === 'cabo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Comprimento do cabo (m)</label>
                      <input
                        type="number"
                        value={Number.isFinite(elecLengthMeters) ? elecLengthMeters : ''}
                        onChange={(e) => setElecLengthMeters(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Seção nominal (mm²)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={Number.isFinite(elecSectionMm2) ? elecSectionMm2 : ''}
                        onChange={(e) => setElecSectionMm2(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB0C8] font-medium">Corrente de projeto (A)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={Number.isFinite(elecCurrentInput) ? elecCurrentInput : ''}
                        onChange={(e) => setElecCurrentInput(parseNumberInput(e.target.value))}
                        className="w-full h-14 px-3.5 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-lg outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Primary Button: "Calcular" (Page 5 wireframe) */}
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Calcular</span>
                </button>
              </form>

              {/* Result Card with formula breakdown legend from board 3 */}
              {elecResult && (
                <ResultCard
                  title={
                    elecSubTab === 'corrente'
                      ? 'Corrente Estimada (A)'
                      : elecSubTab === 'potencia'
                      ? 'Potência Calculada (W)'
                      : elecSubTab === 'tensao'
                      ? 'Tensão Estimada (V)'
                      : 'Queda de Tensão Estimada (%)'
                  }
                  value={elecResult.value}
                  unit={elecResult.unit}
                  formula={elecResult.formula}
                  premises={elecResult.premises}
                  limitWarning={elecResult.limitWarning}
                  formulaLegend={
                    elecSubTab === 'corrente'
                      ? [
                          { symbol: 'I', meaning: 'corrente (A)' },
                          { symbol: 'P', meaning: 'potência (W)' },
                          { symbol: 'V', meaning: 'tensão (V)' },
                          { symbol: 'FP', meaning: 'fator de potência' },
                        ]
                      : elecSubTab === 'potencia'
                      ? [
                          { symbol: 'P', meaning: 'potência ativa (W)' },
                          { symbol: 'V', meaning: 'tensão (V)' },
                          { symbol: 'I', meaning: 'corrente (A)' },
                          { symbol: 'FP', meaning: 'fator de potência' },
                        ]
                      : elecSubTab === 'tensao'
                      ? [
                          { symbol: 'V', meaning: 'tensão elétrica (V)' },
                          { symbol: 'R', meaning: 'resistência (Ω)' },
                          { symbol: 'I', meaning: 'corrente (A)' },
                        ]
                      : [
                          { symbol: 'ΔV', meaning: 'queda de tensão (%)' },
                          { symbol: 'L', meaning: 'comprimento circuito (m)' },
                          { symbol: 'S', meaning: 'seção condutor (mm²)' },
                          { symbol: 'ρ', meaning: 'resistividade do cobre' },
                        ]
                  }
                  onSave={() => {
                    onSaveToHistory({
                      id: crypto.randomUUID(),
                      title: `Cálculo Elétrico - ${elecSubTab}`,
                      category: 'eletrica',
                      timestamp: Date.now(),
                      dateStr: new Date().toLocaleDateString('pt-BR'),
                      resultValue: elecResult.value,
                      resultUnit: elecResult.unit,
                      formula: elecResult.formula,
                      premises: elecResult.premises,
                      inputs: {
                        Potência: `${elecPower} W`,
                        Tensão: `${elecVoltage} V`,
                        FP: elecFP,
                      },
                      limitWarning: elecResult.limitWarning,
                    });
                  }}
                />
              )}

              <LimitBar message="O aplicativo não instrui intervenções em circuitos energizados. Desenergização prévia, bloqueio LOTO e EPIs são mandatórios pela NR-10." />
            </div>
          )}

          {/* 2. ELÉTRICA: LEI DE OHM & DEMAIS FERRAMENTAS ELÉTRICAS */}
          {currentTool.id === 'lei_ohm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Lei de Ohm Fundamental</h3>
                <p className="text-xs text-[#9FB0C8]">
                  Relação direta entre diferença de potencial (V), resistência (R) e fluxo de corrente (I).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Resistência Ôhmica (Ω)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(elecResistance) ? elecResistance : ''}
                      onChange={(e) => setElecResistance(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Corrente Elétrica (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(elecCurrentInput) ? elecCurrentInput : ''}
                      onChange={(e) => setElecCurrentInput(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setElecResult(safeCalculation(() => calculateOhmsLawVoltage(elecResistance, elecCurrentInput)))}
                  className="w-full h-11 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-xs"
                >
                  Calcular Tensão (V = R × I)
                </button>
              </div>

              {elecResult && (
                <ResultCard
                  title="Tensão Resultante (V)"
                  value={elecResult.value}
                  unit={elecResult.unit}
                  formula={elecResult.formula}
                  premises={elecResult.premises}
                  limitWarning={elecResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'V', meaning: 'diferença de potencial (V)' },
                    { symbol: 'R', meaning: 'resistência ôhmica (Ω)' },
                    { symbol: 'I', meaning: 'intensidade da corrente (A)' },
                  ]}
                />
              )}
              <LimitBar message="Valores teóricos para condutores puramente resistivos em corrente contínua ou alternada de fator unitário." />
            </div>
          )}

          {/* 2b. ELÉTRICA: CONVERSÃO DE UNIDADES */}
          {currentTool.id === 'conversao_eletrica' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Conversão de Potência Elétrica/Mecânica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={Number.isFinite(elecConvValue) ? elecConvValue : ''}
                      onChange={(e) => setElecConvValue(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Unidade de origem</label>
                    <select
                      value={elecConvUnit}
                      onChange={(e) => setElecConvUnit(e.target.value as typeof elecConvUnit)}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white mt-1"
                    >
                      <option value="W">Watt (W)</option>
                      <option value="kW">Quilowatt (kW)</option>
                      <option value="CV">Cavalo-vapor (CV)</option>
                      <option value="HP">Horsepower (HP)</option>
                    </select>
                  </div>
                </div>

                {(() => {
                  const factors = { W: 1, kW: 1000, CV: 735.49875, HP: 745.699872 };
                  const watts = elecConvValue * factors[elecConvUnit];
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'W', value: watts },
                        { label: 'kW', value: watts / 1000 },
                        { label: 'CV', value: watts / factors.CV },
                        { label: 'HP', value: watts / factors.HP },
                      ].map((item) => (
                        <div key={item.label} className="p-3 rounded-xl bg-black/25 border border-white/5">
                          <div className="text-[#9FB0C8]">{item.label}</div>
                          <div className="font-mono font-bold text-white text-base mt-1">
                            {Number.isFinite(item.value) ? item.value.toFixed(3) : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <LimitBar message="Conversões usam 1 CV = 735,49875 W e 1 HP = 745,699872 W. Rendimento e fator de potência não estão incluídos." />
            </div>
          )}

          {/* 3. ELÉTRICA: DIMENSIONAMENTO DE CABOS & DISJUNTORES */}
          {(currentTool.id === 'dimensionamento_cabos' || currentTool.id === 'circuitos_disjuntores') && (
            <div className="space-y-4">
              <AlertBanner level="warning" title="Pré-dimensionamento NBR 5410">
                O resultado considera cobre/PVC, método B1, dois condutores carregados e queda de tensão máxima de 4%.
                Agrupamento, temperatura, curto-circuito e coordenação devem ser validados por profissional habilitado.
              </AlertBanner>

              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Potência (W)</label>
                    <input
                      type="number"
                      min="1"
                      value={Number.isFinite(elecPower) ? elecPower : ''}
                      onChange={(e) => setElecPower(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Tensão (V)</label>
                    <input
                      type="number"
                      min="1"
                      value={Number.isFinite(elecVoltage) ? elecVoltage : ''}
                      onChange={(e) => setElecVoltage(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Fator de potência</label>
                    <input
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={Number.isFinite(elecFP) ? elecFP : ''}
                      onChange={(e) => setElecFP(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Comprimento do circuito (m)</label>
                    <input
                      type="number"
                      min="1"
                      value={Number.isFinite(elecLengthMeters) ? elecLengthMeters : ''}
                      onChange={(e) => setElecLengthMeters(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    try {
                      setCableResult(safeCalculation(() => calculateCableSizing(elecPower, elecVoltage, elecFP, elecLengthMeters)));
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Valores inválidos.');
                    }
                  }}
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Cabo e Disjuntor
                </button>
              </div>

              {cableResult && (
                <ResultCard
                  title="Seção e Proteção Sugeridas"
                  value={`${cableResult.sectionMm2} mm² / ${cableResult.breakerA || '—'} A`}
                  unit=""
                  formula={cableResult.formula}
                  premises={cableResult.premises}
                  limitWarning={cableResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'IB', meaning: 'corrente de projeto (A)' },
                    { symbol: 'In', meaning: 'corrente nominal do disjuntor (A)' },
                    { symbol: 'Iz', meaning: 'capacidade de condução do cabo (A)' },
                    { symbol: 'ΔV', meaning: 'queda de tensão percentual' },
                  ]}
                  secondaryDetails={[
                    { label: 'Corrente de projeto', value: `${cableResult.currentA} A` },
                    { label: 'Capacidade Iz do cabo', value: `${cableResult.ampacityA} A` },
                    { label: 'Queda de tensão', value: `${cableResult.voltageDropPercent}%` },
                    { label: 'Disjuntor sugerido', value: cableResult.breakerA ? `${cableResult.breakerA} A` : 'Revisar' },
                  ]}
                />
              )}

              <LimitBar message="Não altere disjuntores sem redimensionar a fiação existente. A escolha final exige verificação de curto-circuito e ART." />
            </div>
          )}

          {/* 4. HIDRÁULICA: CONSUMO E RESERVATÓRIO PREDIAL */}
          {currentTool.id === 'reservatorio' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Dimensionamento de Reservatório de Água (NBR 5626)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Ocupantes Fixos</label>
                    <input
                      type="number"
                      min="1"
                      value={Number.isFinite(hydOccupants) ? hydOccupants : ''}
                      onChange={(e) => setHydOccupants(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Consumo per capita (L/dia)</label>
                    <input
                      type="number"
                      min="50"
                      step="10"
                      value={Number.isFinite(hydConsumptionPerDay) ? hydConsumptionPerDay : ''}
                      onChange={(e) => setHydConsumptionPerDay(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                    <span className="text-[10px] text-[#9FB0C8]">Padrão residencial: 150 L</span>
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Dias de Autonomia</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={Number.isFinite(hydReserveDays) ? hydReserveDays : ''}
                      onChange={(e) => setHydReserveDays(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                    <span className="text-[10px] text-[#9FB0C8]">Mínimo NBR: 2 dias</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setHydResult(safeCalculation(() => calculateReservoirCapacity(hydOccupants, hydConsumptionPerDay, hydReserveDays)))
                  }
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Capacidade do Reservatório
                </button>
              </div>

              {hydResult && (
                <ResultCard
                  title="Capacidade Mínima do Reservatório"
                  value={hydResult.value}
                  unit={hydResult.unit}
                  formula={hydResult.formula}
                  premises={hydResult.premises}
                  limitWarning={hydResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'V', meaning: 'volume mínimo do reservatório (Litros)' },
                    { symbol: 'N', meaning: 'número de ocupantes da edificação' },
                    { symbol: 'q', meaning: 'consumo per capita diário (L/hab/dia)' },
                    { symbol: 'D', meaning: 'dias de autonomia de reserva (dias)' },
                  ]}
                  secondaryDetails={[
                    {
                      label: 'Caixa Comercial Recomendada',
                      value: `${Math.ceil(hydResult.value / 500) * 500} Litros`,
                    },
                    {
                      label: 'Divisão Recomendada',
                      value: '60% Inferior / 40% Superior',
                    },
                  ]}
                />
              )}

              <LimitBar message="Estimativa para consumo doméstico. Edificações comerciais ou multifamiliares exigem reserva técnica de incêndio (RTI) obrigatória conforme norma do Corpo de Bombeiros." />
            </div>
          )}

          {/* 5. HIDRÁULICA: VAZÃO E PRESSÃO */}
          {currentTool.id === 'vazao_pressao' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Vazão Volumétrica e Pressão Dinâmica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Volume Coletado (Litros)</label>
                    <input
                      type="number"
                      value={Number.isFinite(hydVolumeLiters) ? hydVolumeLiters : ''}
                      onChange={(e) => setHydVolumeLiters(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Tempo Medido (minutos)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(hydTimeMinutes) ? hydTimeMinutes : ''}
                      onChange={(e) => setHydTimeMinutes(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setHydResult(safeCalculation(() => calculateFlowRate(hydVolumeLiters, hydTimeMinutes)))}
                  className="w-full h-11 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-xs"
                >
                  Calcular Vazão Q (L/min)
                </button>
              </div>

              {hydResult && (
                <ResultCard
                  title="Vazão Aferida"
                  value={hydResult.value}
                  unit={hydResult.unit}
                  formula={hydResult.formula}
                  premises={hydResult.premises}
                  limitWarning={hydResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'Q', meaning: 'vazão volumétrica (L/min)' },
                    { symbol: 'V', meaning: 'volume líquido coletado (L)' },
                    { symbol: 't', meaning: 'tempo decorrido (min)' },
                  ]}
                />
              )}

              <LimitBar message="Unidades padronizadas sem ambiguidade: pressão (mca), vazão (L/min) e volume (Litros). Verifique sempre se a pressão dinâmica no ponto mais desfavorável é ≥ 1,0 mca (NBR 5626)." />
            </div>
          )}

          {/* 5b. HIDRÁULICA: PERDA DE CARGA */}
          {currentTool.id === 'perda_carga' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Perda de Carga por Hazen-Williams</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Vazão (L/min)</label>
                    <input
                      type="number"
                      min="0.1"
                      value={Number.isFinite(hydFlowLmin) ? hydFlowLmin : ''}
                      onChange={(e) => setHydFlowLmin(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Comprimento (m)</label>
                    <input
                      type="number"
                      min="0.1"
                      value={Number.isFinite(hydPipeLength) ? hydPipeLength : ''}
                      onChange={(e) => setHydPipeLength(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Diâmetro interno (mm)</label>
                    <input
                      type="number"
                      min="1"
                      value={Number.isFinite(hydPipeDiameterMm) ? hydPipeDiameterMm : ''}
                      onChange={(e) => setHydPipeDiameterMm(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Material</label>
                    <select
                      value={hydMaterial}
                      onChange={(e) => setHydMaterial(e.target.value as typeof hydMaterial)}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white mt-1"
                    >
                      <option value="PVC">PVC (C=150)</option>
                      <option value="Cobre">Cobre (C=130)</option>
                      <option value="Aço galvanizado">Aço galvanizado (C=120)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    try {
                      setHydHeadLossResult(
                        calculateHazenWilliams(hydFlowLmin, hydPipeLength, hydPipeDiameterMm, hydMaterial)
                      );
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Valores inválidos.');
                    }
                  }}
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Perda de Carga
                </button>
              </div>

              {hydHeadLossResult && (
                <ResultCard
                  title="Perda de Carga Distribuída"
                  value={hydHeadLossResult.value}
                  unit={hydHeadLossResult.unit}
                  formula={hydHeadLossResult.formula}
                  premises={hydHeadLossResult.premises}
                  limitWarning={hydHeadLossResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'hf', meaning: 'perda de carga (mca)' },
                    { symbol: 'L', meaning: 'comprimento da tubulação (m)' },
                    { symbol: 'Q', meaning: 'vazão (m³/s)' },
                    { symbol: 'C', meaning: 'coeficiente de rugosidade' },
                    { symbol: 'D', meaning: 'diâmetro interno (m)' },
                  ]}
                />
              )}

              <LimitBar message="Perdas localizadas (joelhos, registros, tês) não estão incluídas. Some o comprimento equivalente para o cálculo final." />
            </div>
          )}

          {/* 5c. HIDRÁULICA: DIÂMETRO RECOMENDADO */}
          {currentTool.id === 'diametro_tubo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Diâmetro Recomendado por Velocidade</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Vazão (L/min)</label>
                    <input
                      type="number"
                      min="0.1"
                      value={Number.isFinite(hydFlowLmin) ? hydFlowLmin : ''}
                      onChange={(e) => setHydFlowLmin(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Velocidade máxima (m/s)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={Number.isFinite(hydMaxVelocity) ? hydMaxVelocity : ''}
                      onChange={(e) => setHydMaxVelocity(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    try {
                      setHydDiameterResult(safeCalculation(() => calculateRecommendedDiameter(hydFlowLmin, hydMaxVelocity)));
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Valores inválidos.');
                    }
                  }}
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Diâmetro
                </button>
              </div>

              {hydDiameterResult && (
                <ResultCard
                  title="Diâmetro Comercial Sugerido"
                  value={hydDiameterResult.value}
                  unit={hydDiameterResult.unit}
                  formula={hydDiameterResult.formula}
                  premises={hydDiameterResult.premises}
                  limitWarning={hydDiameterResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'D', meaning: 'diâmetro interno (mm)' },
                    { symbol: 'Q', meaning: 'vazão (m³/s)' },
                    { symbol: 'v', meaning: 'velocidade máxima (m/s)' },
                  ]}
                />
              )}

              <LimitBar message="Confirme o diâmetro interno real do tubo (PN e fabricante). O diâmetro nominal externo não é o mesmo usado no cálculo hidráulico." />
            </div>
          )}

          {/* 6. ESTRUTURAL: CONCRETO, TABELA DE AÇO, TELHADO */}
          {currentTool.id === 'concreto_materiais' && (
            <div className="space-y-4">
              <AlertBanner level="info" title="Traço de Concreto para Apoio de Obra">
                Traço em volume convencional (1 : 2 : 3) para concreto não-estrutural ou fck ~20 MPa. Não substitui ensaios laboratoriais e projeto de dosagem formal.
              </AlertBanner>

              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <label className="text-xs text-[#9FB0C8]">Volume total de concreto necessário (m³):</label>
                <input
                  type="number"
                  step="0.1"
                  value={Number.isFinite(matConcreteVolumeM3) ? matConcreteVolumeM3 : ''}
                  onChange={(e) => setMatConcreteVolumeM3(parseNumberInput(e.target.value))}
                  className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono"
                />

                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5 text-center">
                    <span className="text-[#9FB0C8]">Cimento (~50kg)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Math.ceil(matConcreteVolumeM3 * 7)} sacos
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5 text-center">
                    <span className="text-[#9FB0C8]">Areia Média</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {(matConcreteVolumeM3 * 0.65).toFixed(2)} m³
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5 text-center">
                    <span className="text-[#9FB0C8]">Brita 1</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {(matConcreteVolumeM3 * 0.85).toFixed(2)} m³
                    </div>
                  </div>
                </div>
              </div>

              <LimitBar message="O OBra ENGEP não realiza dimensionamento automático de peças estruturais (vigas, pilares ou sapatas). Todo concreto estrutural requer responsável técnico habilitado com ART/CREA." />
            </div>
          )}

          {currentTool.id === 'tabela_aco' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h4 className="font-semibold text-sm text-white">Tabela de Barras de Aço CA-50 (NBR 7480)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[#9FB0C8] border-b border-[#2A3A55]">
                      <tr>
                        <th className="py-2">Bitola (mm)</th>
                        <th className="py-2">Bitola (pol)</th>
                        <th className="py-2">Massa Linear (kg/m)</th>
                        <th className="py-2">Área (cm²)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A3A55] text-white font-mono">
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">6.3 mm</td>
                        <td>1/4&quot;</td>
                        <td>0,245 kg/m</td>
                        <td>0,312 cm²</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">8.0 mm</td>
                        <td>5/16&quot;</td>
                        <td>0,395 kg/m</td>
                        <td>0,503 cm²</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">10.0 mm</td>
                        <td>3/8&quot;</td>
                        <td>0,617 kg/m</td>
                        <td>0,785 cm²</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">12.5 mm</td>
                        <td>1/2&quot;</td>
                        <td>0,963 kg/m</td>
                        <td>1,227 cm²</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">16.0 mm</td>
                        <td>5/8&quot;</td>
                        <td>1,578 kg/m</td>
                        <td>2,011 cm²</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-[#5B9BFF]">20.0 mm</td>
                        <td>3/4&quot;</td>
                        <td>2,466 kg/m</td>
                        <td>3,142 cm²</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <LimitBar message="Dados apenas para consulta de estimativa de armaduras. O detalhamento estrutural de ancoragens e dobras deve seguir rigorosamente a NBR 6118." />
            </div>
          )}

          {currentTool.id === 'calculadora_telhado' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Calculadora de Telhado e Inclinação Real</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Comprimento (m)</label>
                    <input
                      type="number"
                      value={Number.isFinite(matRoofLength) ? matRoofLength : ''}
                      onChange={(e) => setMatRoofLength(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Largura (m)</label>
                    <input
                      type="number"
                      value={Number.isFinite(matRoofWidth) ? matRoofWidth : ''}
                      onChange={(e) => setMatRoofWidth(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Inclinação (%)</label>
                    <input
                      type="number"
                      value={Number.isFinite(matRoofSlope) ? matRoofSlope : ''}
                      onChange={(e) => setMatRoofSlope(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#F5B93A] font-bold">Perda (%)</label>
                    <input
                      type="number"
                      value={Number.isFinite(matWasteMargin) ? matWasteMargin : ''}
                      onChange={(e) => setMatWasteMargin(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border-2 border-[#F5B93A] text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={() =>
                    setMatResult(safeCalculation(() => calculateRoofArea(matRoofLength, matRoofWidth, matRoofSlope, matWasteMargin)))
                  }
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Área Real Inclinada
                </button>
              </div>

              {matResult && (
                <ResultCard
                  title="Área Real Inclinada do Telhado"
                  value={matResult.realAreaM2}
                  unit="m²"
                  formula="Área Real = (L × W / cos(arctg(i%))) × (1 + Margem)"
                  premises={matResult.premises}
                  limitWarning={matResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'A_real', meaning: 'área inclinada real (m²)' },
                    { symbol: 'L × W', meaning: 'área projetada na planta baixa (m²)' },
                    { symbol: 'i%', meaning: 'inclinação da cobertura em porcentagem' },
                    { symbol: 'Margem', meaning: 'margem para recortes e sobreposições (%)' },
                  ]}
                  secondaryDetails={[
                    {
                      label: 'Estimativa de Telhas Cerâmicas',
                      value: `~${matResult.tileCountEstimate} unidades`,
                    },
                  ]}
                />
              )}

              <LimitBar message="A inclinação mínima deve respeitar a recomendação do fabricante da telha (cerâmica, fibrocimento ou metálica) para evitar refluxo de água." />
            </div>
          )}

          {currentTool.id === 'pesos_proprios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h4 className="font-semibold text-white text-sm">Pesos Próprios de Materiais de Construção (NBR 6120)</h4>
                <ul className="list-disc pl-5 text-xs text-[#9FB0C8] space-y-1.5">
                  <li><strong className="text-white">Concreto simples:</strong> 24 kN/m³ (2.400 kgf/m³)</li>
                  <li><strong className="text-white">Concreto armado:</strong> 25 kN/m³ (2.500 kgf/m³)</li>
                  <li><strong className="text-white">Alvenaria de tijolos furados:</strong> 13 kN/m³</li>
                  <li><strong className="text-white">Alvenaria de tijolos maciços:</strong> 18 kN/m³</li>
                  <li><strong className="text-white">Argamassa de cimento e areia:</strong> 21 kN/m³</li>
                  <li><strong className="text-white">Aço estrutural:</strong> 78,5 kN/m³</li>
                </ul>
              </div>
              <LimitBar message="Valores médios para cálculo de ações permanentes na estrutura conforme NBR 6120." />
            </div>
          )}

          {/* 7. OUTRAS / CONVERSÕES: PRESSÃO, POTÊNCIA, ALVENARIA */}
          {currentTool.id === 'conversor_pressao' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <label className="text-xs text-[#9FB0C8]">Valor em bar:</label>
                <input
                  type="number"
                  value={Number.isFinite(convInputValue) ? convInputValue : ''}
                  onChange={(e) => setConvInputValue(parseNumberInput(e.target.value))}
                  className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">mca (Col. d’Água)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 10.197).toFixed(2)} mca` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">psi (lbf/in²)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 14.5038).toFixed(2)} psi` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">kPa</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 100).toFixed(1)} kPa` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">kgf/cm²</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 1.0197).toFixed(2)} kgf/cm²` : '—'}
                    </div>
                  </div>
                </div>
              </div>
              <LimitBar message="Conversão física padrão SI de pressão para especificações hidráulicas e pneumáticas." />
            </div>
          )}

          {currentTool.id === 'conversor_potencia' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <label className="text-xs text-[#9FB0C8]">Valor em Watts (W):</label>
                <input
                  type="number"
                  value={Number.isFinite(convInputValue) ? convInputValue : ''}
                  onChange={(e) => setConvInputValue(parseNumberInput(e.target.value))}
                  className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Quilowatts (kW)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 1000).toFixed(3)} kW` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Cavalo-Vapor (CV)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 735.5).toFixed(3)} CV` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Horse Power (HP)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 745.7).toFixed(3)} HP` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">BTU/h térmico</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 3.412142).toFixed(1)} BTU/h` : '—'}
                    </div>
                  </div>
                </div>
              </div>
              <LimitBar message="1 CV = 735,5 W (norma DIN). 1 HP = 745,7 W (sistema imperial britânico)." />
            </div>
          )}

          {currentTool.id === 'alvenaria_blocos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <h3 className="font-semibold text-white text-sm">Quantitativo de Alvenaria e Margem de Perda</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Comprimento (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(matWallLength) ? matWallLength : ''}
                      onChange={(e) => setMatWallLength(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Altura (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(matWallHeight) ? matWallHeight : ''}
                      onChange={(e) => setMatWallHeight(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9FB0C8]">Vãos (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(matOpeningsArea) ? matOpeningsArea : ''}
                      onChange={(e) => setMatOpeningsArea(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#F5B93A] font-bold">Margem Perda (%)</label>
                    <input
                      type="number"
                      value={Number.isFinite(matWasteMargin) ? matWasteMargin : ''}
                      onChange={(e) => setMatWasteMargin(parseNumberInput(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border-2 border-[#F5B93A] text-white font-mono mt-1 ring-2 ring-[#F5B93A]/20"
                    />
                  </div>
                </div>

                <button
                  onClick={() =>
                    setMatResult(
                      safeCalculation(() => calculateMasonryMaterials(matWallLength, matWallHeight, matOpeningsArea, 25, matWasteMargin))
                    )
                  }
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Calcular Quantitativo com Margem
                </button>
              </div>

              {matResult && (
                <ResultCard
                  title="Tijolos / Blocos Estimados"
                  value={matResult.totalBricks}
                  unit="unidades"
                  formula="Q = Área Líquida × Consumo/m² × (1 + Margem)"
                  premises={matResult.premises}
                  limitWarning={matResult.limitWarning}
                  formulaLegend={[
                    { symbol: 'Q', meaning: 'quantidade total de blocos' },
                    { symbol: 'A_líq', meaning: 'área líquida descontados vãos (m²)' },
                    { symbol: 'Consumo', meaning: 'consumo nominal de peças por m²' },
                    { symbol: 'Margem', meaning: 'porcentagem para quebras e recortes (%)' },
                  ]}
                  secondaryDetails={[
                    { label: 'Área Líquida da Parede', value: `${matResult.netAreaM2} m²` },
                    { label: 'Argamassa Estimada (~50kg)', value: `~${matResult.mortarBagsEstimate} sacos` },
                  ]}
                />
              )}

              <LimitBar message="Valores para estimativa preliminar de compras. Variações dimensionais de blocos cerâmicos ou de concreto devem ser conferidas no lote entregue." />
            </div>
          )}

          {currentTool.id === 'calculadora_iluminacao' && <ElectricalCalculatorsView mode="lighting" />}
          {currentTool.id === 'capacidade_conducao_corrente' && <ElectricalCalculatorsView mode="ampacity" />}
          {currentTool.id === 'calculadora_resistores' && <ElectricalCalculatorsView mode="resistor" />}
          {currentTool.id === 'calculadora_corrente' && <ElectricalCalculatorsView mode="current" />}
          {currentTool.id === 'calculadora_fita_led' && <ElectricalCalculatorsView mode="led-strip" />}
          {currentTool.id.startsWith('ref_') && <ElectricalReferenceToolsView toolId={currentTool.id.slice(4)} title={currentTool.title} />}
          {currentTool.id.startsWith('calc_') && <AdvancedElectricalCalculatorView toolId={currentTool.id.slice(5)} title={currentTool.title} />}
          {currentTool.id === 'formulas_eletricas' && <ElectricalFormulasView />}

          {currentTool.id === 'calculadora_combustivel' && <FuelCalculatorView />}

          {currentTool.id === 'conversor_areas' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3">
                <label className="text-xs text-[#9FB0C8]">Área de entrada em Metros Quadrados (m²):</label>
                <input
                  type="number"
                  value={Number.isFinite(convInputValue) ? convInputValue : ''}
                  onChange={(e) => setConvInputValue(parseNumberInput(e.target.value))}
                  className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Hectares (ha)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 10000).toFixed(4)} ha` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Alqueire Paulista</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 24200).toFixed(4)} alq` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Pés Quadrados (ft²)</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue * 10.7639).toFixed(1)} ft²` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/5">
                    <span className="text-[#9FB0C8]">Alqueire Mineiro</span>
                    <div className="text-base font-bold font-mono text-white mt-1">
                      {Number.isFinite(convInputValue) ? `${(convInputValue / 48400).toFixed(4)} alq` : '—'}
                    </div>
                  </div>
                </div>
              </div>
              <LimitBar message="1 Alqueire Paulista = 24.200 m². 1 Alqueire Mineiro = 48.400 m² (2 alqueires paulistas)." />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
