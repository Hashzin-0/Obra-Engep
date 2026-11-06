import React from 'react';
import { ArrowDown, ArrowRight, CheckCircle2, ClipboardList, Calculator, FileOutput } from 'lucide-react';

type CalculationFlowchartProps = {
  title?: string;
  formula: string;
  inputs: string[];
  outputs: string[];
  compact?: boolean;
};

const nodeClass = 'min-w-0 flex-1 rounded-xl border border-[#354762] bg-[#101827] p-3 text-center';
const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-[#8FA8C8]';
const valueClass = 'mt-1 text-xs leading-relaxed text-[#E8EDF5] break-words';

export const CalculationFlowchart: React.FC<CalculationFlowchartProps> = ({
  title = 'Fluxograma do cálculo', formula, inputs, outputs, compact = false,
}) => (
  <section className={`rounded-2xl border border-[#2A3A55] bg-[#142137] ${compact ? 'p-3' : 'p-4'} space-y-3`} aria-label={title}>
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F66D6]/15 text-[#78AEFF]"><ClipboardList size={15}/></span>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
    </div>
    <div className="flex flex-col md:flex-row md:items-stretch gap-2">
      <div className={nodeClass}>
        <div className="flex justify-center text-[#78AEFF]"><ClipboardList size={16}/></div>
        <div className={labelClass}>1 · Entradas</div>
        <div className={valueClass}>{inputs.length ? inputs.join(' · ') : 'Informe as grandezas necessárias'}</div>
      </div>
      <div className="flex justify-center items-center text-[#6F8FB8]"><ArrowDown className="md:hidden" size={17}/><ArrowRight className="hidden md:block" size={17}/></div>
      <div className={nodeClass}>
        <div className="flex justify-center text-[#F5B93A]"><CheckCircle2 size={16}/></div>
        <div className={labelClass}>2 · Validação</div>
        <div className={valueClass}>Verificar valores, unidades, limites e condições de aplicação</div>
      </div>
      <div className="flex justify-center items-center text-[#6F8FB8]"><ArrowDown className="md:hidden" size={17}/><ArrowRight className="hidden md:block" size={17}/></div>
      <div className={nodeClass}>
        <div className="flex justify-center text-[#78AEFF]"><Calculator size={16}/></div>
        <div className={labelClass}>3 · Cálculo</div>
        <div className={valueClass}><span className="font-mono">{formula}</span></div>
      </div>
      <div className="flex justify-center items-center text-[#6F8FB8]"><ArrowDown className="md:hidden" size={17}/><ArrowRight className="hidden md:block" size={17}/></div>
      <div className={nodeClass}>
        <div className="flex justify-center text-emerald-400"><FileOutput size={16}/></div>
        <div className={labelClass}>4 · Resultado</div>
        <div className={valueClass}>{outputs.length ? outputs.join(' · ') : 'Apresentar o resultado com unidade'}</div>
      </div>
    </div>
    <p className="text-[10px] leading-relaxed text-[#8FA8C8]">Fluxo didático. A validação técnica final depende das condições reais do circuito, dos dados do fabricante e das normas aplicáveis.</p>
  </section>
);
