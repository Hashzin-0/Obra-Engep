/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Scale,
  Car,
  FileCheck2,
  ExternalLink,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Sparkles,
  Search,
  Filter,
  Bookmark,
  Share2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  INITIAL_NRS,
  INITIAL_ABNT,
  INITIAL_LEGISLATION,
  INITIAL_DIRT_CATALOG,
  INITIAL_PRODUCTS,
} from '../data/initialData';
import { SourceSeal } from '../components/SourceSeal';
import { AlertBanner } from '../components/AlertBanner';
import { LimitBar } from '../components/LimitBar';
import { NRItem, AutomotiveProductItem, FavoriteItem } from '../types';

interface LibraryViewProps {
  initialTab?: 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';
  initialItemId?: string;
  onAddFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
}

type LibrarySection = 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';

export const LibraryView: React.FC<LibraryViewProps> = ({
  initialTab = 'nrs',
  initialItemId,
  onAddFavorite,
  isFavorite,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [activeSection, setActiveSection] = useState<LibrarySection>(initialTab);
  const [selectedNRId, setSelectedNRId] = useState<string>(initialItemId || 'nr-35');
  const [selectedLegJurisdiction, setSelectedLegJurisdiction] = useState<string>('todos');
  const [selectedEsteticaTab, setSelectedEsteticaTab] = useState<'sujeiras' | 'produtos' | 'diluidor'>('produtos');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialItemId === 'limpa-estofados' ? 'p-1' : 'p-1'
  );

  // Dilution calculator inside Aesthetics
  const [dilutionRatio, setDilutionRatio] = useState<number>(10);
  const [targetVolumeMl, setTargetVolumeMl] = useState<number>(1000);

  // Checklists state persisted in memory/localStorage
  const [nrChecklists, setNrChecklists] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('obra_engep_nr_checks');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleCheck = (nrId: string, checkId: string) => {
    setNrChecklists((prev) => {
      const current = prev[nrId] || {};
      const updated = {
        ...prev,
        [nrId]: {
          ...current,
          [checkId]: !current[checkId],
        },
      };
      localStorage.setItem('obra_engep_nr_checks', JSON.stringify(updated));
      return updated;
    });
  };

  const currentNR = INITIAL_NRS.find((nr) => nr.id === selectedNRId) || INITIAL_NRS[0];
  const currentProduct = INITIAL_PRODUCTS.find((p) => p.id === selectedProductId) || INITIAL_PRODUCTS[0];

  return (
    <div className="space-y-5 pb-24">
      {/* Library Top Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'nrs' as LibrarySection, label: 'NRs e Segurança', icon: ShieldCheck },
          { id: 'abnt' as LibrarySection, label: 'Normas ABNT', icon: BookOpen },
          { id: 'legislacao' as LibrarySection, label: 'Legislação & COE', icon: Scale },
          { id: 'estetica' as LibrarySection, label: 'Estética Automotiva', icon: Car },
          { id: 'manuais' as LibrarySection, label: 'Manuais de Serviço', icon: FileCheck2 },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[44px] ${
                isActive
                  ? 'bg-[#1F66D6] text-white shadow-xs'
                  : 'bg-[#17243A] text-[#9FB0C8] hover:text-white border border-[#2A3A55]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: NRs & SEGURANÇA (Screen 11 - Wireframe Page 5) */}
      {activeSection === 'nrs' && (
        <div className="space-y-4">
          {/* Selector of NRs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INITIAL_NRS.map((nr) => {
              const isSelected = nr.id === selectedNRId;
              return (
                <button
                  key={nr.id}
                  onClick={() => setSelectedNRId(nr.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-[#3DD68C] bg-[#12301F]/40 text-white'
                      : 'border-[#2A3A55] bg-[#17243A] text-[#9FB0C8] hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs">{nr.code}</div>
                  <div className="text-[11px] truncate opacity-80">{nr.title}</div>
                </button>
              );
            })}
          </div>

          {/* Detailed NR Screen (Page 5 wireframe) */}
          <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{currentNR.code} · {currentNR.title}</span>
                </h3>
                <div className="mt-2">
                  <SourceSeal type="Oficial" date={currentNR.lastVerified} officialUrl={currentNR.officialUrl} />
                </div>
              </div>
              <button
                onClick={() =>
                  onAddFavorite({
                    id: currentNR.id,
                    type: 'norma',
                    title: `${currentNR.code} · ${currentNR.title}`,
                    subtitle: currentNR.summary,
                    moduleId: 'manuais',
                    addedAt: Date.now(),
                  })
                }
                className="p-2 rounded-xl border border-[#2A3A55] text-[#9FB0C8] hover:text-white"
                aria-label="Favoritar esta norma"
              >
                <Bookmark className={`w-4 h-4 ${isFavorite(currentNR.id) ? 'fill-[#5B9BFF] text-[#5B9BFF]' : ''}`} />
              </button>
            </div>

            {/* Resumo não substitutivo da norma */}
            <div className="p-3.5 rounded-xl bg-black/25 border border-white/5 space-y-2 text-xs">
              <span className="font-semibold text-white uppercase tracking-wider text-[11px] block text-[#5B9BFF]">
                Resumo (não substitui a íntegra da norma)
              </span>
              <p className="text-[#E8EDF5] leading-relaxed">{currentNR.summary}</p>
            </div>

            {/* Scope sections */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#3DD68C] block mb-1">Quando se aplica:</span>
                <span className="text-[#E8EDF5]">{currentNR.applicability}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#5B9BFF] block mb-1">Quem pode executar:</span>
                <span className="text-[#E8EDF5]">{currentNR.authorizedRoles}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#F5B93A] block mb-1">EPI / EPC e Proteções Coletivas:</span>
                <span className="text-[#E8EDF5]">{currentNR.epiEpc}</span>
              </div>
            </div>

            {/* Interactive Checklist (Wireframe Page 5: Checklist de preparação) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-white">Checklist de Preparação em Campo</h4>
                <span className="text-[11px] text-[#3DD68C] font-mono">
                  {Object.values(nrChecklists[currentNR.id] || {}).filter(Boolean).length} de {currentNR.checklist.length} concluídos
                </span>
              </div>

              <div className="space-y-1.5">
                {currentNR.checklist.map((item) => {
                  const isChecked = !!nrChecklists[currentNR.id]?.[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCheck(currentNR.id, item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                        isChecked
                          ? 'bg-[#12301F]/40 border-[#3DD68C]/50 text-white'
                          : 'bg-black/20 border-white/5 text-[#9FB0C8] hover:text-white'
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-[#3DD68C]" />
                        ) : (
                          <Square className="w-5 h-5 text-[#6B7F9E]" />
                        )}
                      </div>
                      <span className={`text-xs ${isChecked ? 'line-through opacity-80' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Official Source Link Button (Page 5 wireframe) */}
            <div className="pt-2">
              <a
                href={currentNR.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span>Abrir fonte oficial do Ministério do Trabalho</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Wireframe Mandatory Note (Page 5): "Este checklist não substitui análise de risco..." */}
            <div className="p-3 rounded-xl bg-[#3A2E10]/50 border border-[#F5B93A]/30 text-[11px] text-[#F5B93A] leading-snug">
              Este checklist não substitui análise de risco (AR/APR), treinamento formal de capacitação, supervisão ou procedimento operacional documentado.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: NORMAS ABNT (Screen 12) */}
      {activeSection === 'abnt' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Direito Autoral e Normas ABNT">
            As normas técnicas da ABNT são protegidas pela Lei Federal nº 9.610/1998. O OBra ENGEP fornece resumos das diretrizes essenciais, referências técnicas e links diretos ao catálogo oficial ABNT, sem cópias integrais não autorizadas.
          </AlertBanner>

          <div className="space-y-3">
            {INITIAL_ABNT.map((norma) => (
              <div
                key={norma.id}
                className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2.5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#5B9BFF]">{norma.code}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#3DD68C]/20 text-[#3DD68C] border border-[#3DD68C]/30">
                        {norma.status} ({norma.editionYear})
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-sm mt-1">{norma.title}</h4>
                    <span className="text-xs text-[#9FB0C8]">Área: {norma.area}</span>
                  </div>
                  <SourceSeal type="Oficial" date={norma.lastVerified} officialUrl={norma.officialUrl} />
                </div>

                <p className="text-xs text-[#E8EDF5] leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                  {norma.summary}
                </p>

                <div className="flex justify-end pt-1">
                  <a
                    href={norma.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5B9BFF] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Consultar no Catálogo ABNT Oficial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <LimitBar message="Normas técnicas definem critérios mínimos de segurança e durabilidade. Consulte sempre a edição oficial mais recente em vigor." />
        </div>
      )}

      {/* SECTION 3: LEGISLAÇÃO (Screen 13) */}
      {activeSection === 'legislacao' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['todos', 'Municipal (SP)', 'Estadual (SP)', 'Federal'].map((jur) => (
              <button
                key={jur}
                onClick={() => setSelectedLegJurisdiction(jur)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedLegJurisdiction === jur
                    ? 'bg-[#1F66D6] text-white'
                    : 'bg-[#17243A] text-[#9FB0C8] border border-[#2A3A55]'
                }`}
              >
                {jur === 'todos' ? 'Todas as Jurisdições' : jur}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {INITIAL_LEGISLATION.filter(
              (leg) => selectedLegJurisdiction === 'todos' || leg.jurisdiction === selectedLegJurisdiction
            ).map((leg) => (
              <div
                key={leg.id}
                className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2.5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1F66D6]/20 text-[#5B9BFF] border border-[#1F66D6]/30">
                        {leg.jurisdiction}
                      </span>
                      {leg.dependsOnTownHall && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F5B93A]/20 text-[#F5B93A] border border-[#F5B93A]/30">
                          Depende da Prefeitura
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1">{leg.code}</h4>
                    <p className="text-xs text-[#9FB0C8]">{leg.title}</p>
                  </div>
                  <SourceSeal type="Oficial" date={leg.lastVerified} officialUrl={leg.officialUrl} />
                </div>

                <p className="text-xs text-[#E8EDF5] leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                  {leg.summary}
                </p>

                <div className="flex justify-end pt-1">
                  <a
                    href={leg.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5B9BFF] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Acessar Diário / Portal da Legislação Oficial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <LimitBar message="Parâmetros de recuos, taxa de ocupação (TO) e coeficiente de aproveitamento (CA) dependem do Plano Diretor Estratégico (PDE) e da Lei de Zoneamento municipal." />
        </div>
      )}

      {/* SECTION 4: ESTÉTICA AUTOMOTIVA (Screens 21, 22, 23, 24 - Wireframe Page 5) */}
      {activeSection === 'estetica' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#17243A] border border-[#2A3A55]">
            <button
              onClick={() => setSelectedEsteticaTab('produtos')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center transition ${
                selectedEsteticaTab === 'produtos' ? 'bg-[#1F66D6] text-white font-semibold' : 'text-[#9FB0C8]'
              }`}
            >
              Fichas de Produtos (Wireframe)
            </button>
            <button
              onClick={() => setSelectedEsteticaTab('sujeiras')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center transition ${
                selectedEsteticaTab === 'sujeiras' ? 'bg-[#1F66D6] text-white font-semibold' : 'text-[#9FB0C8]'
              }`}
            >
              Catálogo de Sujeiras
            </button>
            <button
              onClick={() => setSelectedEsteticaTab('diluidor')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center transition ${
                selectedEsteticaTab === 'diluidor' ? 'bg-[#1F66D6] text-white font-semibold' : 'text-[#9FB0C8]'
              }`}
            >
              Calculadora de Diluição
            </button>
          </div>

          {selectedEsteticaTab === 'produtos' && (
            <div className="space-y-4">
              {/* Product selector buttons */}
              <div className="grid grid-cols-3 gap-2">
                {INITIAL_PRODUCTS.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      prod.id === selectedProductId
                        ? 'border-[#06B6D4] bg-[#06B6D4]/15 text-white'
                        : 'border-[#2A3A55] bg-[#17243A] text-[#9FB0C8]'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{prod.name}</div>
                    <div className="text-[10px] opacity-75">pH {prod.phType}</div>
                  </button>
                ))}
              </div>

              {/* Wireframe Page 5: Ficha do Produto */}
              <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-[#06B6D4]">
                      Ficha Técnica do Produto
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3DD68C]/20 text-[#3DD68C] font-mono border border-[#3DD68C]/30">
                      pH {currentProduct.phType}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-1">{currentProduct.name}</h3>
                  <p className="text-xs text-[#9FB0C8]">
                    {currentProduct.manufacturer} · Superfícies: {currentProduct.targetSurfaces.join(', ')}
                  </p>
                </div>

                {/* 2 Key Metric Boxes (Wireframe Page 5) */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-xs text-[#9FB0C8] block mb-1">Diluição (rótulo)</span>
                    <span className="text-2xl font-bold font-mono text-[#5B9BFF]">
                      {currentProduct.dilutionRatio}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-xs text-[#9FB0C8] block mb-1">Tempo de ação</span>
                    <span className="text-2xl font-bold font-mono text-white">
                      {currentProduct.actionTimeMinutes}
                    </span>
                  </div>
                </div>

                {/* Verification badge matching wireframe */}
                <div className="p-3 rounded-xl bg-[#12301F]/70 border border-[#3DD68C]/40 text-xs text-[#3DD68C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span>✓ Conforme rótulo · foto e lote registrados</span>
                  </div>
                  <span className="text-[11px] font-mono">{currentProduct.verifiedDate}</span>
                </div>
                <div className="text-[11px] text-[#9FB0C8] italic">
                  &ldquo;Diluição sempre com fonte registrada. Nunca inventar dosagens sem ficha técnica.&rdquo;
                </div>

                {/* Cautelas Box (Wireframe Page 5) */}
                <div className="p-4 rounded-xl bg-[#3A2E10] border border-[#F5B93A]/50 text-xs text-[#F5B93A] space-y-1.5">
                  <div className="font-bold text-sm flex items-center gap-1.5 text-white">
                    <AlertTriangle className="w-4 h-4 text-[#F5B93A]" />
                    <span>! Cautelas e Incompatibilidades</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[#E8EDF5]">
                    {currentProduct.cautions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Action button (Wireframe Page 5: Salvar procedimento) */}
                <button
                  onClick={() => {
                    alert(`Procedimento de uso do produto "${currentProduct.name}" salvo no seu Caderno Pessoal!`);
                  }}
                  className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                >
                  Salvar procedimento no Caderno Pessoal
                </button>
              </div>
            </div>
          )}

          {selectedEsteticaTab === 'sujeiras' && (
            <div className="space-y-3">
              {INITIAL_DIRT_CATALOG.map((dirt) => (
                <div
                  key={dirt.id}
                  className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">{dirt.name}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#9FB0C8]">
                      {dirt.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#9FB0C8]">
                    <strong className="text-white">Superfície:</strong> {dirt.surface}
                  </div>
                  <div className="text-xs text-[#E8EDF5] bg-black/20 p-2.5 rounded-xl">
                    <strong className="text-[#3DD68C] block mb-0.5">Abordagem inicial recomendada:</strong>
                    {dirt.approach}
                  </div>
                  <div className="text-xs text-[#F5B93A] bg-[#3A2E10]/40 p-2.5 rounded-xl border border-[#F5B93A]/20">
                    <strong className="block mb-0.5">Cautelas:</strong>
                    {dirt.cautions.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedEsteticaTab === 'diluidor' && (
            <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
              <h4 className="font-bold text-base text-white">Calculadora Prática de Diluição (1:X)</h4>
              <p className="text-xs text-[#9FB0C8]">
                Calcule com precisão a quantidade exata de produto concentrado e de água para preparar borrifadores de 500 mL, 1 L ou baldes.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#9FB0C8]">Proporção indicada no rótulo (1:X)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white text-sm font-bold">1 :</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={dilutionRatio}
                      onChange={(e) => setDilutionRatio(Number(e.target.value))}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#9FB0C8]">Volume total da garrafa (mL)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={targetVolumeMl}
                    onChange={(e) => setTargetVolumeMl(Number(e.target.value))}
                    className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base outline-none"
                  />
                </div>
              </div>

              {/* Calculated Results */}
              <div className="grid grid-cols-2 gap-3 text-center pt-2">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-[#9FB0C8] block mb-1">Volume de Produto</span>
                  <span className="text-3xl font-bold font-mono text-[#06B6D4]">
                    {(targetVolumeMl / (1 + dilutionRatio)).toFixed(1)} mL
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-[#9FB0C8] block mb-1">Volume de Água</span>
                  <span className="text-3xl font-bold font-mono text-white">
                    {(targetVolumeMl - targetVolumeMl / (1 + dilutionRatio)).toFixed(1)} mL
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#3A2E10]/50 border border-[#F5B93A]/30 text-xs text-[#F5B93A]">
                ! Regra de segurança: Sempre adicione a água primeiro no frasco graduado e complete com o produto químico para evitar respingos concentrados.
              </div>
            </div>
          )}

          <LimitBar message="Produtos químicos automotivos exigem ficha de segurança (FISPQ/FDS) e teste prévio em área discreta." />
        </div>
      )}

      {/* SECTION 5: MANUAIS E PROCEDIMENTOS (Screen 10) */}
      {activeSection === 'manuais' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2">
            <h4 className="font-bold text-sm text-white">Procedimento: Instalação de Ponto de Tomada 20A</h4>
            <p className="text-xs text-[#9FB0C8]">
              <strong>Objetivo:</strong> Execução segura de circuito terminal para aparelhos com corrente nominal até 20A conforme NBR 5410.
            </p>
            <div className="text-xs text-[#E8EDF5] space-y-1 pt-1">
              <div>1. Desligar disjuntor geral e aferir ausência de tensão no multímetro.</div>
              <div>2. Passar condutores de 4,0 mm² (Fase, Neutro e Terra).</div>
              <div>3. Conectar terminais respeitando polaridade (Fase à direita, Neutro à esquerda, Terra ao centro).</div>
              <div>4. Fixar suporte e espelho com parafusos sem forçar cabos.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
