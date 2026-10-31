/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import {
  DIRT_CATALOG,
  REFERENCE_ABNT,
  REFERENCE_LEGISLATION,
  REFERENCE_NRS,
  SERVICE_MANUALS,
} from '../data/referenceData';
import { SourceSeal } from '../components/SourceSeal';
import { AutomotiveCatalog } from '../components/AutomotiveCatalog';
import { AlertBanner } from '../components/AlertBanner';
import { LimitBar } from '../components/LimitBar';
import { loadMediaUrl, saveMedia } from '../services/mediaStore';
import { ensureAnonymousSession, isSupabaseConfigured, supabase } from '../lib/supabase';
import { loadLibraryItems, sanitizeProductLabel, uploadProductLabel } from '../services/remoteRepository';
import {
  AutomotiveProductItem,
  FavoriteItem,
  ManualItem,
  NotebookNote,
} from '../types';

interface LibraryViewProps {
  initialTab?: 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';
  initialItemId?: string;
  onAddFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  products: AutomotiveProductItem[];
  checklists: Record<string, Record<string, boolean>>;
  onToggleCheck: (normId: string, checkId: string) => void;
  onSaveProduct: (product: AutomotiveProductItem) => void;
  onDeleteProduct: (id: string) => void;
  onSaveNote: (note: NotebookNote) => void;
}

type LibrarySection = 'nrs' | 'abnt' | 'legislacao' | 'estetica' | 'manuais';

const emptyProduct = (): AutomotiveProductItem => ({
  id: crypto.randomUUID(),
  name: '',
  manufacturer: '',
  phType: 'Neutro',
  targetSurfaces: [],
  dilutionRatio: '',
  dilutionNumber: 10,
  actionTimeMinutes: '',
  yieldInfo: '',
  instructions: '',
  cautions: [],
  sourceLabel: '',
  verifiedDate: new Date().toLocaleDateString('pt-BR'),
});

export const LibraryView: React.FC<LibraryViewProps> = ({
  initialTab = 'nrs',
  initialItemId,
  onAddFavorite,
  isFavorite,
  products,
  checklists,
  onToggleCheck,
  onSaveProduct,
  onDeleteProduct,
  onSaveNote,
}) => {
  const [activeSection, setActiveSection] = useState<LibrarySection>(initialTab);
  const [selectedNRId, setSelectedNRId] = useState<string>(initialItemId || REFERENCE_NRS[0].id);
  const [selectedLegJurisdiction, setSelectedLegJurisdiction] = useState<string>('todos');
  const [selectedEsteticaTab, setSelectedEsteticaTab] = useState<'sujeiras' | 'produtos' | 'diluidor' | 'catalogo'>('produtos');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialItemId || products[0]?.id || '');
  const [selectedManualId, setSelectedManualId] = useState<string>(initialItemId || SERVICE_MANUALS[0].id);
  const [dilutionRatio, setDilutionRatio] = useState<number>(Number.NaN);
  const [targetVolumeMl, setTargetVolumeMl] = useState<number>(Number.NaN);
  const [editingProduct, setEditingProduct] = useState<AutomotiveProductItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [referenceNrs, setReferenceNrs] = useState(REFERENCE_NRS);
  const [referenceAbnt, setReferenceAbnt] = useState(REFERENCE_ABNT);
  const [referenceLegislation, setReferenceLegislation] = useState(REFERENCE_LEGISLATION);
  const [serviceManuals, setServiceManuals] = useState(SERVICE_MANUALS);
  const [dirtCatalog, setDirtCatalog] = useState(DIRT_CATALOG);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void loadLibraryItems()
      .then((remote) => {
        if (!active) return;
        if (remote.nrs.length) setReferenceNrs(remote.nrs);
        if (remote.abnt.length) setReferenceAbnt(remote.abnt);
        if (remote.legislation.length) setReferenceLegislation(remote.legislation);
        if (remote.manuals.length) setServiceManuals(remote.manuals);
        if (remote.dirt.length) setDirtCatalog(remote.dirt);
      })
      .catch(() => {
        // Mantém o conteúdo estático verificado como fallback.
      });
    return () => {
      active = false;
    };
  }, []);

  const currentNR = referenceNrs.find((nr) => nr.id === selectedNRId) || referenceNrs[0];
  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const currentManual =
    serviceManuals.find((manual) => manual.id === selectedManualId) || serviceManuals[0];

  const saveProcedure = (product: AutomotiveProductItem) => {
    onSaveNote({
      id: crypto.randomUUID(),
      title: `Procedimento: ${product.name}`,
      content: [
        `Fabricante: ${product.manufacturer || 'não informado'}`,
        `Diluição: ${product.dilutionRatio || 'conforme rótulo'}`,
        `Tempo de ação: ${product.actionTimeMinutes || 'conforme rótulo'}`,
        `Instruções: ${product.instructions}`,
        `Cautelas: ${product.cautions.join('; ')}`,
        `Fonte: ${product.sourceLabel || 'rótulo/FISPQ do fabricante'}`,
      ].join('\n'),
      category: 'Estética',
      tags: ['Produto', product.phType],
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      timestamp: Date.now(),
    });
    setFeedback('Procedimento salvo no Caderno Pessoal.');
    window.setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'nrs' as LibrarySection, label: 'NRs e Segurança', icon: ShieldCheck },
          { id: 'abnt' as LibrarySection, label: 'Normas ABNT', icon: BookOpen },
          { id: 'legislacao' as LibrarySection, label: 'Legislação & COE', icon: Scale },
          { id: 'estetica' as LibrarySection, label: 'Estética Automotiva', icon: Car },
          { id: 'manuais' as LibrarySection, label: 'Manuais de Serviço', icon: FileCheck2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[44px] ${
              activeSection === id
                ? 'bg-[#1F66D6] text-white shadow-xs'
                : 'bg-[#17243A] text-[#9FB0C8] hover:text-white border border-[#2A3A55]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-[#12301F]/70 border border-[#3DD68C]/40 text-xs text-[#3DD68C]">
          {feedback}
        </div>
      )}

      {activeSection === 'nrs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {referenceNrs.map((nr) => (
              <button
                key={nr.id}
                onClick={() => setSelectedNRId(nr.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  nr.id === selectedNRId
                    ? 'border-[#3DD68C] bg-[#12301F]/40 text-white'
                    : 'border-[#2A3A55] bg-[#17243A] text-[#9FB0C8] hover:text-white'
                }`}
              >
                <div className="font-bold text-xs">{nr.code}</div>
                <div className="text-[11px] truncate opacity-80">{nr.title}</div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {currentNR.code} · {currentNR.title}
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

            <div className="p-3.5 rounded-xl bg-black/25 border border-white/5 space-y-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px] block text-[#5B9BFF]">
                Resumo (não substitui a íntegra da norma)
              </span>
              <p className="text-[#E8EDF5] leading-relaxed">{currentNR.summary}</p>
            </div>

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

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-white">Checklist de Preparação em Campo</h4>
                <span className="text-[11px] text-[#3DD68C] font-mono">
                  {Object.values(checklists[currentNR.id] || {}).filter(Boolean).length} de{' '}
                  {currentNR.checklist.length} concluídos
                </span>
              </div>
              <div className="space-y-1.5">
                {currentNR.checklist.map((item) => {
                  const isChecked = !!checklists[currentNR.id]?.[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleCheck(currentNR.id, item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                        isChecked
                          ? 'bg-[#12301F]/40 border-[#3DD68C]/50 text-white'
                          : 'bg-black/20 border-white/5 text-[#9FB0C8] hover:text-white'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-[#3DD68C] shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-[#6B7F9E] shrink-0" />
                      )}
                      <span className={`text-xs ${isChecked ? 'line-through opacity-80' : ''}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <a
              href={currentNR.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Abrir fonte oficial do Ministério do Trabalho</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="p-3 rounded-xl bg-[#3A2E10]/50 border border-[#F5B93A]/30 text-[11px] text-[#F5B93A] leading-snug">
              Este checklist não substitui análise de risco (AR/APR), treinamento formal de capacitação, supervisão ou
              procedimento operacional documentado.
            </div>
          </div>
        </div>
      )}

      {activeSection === 'abnt' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Direito Autoral e Normas ABNT">
            As normas técnicas da ABNT são protegidas pela Lei Federal nº 9.610/1998. O OBra ENGEP fornece resumos das
            diretrizes essenciais, referências técnicas e links diretos ao catálogo oficial ABNT, sem cópias integrais
            não autorizadas.
          </AlertBanner>
          <div className="space-y-3">
            {referenceAbnt.map((norma) => (
              <div key={norma.id} className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2.5">
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
            {referenceLegislation.filter(
              (leg) => selectedLegJurisdiction === 'todos' || leg.jurisdiction === selectedLegJurisdiction
            ).map((leg) => (
              <div key={leg.id} className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2.5">
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
                    <span>Acessar portal oficial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <LimitBar message="Recuos, taxa de ocupação (TO) e coeficiente de aproveitamento (CA) dependem do Plano Diretor e da Lei de Zoneamento municipal." />
        </div>
      )}

      {activeSection === 'estetica' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#17243A] border border-[#2A3A55]">
            {[
              { id: 'produtos' as const, label: 'Meus Produtos' },
              { id: 'catalogo' as const, label: 'Catálogo do site' },
              { id: 'sujeiras' as const, label: 'Catálogo de Sujeiras' },
              { id: 'diluidor' as const, label: 'Calculadora de Diluição' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedEsteticaTab(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-center transition ${
                  selectedEsteticaTab === tab.id ? 'bg-[#1F66D6] text-white font-semibold' : 'text-[#9FB0C8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedEsteticaTab === 'produtos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[#9FB0C8]">
                  Cadastre produtos reais a partir do rótulo/FISPQ. Nenhuma ficha é criada automaticamente.
                </p>
                <button
                  onClick={() => setEditingProduct(emptyProduct())}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1F66D6] text-white text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" /> Novo
                </button>
              </div>

              {products.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-[#2A3A55] bg-[#17243A] text-center space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-[#5B9BFF]" />
                  <h4 className="font-semibold text-white text-sm">Nenhum produto cadastrado</h4>
                  <p className="text-xs text-[#9FB0C8] max-w-sm mx-auto">
                    Adicione o primeiro produto com dados do rótulo, diluição e cautelas. Você poderá salvar o
                    procedimento no Caderno Pessoal.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {products.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => setSelectedProductId(prod.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          prod.id === currentProduct?.id
                            ? 'border-[#06B6D4] bg-[#06B6D4]/15 text-white'
                            : 'border-[#2A3A55] bg-[#17243A] text-[#9FB0C8]'
                        }`}
                      >
                        <div className="font-bold text-xs truncate">{prod.name}</div>
                        <div className="text-[10px] opacity-75">pH {prod.phType}</div>
                      </button>
                    ))}
                  </div>

                  {currentProduct && (
                    <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs uppercase font-bold tracking-wider text-[#06B6D4]">
                            Ficha Técnica do Produto
                          </span>
                          <h3 className="text-2xl font-bold text-white mt-1">{currentProduct.name}</h3>
                          <p className="text-xs text-[#9FB0C8]">
                            {currentProduct.manufacturer || 'Fabricante não informado'} · Superfícies:{' '}
                            {currentProduct.targetSurfaces.join(', ') || 'não informadas'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingProduct(currentProduct)}
                            className="p-2 rounded-xl border border-[#2A3A55] text-[#9FB0C8] hover:text-white"
                            aria-label="Editar produto"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir o produto "${currentProduct.name}"?`)) {
                                onDeleteProduct(currentProduct.id);
                              }
                            }}
                            className="p-2 rounded-xl border border-[#2A3A55] text-[#F87171] hover:text-white"
                            aria-label="Excluir produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-xs text-[#9FB0C8] block mb-1">Diluição (rótulo)</span>
                          <span className="text-2xl font-bold font-mono text-[#5B9BFF]">
                            {currentProduct.dilutionRatio || '—'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-xs text-[#9FB0C8] block mb-1">Tempo de ação</span>
                          <span className="text-2xl font-bold font-mono text-white">
                            {currentProduct.actionTimeMinutes || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#12301F]/70 border border-[#3DD68C]/40 text-xs text-[#3DD68C] flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 shrink-0" /> Dados declarados pelo usuário
                        </span>
                        <span className="text-[11px] font-mono">{currentProduct.verifiedDate}</span>
                      </div>

                      {(currentProduct.labelPhotoReference || currentProduct.labelPhotoStoragePath) && (
                        <ProductLabelPhoto
                          reference={currentProduct.labelPhotoReference}
                          storagePath={currentProduct.labelPhotoStoragePath}
                        />
                      )}

                      {currentProduct.instructions && (
                        <p className="text-xs text-[#E8EDF5] leading-relaxed bg-black/20 p-3 rounded-xl">
                          {currentProduct.instructions}
                        </p>
                      )}

                      {currentProduct.cautions.length > 0 && (
                        <div className="p-4 rounded-xl bg-[#3A2E10] border border-[#F5B93A]/50 text-xs text-[#F5B93A] space-y-1.5">
                          <div className="font-bold text-sm flex items-center gap-1.5 text-white">
                            <AlertTriangle className="w-4 h-4 text-[#F5B93A]" />
                            <span>Cautelas e Incompatibilidades</span>
                          </div>
                          <ul className="list-disc pl-5 space-y-1 text-[#E8EDF5]">
                            {currentProduct.cautions.map((caution, index) => (
                              <li key={index}>{caution}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={() => saveProcedure(currentProduct)}
                        className="w-full h-12 rounded-xl bg-[#1F66D6] hover:bg-[#1A57B8] text-white font-semibold text-sm transition"
                      >
                        Salvar procedimento no Caderno Pessoal
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {selectedEsteticaTab === 'catalogo' && <AutomotiveCatalog />}

          {selectedEsteticaTab === 'sujeiras' && (
            <div className="space-y-3">
              {dirtCatalog.map((dirt) => (
                <div key={dirt.id} className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-2">
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
                Calcule a quantidade de produto concentrado e de água para borrifadores e baldes. Use sempre a proporção
                do rótulo.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#9FB0C8]">Proporção do rótulo (1:X)</label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white text-sm font-bold">1 :</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={Number.isFinite(dilutionRatio) ? dilutionRatio : ''}
                      onChange={(event) => setDilutionRatio(event.target.value.trim() ? Number(event.target.value) : Number.NaN)}
                      className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#9FB0C8]">Volume total (mL)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={Number.isFinite(targetVolumeMl) ? targetVolumeMl : ''}
                    onChange={(event) => setTargetVolumeMl(event.target.value.trim() ? Number(event.target.value) : Number.NaN)}
                    className="w-full h-12 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white font-mono text-base outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center pt-2">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-[#9FB0C8] block mb-1">Volume de Produto</span>
                  <span className="text-3xl font-bold font-mono text-[#06B6D4]">
                    {Number.isFinite(targetVolumeMl) && targetVolumeMl > 0 && Number.isFinite(dilutionRatio) && dilutionRatio >= 1 ? `${(targetVolumeMl / (1 + dilutionRatio)).toFixed(1)} mL` : '—'}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-xs text-[#9FB0C8] block mb-1">Volume de Água</span>
                  <span className="text-3xl font-bold font-mono text-white">
                    {Number.isFinite(targetVolumeMl) && targetVolumeMl > 0 && Number.isFinite(dilutionRatio) && dilutionRatio >= 1 ? `${(targetVolumeMl - targetVolumeMl / (1 + dilutionRatio)).toFixed(1)} mL` : '—'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#3A2E10]/50 border border-[#F5B93A]/30 text-xs text-[#F5B93A]">
                Adicione a água primeiro e complete com o produto para reduzir respingos. Nunca misture produtos
                diferentes.
              </div>
            </div>
          )}

          <LimitBar message="Produtos químicos automotivos exigem FISPQ/FDS e teste prévio em área discreta." />
        </div>
      )}

      {activeSection === 'manuais' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {serviceManuals.map((manual) => (
              <button
                key={manual.id}
                onClick={() => setSelectedManualId(manual.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  manual.id === currentManual.id
                    ? 'border-[#3DD68C] bg-[#12301F]/40 text-white'
                    : 'border-[#2A3A55] bg-[#17243A] text-[#9FB0C8] hover:text-white'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-[#5B9BFF]">{manual.category}</div>
                <div className="text-xs font-semibold mt-0.5">{manual.title}</div>
              </button>
            ))}
          </div>

          <ManualDetail
            manual={currentManual}
            onSave={() => {
              onSaveNote({
                id: crypto.randomUUID(),
                title: `Manual: ${currentManual.title}`,
                content: [
                  currentManual.summary,
                  '',
                  ...currentManual.steps.map((step, index) => `${index + 1}. ${step}`),
                  '',
                  `Cautelas: ${currentManual.cautions.join('; ')}`,
                  `Fonte: ${currentManual.sourceLabel}`,
                ].join('\n'),
                category: currentManual.category,
                tags: ['Manual', currentManual.category],
                updatedAt: new Date().toLocaleDateString('pt-BR'),
                timestamp: Date.now(),
              });
              setFeedback('Manual salvo no Caderno Pessoal.');
              window.setTimeout(() => setFeedback(null), 3500);
            }}
          />
        </div>
      )}

      {editingProduct && (
        <ProductFormModal
          initial={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(product) => {
            onSaveProduct(product);
            setSelectedProductId(product.id);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

const ManualDetail: React.FC<{ manual: ManualItem; onSave: () => void }> = ({ manual, onSave }) => (
  <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-4">
    <div>
      <span className="text-[10px] uppercase font-bold text-[#5B9BFF]">{manual.category}</span>
      <h3 className="text-xl font-bold text-white mt-1">{manual.title}</h3>
      <p className="text-xs text-[#9FB0C8] mt-1">{manual.summary}</p>
    </div>
    <ol className="space-y-2">
      {manual.steps.map((step, index) => (
        <li key={index} className="flex gap-2 text-xs text-[#E8EDF5] bg-black/20 p-3 rounded-xl">
          <span className="font-mono text-[#5B9BFF] shrink-0">{String(index + 1).padStart(2, '0')}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
    <div className="p-3 rounded-xl bg-[#3A2E10]/50 border border-[#F5B93A]/30 text-xs text-[#F5B93A] space-y-1">
      <strong className="text-white">Cautelas:</strong>
      {manual.cautions.map((caution) => (
        <div key={caution}>· {caution}</div>
      ))}
    </div>
    <p className="text-[11px] text-[#6B7F9E]">{manual.sourceLabel}</p>
    <button onClick={onSave} className="w-full h-11 rounded-xl bg-[#1F66D6] text-white text-xs font-semibold">
      Salvar no Caderno Pessoal
    </button>
  </div>
);

const ProductFormModal: React.FC<{
  initial: AutomotiveProductItem;
  onClose: () => void;
  onSave: (product: AutomotiveProductItem) => void;
}> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial);
  const [uploadMessage, setUploadMessage] = useState('');

  const update = <K extends keyof AutomotiveProductItem>(key: K, value: AutomotiveProductItem[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      dilutionRatio: form.dilutionRatio.trim(),
      sourceLabel: form.sourceLabel.trim(),
      labelPhotoUrl: undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-10 overflow-y-auto">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-2xl border border-[#2A3A55] bg-[#17243A] p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Ficha de produto</h3>
          <button type="button" onClick={onClose} className="p-2 text-[#9FB0C8] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome do produto *">
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fabricante">
            <input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} className={inputClass} />
          </Field>
          <Field label="pH">
            <select
              value={form.phType}
              onChange={(e) => update('phType', e.target.value as AutomotiveProductItem['phType'])}
              className={inputClass}
            >
              <option>Neutro</option>
              <option>Ácido</option>
              <option>Alcalino</option>
            </select>
          </Field>
          <Field label="Diluição (ex.: 1:10)">
            <input value={form.dilutionRatio} onChange={(e) => update('dilutionRatio', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Número da diluição (X)">
            <input
              type="number"
              min="1"
              value={form.dilutionNumber}
              onChange={(e) => update('dilutionNumber', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Tempo de ação">
            <input value={form.actionTimeMinutes} onChange={(e) => update('actionTimeMinutes', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Superfícies (separadas por vírgula)">
            <input
              value={form.targetSurfaces.join(', ')}
              onChange={(e) => update('targetSurfaces', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
              className={inputClass}
            />
          </Field>
          <Field label="Rendimento">
            <input value={form.yieldInfo} onChange={(e) => update('yieldInfo', e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Instruções de uso">
          <textarea
            rows={3}
            value={form.instructions}
            onChange={(e) => update('instructions', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Cautelas (uma por linha)">
          <textarea
            rows={3}
            value={form.cautions.join('\n')}
            onChange={(e) => update('cautions', e.target.value.split('\n').map((v) => v.trim()).filter(Boolean))}
            className={inputClass}
          />
        </Field>
        <Field label="Foto do rótulo (opcional)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const safeFile = await sanitizeProductLabel(file);
                const key = \`product-label-\${form.id}\`;
                await saveMedia(key, safeFile);
                update('labelPhotoReference', key);
                update('labelPhotoUrl', URL.createObjectURL(safeFile));

                if (isSupabaseConfigured) {
                  const session = await ensureAnonymousSession();
                  if (session) {
                    const storagePath = await uploadProductLabel(session.userId, form.id, safeFile);
                    update('labelPhotoStoragePath', storagePath);
                  }
                }
                setUploadMessage('Foto validada e salva.');
              } catch (error) {
                setUploadMessage(error instanceof Error ? error.message : 'Não foi possível processar a imagem.');
              }
            }}
            className="text-[11px] text-[#9FB0C8] file:mr-2 file:rounded-lg file:border-0 file:bg-[#1F66D6] file:px-3 file:py-1.5 file:text-white"
          />
          {uploadMessage && <p role="status" className="mt-2 text-[11px] text-[#F5B93A]">{uploadMessage}</p>}
          {form.labelPhotoUrl && (
            <img src={form.labelPhotoUrl} alt="Prévia do rótulo" className="mt-2 h-28 rounded-xl object-cover" />
          )}
        </Field>
        <Field label="Fonte / rótulo / FISPQ">
          <input value={form.sourceLabel} onChange={(e) => update('sourceLabel', e.target.value)} className={inputClass} />
        </Field>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#2A3A55] text-xs text-[#9FB0C8]">
            Cancelar
          </button>
          <button type="submit" className="flex-1 h-11 rounded-xl bg-[#1F66D6] text-xs font-semibold text-white">
            Salvar produto
          </button>
        </div>
      </form>
    </div>
  );
};

const ProductLabelPhoto: React.FC<{ reference?: string; storagePath?: string }> = ({
  reference,
  storagePath,
}) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      if (reference) {
        const localUrl = await loadMediaUrl(reference);
        if (!active) return;
        if (localUrl) {
          objectUrl = localUrl;
          setUrl(localUrl);
          return;
        }
      }

      if (storagePath && isSupabaseConfigured) {
        const session = await ensureAnonymousSession();
        if (!active || !session || !supabase) return;
        const client = supabase;
        const { data, error } = await client.storage.from('user-media').createSignedUrl(storagePath, 3600);
        if (!active || error || !data?.signedUrl) return;
        const response = await fetch(data.signedUrl);
        if (!response.ok) return;
        const blob = await response.blob();
        await saveMedia(storagePath, blob);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    };

    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reference, storagePath]);

  if (!url) return null;
  return <img src={url} alt="Rótulo do produto" className="w-full max-h-56 rounded-xl object-contain bg-black/30 border border-[#2A3A55]" />;
};

const inputClass =
  'w-full h-10 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white text-xs outline-none focus:border-[#5B9BFF]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-1 block">
    <span className="text-[11px] text-[#9FB0C8]">{label}</span>
    {children}
  </label>
);
