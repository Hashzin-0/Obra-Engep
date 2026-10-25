/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, X, ArrowUpRight, Calculator, FileText, Wrench, Shield, Sparkles, Scale } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { INITIAL_NRS, INITIAL_ABNT, INITIAL_LEGISLATION, INITIAL_DIRT_CATALOG, INITIAL_PRODUCTS } from '../data/initialData';
import { SourceSeal } from './SourceSeal';
import { ModuleId } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (category: string, itemId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');

  const filterChips = [
    { id: 'todos', label: 'Todos' },
    { id: 'calculadoras', label: 'Calculadoras' },
    { id: 'nrs', label: 'NRs e Segurança' },
    { id: 'abnt', label: 'Normas ABNT' },
    { id: 'legislacao', label: 'Legislação' },
    { id: 'estetica', label: 'Estética Automotiva' },
  ];

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const q = query.toLowerCase().trim();
    const list: Array<{
      id: string;
      category: string;
      categoryLabel: string;
      title: string;
      subtitle: string;
      sourceType?: 'Oficial' | 'Resumo' | 'Pessoal';
      date?: string;
    }> = [];

    // Calculators
    const calculators = [
      { id: 'calc-eletrica-corrente', title: 'Calculadora Elétrica — Corrente I = P/(V×FP)', subtitle: 'Dimensionamento de corrente para motores e cargas', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-eletrica-potencia', title: 'Calculadora Elétrica — Potência P = V×I×FP', subtitle: 'Potência ativa em circuitos monofásicos', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-eletrica-ohm', title: 'Calculadora Elétrica — Lei de Ohm (V=R×I)', subtitle: 'Tensão, corrente e resistência ôhmica', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-eletrica-queda', title: 'Calculadora Elétrica — Queda de Tensão ΔV(%)', subtitle: 'Estimativa conforme comprimento e seção de cobre', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-hidraulica-reserva', title: 'Calculadora Hidráulica — Reservatório Predial', subtitle: 'Volume de caixa d’água por ocupantes e dias', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-hidraulica-vazao', title: 'Calculadora Hidráulica — Vazão Q = V/t', subtitle: 'Vazão volumétrica em litros/min e m³/h', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-materiais-alvenaria', title: 'Calculadora de Materiais — Alvenaria e Blocos', subtitle: 'Área líquida, tijolos e argamassa com perda %', category: 'calculadoras', categoryLabel: 'Calculadora' },
      { id: 'calc-materiais-telhado', title: 'Calculadora de Telhado — Inclinação e Telhas', subtitle: 'Área inclinada e estimativa de telhas', category: 'calculadoras', categoryLabel: 'Calculadora' },
    ];

    if (selectedFilter === 'todos' || selectedFilter === 'calculadoras') {
      calculators.forEach((c) => {
        if (c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)) {
          list.push({ ...c, sourceType: 'Resumo', date: '25/10/2026' });
        }
      });
    }

    // NRs
    if (selectedFilter === 'todos' || selectedFilter === 'nrs') {
      INITIAL_NRS.forEach((nr) => {
        if (
          nr.code.toLowerCase().includes(q) ||
          nr.title.toLowerCase().includes(q) ||
          nr.summary.toLowerCase().includes(q)
        ) {
          list.push({
            id: nr.id,
            category: 'nrs',
            categoryLabel: 'NR de Segurança',
            title: `${nr.code} · ${nr.title}`,
            subtitle: nr.summary,
            sourceType: 'Oficial',
            date: nr.lastVerified,
          });
        }
      });
    }

    // ABNT
    if (selectedFilter === 'todos' || selectedFilter === 'abnt') {
      INITIAL_ABNT.forEach((norma) => {
        if (
          norma.code.toLowerCase().includes(q) ||
          norma.title.toLowerCase().includes(q) ||
          norma.summary.toLowerCase().includes(q)
        ) {
          list.push({
            id: norma.id,
            category: 'abnt',
            categoryLabel: 'Norma ABNT',
            title: `${norma.code} — ${norma.title}`,
            subtitle: norma.summary,
            sourceType: 'Oficial',
            date: norma.lastVerified,
          });
        }
      });
    }

    // Legislation
    if (selectedFilter === 'todos' || selectedFilter === 'legislacao') {
      INITIAL_LEGISLATION.forEach((leg) => {
        if (
          leg.code.toLowerCase().includes(q) ||
          leg.title.toLowerCase().includes(q) ||
          leg.summary.toLowerCase().includes(q)
        ) {
          list.push({
            id: leg.id,
            category: 'legislacao',
            categoryLabel: `Legislação (${leg.jurisdiction})`,
            title: leg.code,
            subtitle: leg.title,
            sourceType: 'Oficial',
            date: leg.lastVerified,
          });
        }
      });
    }

    // Automotive
    if (selectedFilter === 'todos' || selectedFilter === 'estetica') {
      INITIAL_DIRT_CATALOG.forEach((dirt) => {
        if (
          dirt.name.toLowerCase().includes(q) ||
          dirt.surface.toLowerCase().includes(q) ||
          dirt.approach.toLowerCase().includes(q)
        ) {
          list.push({
            id: dirt.id,
            category: 'estetica-sujeira',
            categoryLabel: 'Sujeira Automotiva',
            title: dirt.name,
            subtitle: `Superfície: ${dirt.surface} · ${dirt.probableOrigin}`,
            sourceType: 'Resumo',
            date: '25/10/2026',
          });
        }
      });

      INITIAL_PRODUCTS.forEach((prod) => {
        if (
          prod.name.toLowerCase().includes(q) ||
          prod.manufacturer.toLowerCase().includes(q) ||
          prod.instructions.toLowerCase().includes(q)
        ) {
          list.push({
            id: prod.id,
            category: 'estetica-produto',
            categoryLabel: 'Ficha de Produto',
            title: prod.name,
            subtitle: `Diluição: ${prod.dilutionRatio} | ${prod.actionTimeMinutes} | pH ${prod.phType}`,
            sourceType: 'Oficial',
            date: prod.verifiedDate,
          });
        }
      });
    }

    return list;
  }, [query, selectedFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Busca global OBra ENGEP"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-12 sm:pt-20"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#17243A] border-[#2A3A55] text-[#E8EDF5]'
            : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
        }`}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#2A3A55] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#5B9BFF] shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ferramentas, fórmulas, NRs, normas, produtos..."
            className="w-full bg-transparent outline-none text-base font-medium placeholder:text-[#9FB0C8]/60 h-10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#9FB0C8] hover:text-white"
              aria-label="Limpar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-[#6B7F9E]/30 text-xs font-medium text-[#9FB0C8] hover:text-white"
          >
            Fechar
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-4 py-2.5 border-b border-[#2A3A55] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filterChips.map((chip) => {
            const isSelected = selectedFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedFilter(chip.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition min-h-[32px] ${
                  isSelected
                    ? 'bg-[#1F66D6] text-white shadow-xs'
                    : 'bg-black/10 dark:bg-white/5 text-[#9FB0C8] hover:text-white border border-transparent hover:border-[#6B7F9E]/40'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Search Results Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {!query.trim() ? (
            <div className="py-12 text-center text-xs text-[#9FB0C8]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#5B9BFF]" />
              <p className="text-sm font-medium">Digite para buscar no OBra ENGEP</p>
              <p className="mt-1 opacity-70">
                Sugestões: &ldquo;NR-35&rdquo;, &ldquo;Corrente&rdquo;, &ldquo;Lei 16.642&rdquo;, &ldquo;Diluição&rdquo;, &ldquo;NBR 5410&rdquo;
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9FB0C8]">
              <p className="text-sm font-medium">Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
              <p className="mt-1 opacity-70">
                Verifique os termos ou alterne o filtro por módulo.
              </p>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectResult(item.category, item.id);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                  isDark
                    ? 'bg-[#101827]/60 border-[#2A3A55] hover:border-[#1F66D6] hover:bg-[#1F66D6]/10'
                    : 'bg-[#F5F7FB] border-[#D9E0EC] hover:border-[#1F66D6] hover:bg-[#EAF1FD]'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B9BFF]">
                      {item.categoryLabel}
                    </span>
                    {item.sourceType && item.date && (
                      <SourceSeal type={item.sourceType} date={item.date} />
                    )}
                  </div>
                  <h4 className="font-semibold text-sm leading-snug truncate text-white dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#9FB0C8] line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#9FB0C8] shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
