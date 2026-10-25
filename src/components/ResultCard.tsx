/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Bookmark, Check, Share2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FormulaLegendItem {
  symbol: string;
  meaning: string;
}

interface ResultCardProps {
  value: number | string;
  unit: string;
  formula: string;
  premises: string;
  limitWarning: string;
  onSave?: () => void;
  title?: string;
  secondaryDetails?: { label: string; value: string | number }[];
  formulaLegend?: FormulaLegendItem[];
}

export const ResultCard: React.FC<ResultCardProps> = ({
  value,
  unit,
  formula,
  premises,
  limitWarning,
  onSave,
  title = 'Resultado Estimado',
  secondaryDetails = [],
  formulaLegend = [],
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    const text = `${title}: ${value} ${unit}\nFórmula: ${formula}\nPremissas: ${premises}\nAviso: ${limitWarning}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition shadow-sm ${
        isDark
          ? 'bg-[#17243A] border-[#2A3A55] text-[#E8EDF5]'
          : 'bg-[#FFFFFF] border-[#D9E0EC] text-[#101827]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-xs opacity-75 pb-2 border-b border-white/5 dark:border-white/10">
        <span className="font-semibold uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg border border-transparent hover:border-[#6B7F9E]/40 hover:bg-black/10 dark:hover:bg-white/5 transition flex items-center gap-1 text-xs"
            aria-label="Copiar resultado"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3DD68C]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg border border-transparent hover:border-[#6B7F9E]/40 hover:bg-black/10 dark:hover:bg-white/5 transition flex items-center gap-1 text-xs"
              aria-label="Salvar resultado"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-[#3DD68C]" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{saved ? 'Salvo!' : 'Salvar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Big Number Display */}
      <div className="py-4 text-center">
        <div className="inline-flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#5B9BFF] dark:text-[#5B9BFF]">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </span>
          <span className="text-xl sm:text-2xl font-semibold opacity-80">{unit}</span>
        </div>
        <p className="mt-1 font-mono text-xs sm:text-sm text-[#9FB0C8] dark:text-[#9FB0C8] font-medium">
          {formula}
        </p>
      </div>

      {/* Formula Breakdown Legend matching briefing board 3 */}
      {formulaLegend && formulaLegend.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-black/25 border border-white/5 text-xs space-y-1.5">
          <div className="font-semibold text-white/90 text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Legenda da Fórmula</span>
            <span className="text-[10px] text-[#9FB0C8] font-normal">NBR 5410 / SI</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono">
            {formulaLegend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[#5B9BFF] px-1.5 py-0.5 rounded bg-blue-500/15 min-w-[28px] text-center border border-blue-500/20">
                  {item.symbol}
                </span>
                <span className="text-[#E8EDF5]/90 font-sans">{item.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary details if any */}
      {secondaryDetails.length > 0 && (
        <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-white/5 dark:border-white/10 text-xs">
          {secondaryDetails.map((det, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-xs opacity-70">{det.label}</span>
              <span className="font-semibold text-sm">{det.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Premises */}
      <div className="text-xs py-2 text-[#9FB0C8] dark:text-[#9FB0C8]">
        <strong className="text-white/80 dark:text-white/80">Premissas:</strong> {premises}
      </div>

      {/* Fixed limit warning */}
      <div className="mt-3 pt-3 border-t border-white/5 dark:border-white/10 flex items-start gap-2 text-xs text-[#F5B93A]">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F5B93A]" />
        <span className="leading-snug">{limitWarning}</span>
      </div>
    </div>
  );
};
