/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { LimitBar } from '../components/LimitBar';

export type ElectricalCalculatorMode = 'lighting' | 'ampacity' | 'resistor' | 'current' | 'led-strip';

const fieldClass = 'w-full min-w-0 h-12 px-3 rounded-xl bg-[#101827] border border-[#354762] text-white text-sm';
const labelClass = 'block text-xs text-[#9FB0C8] mb-1.5';
const panelClass = 'p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-3';
const resultClass = 'p-3 rounded-xl bg-black/25 border border-[#2A3A55]';

function NumberField({ label, value, onChange, min = 0, step = 'any' }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; step?: number | string;
}) {
  return <label className="block min-w-0"><span className={labelClass}>{label}</span><input className={fieldClass} type="number" min={min} step={step} value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))} /></label>;
}
function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>;
}) {
  return <label className="block min-w-0"><span className={labelClass}>{label}</span><select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Result({ label, value }: { label: string; value: string }) {
  return <div className={resultClass}><div className="text-xs text-[#9FB0C8]">{label}</div><div className="mt-1 font-semibold text-white break-words">{value}</div></div>;
}
const fmt = (n: number, digits = 2) => Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';

const roomTypes = [
  { value: 'living', label: 'Sala de estar (150 lux)', lux: 150 },
  { value: 'bedroom', label: 'Quarto (150 lux)', lux: 150 },
  { value: 'kitchen', label: 'Cozinha (300 lux)', lux: 300 },
  { value: 'bathroom', label: 'Banheiro (200 lux)', lux: 200 },
  { value: 'office', label: 'Escritório/leitura (500 lux)', lux: 500 },
  { value: 'hall', label: 'Corredor/circulação (100 lux)', lux: 100 },
  { value: 'custom', label: 'Personalizado', lux: 150 },
];
const lamps = [
  { value: '810', label: 'Lâmpada bulbo LED 9 W (810 lm)', lumens: 810, watts: 9 },
  { value: '1055', label: 'Lâmpada bulbo LED 12 W (1.055 lm)', lumens: 1055, watts: 12 },
  { value: '1350', label: 'Lâmpada bulbo LED 15 W (1.350 lm)', lumens: 1350, watts: 15 },
  { value: '1800', label: 'Painel LED 18 W (1.800 lm)', lumens: 1800, watts: 18 },
  { value: '2400', label: 'Painel LED 24 W (2.400 lm)', lumens: 2400, watts: 24 },
];

type Room = { id: number; name: string; type: string; area: number; customLux: number; lamp: string };
const createRoom = (id: number): Room => ({ id, name: 'Ambiente ' + id, type: 'living', area: Number.NaN, customLux: 150, lamp: '810' });

function LightingCalculator() {
  const [rooms, setRooms] = useState<Room[]>([createRoom(1)]);
  const [nextId, setNextId] = useState(2);
  const [results, setResults] = useState<Record<number, { lux: number; lumens: number; count: number; watts: number }>>({});
  const updateRoom = (id: number, patch: Partial<Room>) => setRooms((prev) => prev.map((room) => room.id === id ? { ...room, ...patch } : room));
  const calculate = () => {
    const next: typeof results = {};
    for (const room of rooms) {
      const preset = roomTypes.find((t) => t.value === room.type);
      const lamp = lamps.find((l) => l.value === room.lamp)!;
      const lux = room.type === 'custom' ? room.customLux : (preset?.lux ?? 150);
      if (!Number.isFinite(room.area) || room.area <= 0 || !Number.isFinite(lux) || lux <= 0) {
        alert('Informe uma área e iluminância maiores que zero em todos os ambientes.');
        return;
      }
      const lumens = room.area * lux;
      const count = Math.ceil(lumens / lamp.lumens);
      next[room.id] = { lux, lumens, count, watts: count * lamp.watts };
    }
    setResults(next);
  };
  return <div className="space-y-4">
    {rooms.map((room) => {
      const result = results[room.id];
      return <section key={room.id} className={panelClass}>
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-white">{room.name}</h3>{rooms.length > 1 && <button className="p-2 rounded-lg text-red-300 hover:bg-red-500/10" onClick={() => { setRooms((prev) => prev.filter((r) => r.id !== room.id)); setResults((prev) => { const copy = { ...prev }; delete copy[room.id]; return copy; }); }} aria-label="Remover ambiente"><Trash2 size={16} /></button>}</div>
        <label className="block"><span className={labelClass}>Tipo de ambiente / iluminância</span><select className={fieldClass} value={room.type} onChange={(e) => updateRoom(room.id, { type: e.target.value })}>{roomTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        {room.type === 'custom' && <NumberField label="Iluminância desejada (lux)" value={room.customLux} min={1} onChange={(v) => updateRoom(room.id, { customLux: v })} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><NumberField label="Área do ambiente (m²)" value={room.area} min={0.01} onChange={(v) => updateRoom(room.id, { area: v })} /><SelectField label="Lâmpada / luminária" value={room.lamp} onChange={(v) => updateRoom(room.id, { lamp: v })} options={lamps.map((l) => ({ value: l.value, label: l.label }))} /></div>
        {result && <div className="grid grid-cols-2 gap-2"><Result label="Fluxo luminoso necessário" value={fmt(result.lumens, 0) + ' lm'} /><Result label="Quantidade estimada" value={result.count + ' unidade(s)'} /><Result label="Potência instalada" value={fmt(result.watts, 0) + ' W'} /><Result label="Meta de iluminância" value={fmt(result.lux, 0) + ' lux'} /></div>}
      </section>;
    })}
    <button className="w-full h-11 rounded-xl bg-[#F5B93A] text-[#101827] font-semibold" onClick={() => { setRooms((prev) => [...prev, createRoom(nextId)]); setNextId((id) => id + 1); }}>+ Adicionar ambiente</button>
    <button className="w-full h-12 rounded-xl bg-[#1F66D6] text-white font-semibold" onClick={calculate}>Calcular iluminação</button>
    {Object.keys(results).length > 0 && <Result label="Potência total dos ambientes calculados" value={fmt(rooms.reduce((sum, r) => sum + (results[r.id]?.watts ?? 0), 0), 0) + ' W'} />}
    <LimitBar message="Estimativa pelo método simplificado de fluxo luminoso (lux × área). Não substitui projeto luminotécnico com fator de utilização, manutenção, distribuição fotométrica e verificação das condições reais do ambiente." />
  </div>;
}

const ampacityTable: Record<string, { two: number; three: number }> = {
  '1.5': { two: 17.5, three: 15.5 }, '2.5': { two: 24, three: 21 }, '4': { two: 32, three: 28 },
  '6': { two: 41, three: 36 }, '10': { two: 57, three: 50 }, '16': { two: 76, three: 68 },
  '25': { two: 101, three: 89 }, '35': { two: 125, three: 110 }, '50': { two: 151, three: 134 },
  '70': { two: 192, three: 171 }, '95': { two: 232, three: 207 }, '120': { two: 269, three: 239 },
};
const tempFactors: Record<string, Record<string, number>> = {
  'PVC 70°C': { '10': 1.22, '15': 1.17, '20': 1.12, '25': 1.06, '30': 1, '35': 0.94, '40': 0.87, '45': 0.79, '50': 0.71 },
  'XLPE/EPR 90°C': { '10': 1.15, '15': 1.12, '20': 1.08, '25': 1.04, '30': 1, '35': 0.96, '40': 0.91, '45': 0.87, '50': 0.82 },
};
const groupingFactors: Record<string, number> = { '1': 1, '2': 0.8, '3': 0.7, '4': 0.65, '5': 0.6, '6': 0.57 };

function AmpacityCalculator() {
  const [material, setMaterial] = useState('Cobre');
  const [method, setMethod] = useState('B1');
  const [insulation, setInsulation] = useState('PVC 70°C');
  const [loaded, setLoaded] = useState('2');
  const [circuits, setCircuits] = useState('1');
  const [ambient, setAmbient] = useState('30');
  const [section, setSection] = useState('1.5');
  const [groupingRef, setGroupingRef] = useState('1');
  const [installation, setInstallation] = useState('Ao ar livre ou ambiente');
  const [result, setResult] = useState<{ base: number; corrected: number; factors: number; current: number } | null>(null);
  const calculate = () => {
    const table = ampacityTable[section];
    const temp = tempFactors[insulation]?.[ambient];
    const group = groupingFactors[circuits];
    if (material !== 'Cobre' || method !== 'B1' || !table || temp === undefined || group === undefined) {
      alert('Esta tabela simplificada cobre condutor de cobre, método B1 e as seções listadas. Para outras condições, consulte a tabela normativa aplicável.');
      return;
    }
    const base = loaded === '2' ? table.two : table.three;
    const factors = temp * group;
    setResult({ base, corrected: base * factors, factors, current: base * factors });
  };
  return <div className="space-y-4">
    <section className={panelClass}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Material do condutor" value={material} onChange={setMaterial} options={[{ value: 'Cobre', label: 'Cobre' }, { value: 'Alumínio', label: 'Alumínio' }]} />
        <SelectField label="Método de instalação" value={method} onChange={setMethod} options={[{ value: 'B1', label: 'B1 — condutores isolados em eletroduto' }, { value: 'B2', label: 'B2 — cabos em eletroduto' }, { value: 'C', label: 'C — fixado diretamente' }, { value: 'E', label: 'E — cabos ao ar livre' }]} />
        <SelectField label="Tipo de instalação (FCT)" value={installation} onChange={setInstallation} options={[{ value: 'Ao ar livre ou ambiente', label: 'Ao ar livre ou ambiente' }, { value: 'Em solo', label: 'Em solo' }]} />
        <SelectField label="Isolação do condutor" value={insulation} onChange={setInsulation} options={[{ value: 'PVC 70°C', label: 'PVC (70°C)' }, { value: 'XLPE/EPR 90°C', label: 'XLPE/EPR (90°C)' }]} />
        <SelectField label="Condutores carregados" value={loaded} onChange={setLoaded} options={[{ value: '2', label: '2 (fase + neutro ou fase + fase)' }, { value: '3', label: '3 (trifásico)' }]} />
        <SelectField label="Nº de circuitos agrupados (FCA)" value={circuits} onChange={setCircuits} options={Object.keys(groupingFactors).map((v) => ({ value: v, label: v }))} />
        <SelectField label="Referência de agrupamento (FCA)" value={groupingRef} onChange={setGroupingRef} options={[{ value: '1', label: '1 — feixe / eletroduto' }, { value: '2', label: '2 — camada única em parede' }, { value: '3', label: '3 — camada única em bandeja' }]} />
        <SelectField label="Temperatura ambiente (°C)" value={ambient} onChange={setAmbient} options={Object.keys(tempFactors[insulation] ?? {}).map((v) => ({ value: v, label: v + ' °C' }))} />
        <SelectField label="Bitola do condutor (mm²)" value={section} onChange={setSection} options={Object.keys(ampacityTable).map((v) => ({ value: v, label: v.replace('.', ',') + ' mm²' }))} />
      </div>
      <button className="w-full h-12 rounded-xl bg-[#1F66D6] text-white font-semibold" onClick={calculate}>Calcular capacidade de condução</button>
    </section>
    {result && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Result label="Capacidade de referência (tabela-base)" value={fmt(result.base) + ' A'} /><Result label="Fator combinado aplicado" value={fmt(result.factors, 3)} /><Result label="Capacidade estimada corrigida" value={fmt(result.corrected) + ' A'} /><Result label="Seção escolhida" value={section.replace('.', ',') + ' mm² cobre'} /></div>}
    <LimitBar message={'Estimativa simplificada para cobre, método B1 e condições selecionadas. FCA selecionado usa fator genérico; a referência de agrupamento (“' + groupingRef + '”) e a instalação (“' + installation + '”) não alteram a tabela nesta versão. Confirme método, número de condutores, agrupamento, temperatura, isolação e edição vigente da NBR 5410 antes de dimensionar ou executar.'} />
  </div>;
}

const resistorColors = [
  { label: 'Preto', value: 'black', digit: 0, multiplier: 1, tolerance: null, hex: '#171717' },
  { label: 'Marrom', value: 'brown', digit: 1, multiplier: 10, tolerance: 1, hex: '#7c3f18' },
  { label: 'Vermelho', value: 'red', digit: 2, multiplier: 100, tolerance: 2, hex: '#ef4444' },
  { label: 'Laranja', value: 'orange', digit: 3, multiplier: 1000, tolerance: null, hex: '#f97316' },
  { label: 'Amarelo', value: 'yellow', digit: 4, multiplier: 10000, tolerance: null, hex: '#facc15' },
  { label: 'Verde', value: 'green', digit: 5, multiplier: 100000, tolerance: 0.5, hex: '#22c55e' },
  { label: 'Azul', value: 'blue', digit: 6, multiplier: 1000000, tolerance: 0.25, hex: '#3b82f6' },
  { label: 'Violeta', value: 'violet', digit: 7, multiplier: 10000000, tolerance: 0.1, hex: '#8b5cf6' },
  { label: 'Cinza', value: 'gray', digit: 8, multiplier: 100000000, tolerance: 0.05, hex: '#9ca3af' },
  { label: 'Branco', value: 'white', digit: 9, multiplier: 1000000000, tolerance: null, hex: '#f9fafb' },
  { label: 'Dourado', value: 'gold', digit: null, multiplier: 0.1, tolerance: 5, hex: '#d4a017' },
  { label: 'Prateado', value: 'silver', digit: null, multiplier: 0.01, tolerance: 10, hex: '#c0c0c0' },
];
function ResistorCalculator() {
  const [band1, setBand1] = useState('black');
  const [band2, setBand2] = useState('black');
  const [multiplier, setMultiplier] = useState('black');
  const [tolerance, setTolerance] = useState('gold');
  const first = resistorColors.find((c) => c.value === band1)!;
  const second = resistorColors.find((c) => c.value === band2)!;
  const multi = resistorColors.find((c) => c.value === multiplier)!;
  const tol = resistorColors.find((c) => c.value === tolerance)!;
  const ohms = useMemo(() => ((first.digit ?? 0) * 10 + (second.digit ?? 0)) * multi.multiplier, [first, second, multi]);
  const valid = first.digit !== null && second.digit !== null && !['gold', 'silver'].includes(band1) && !['gold', 'silver'].includes(band2) && tol.tolerance !== null;
  const fmtResistance = (n: number) => n >= 1e6 ? fmt(n / 1e6, 3) + ' MΩ' : n >= 1e3 ? fmt(n / 1e3, 3) + ' kΩ' : fmt(n, 3) + ' Ω';
  const options = resistorColors.map((c) => ({ value: c.value, label: c.label }));
  const renderBand = (color: string) => resistorColors.find((c) => c.value === color)?.hex ?? '#171717';
  return <div className="space-y-4">
    <section className={panelClass}>
      <div className="w-full flex justify-center py-5"><svg viewBox="0 0 360 120" role="img" aria-label="Resistor com quatro faixas" className="w-full max-w-md"><line x1="10" y1="60" x2="80" y2="60" stroke="#9ca3af" strokeWidth="4"/><line x1="280" y1="60" x2="350" y2="60" stroke="#9ca3af" strokeWidth="4"/><rect x="70" y="25" width="220" height="70" rx="30" fill="#f4e68b" stroke="#272727" strokeWidth="2"/>{[band1, band2, multiplier, tolerance].map((c, i) => <rect key={i} x={95 + i * 48} y="25" width={i === 3 ? 14 : 18} height="70" fill={renderBand(c)} stroke="#333" strokeWidth="0.5"/> )}</svg></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Faixa 1 (primeiro dígito)" value={band1} onChange={setBand1} options={options.filter((o) => !['gold', 'silver'].includes(o.value))} />
        <SelectField label="Faixa 2 (segundo dígito)" value={band2} onChange={setBand2} options={options.filter((o) => !['gold', 'silver'].includes(o.value))} />
        <SelectField label="Multiplicador" value={multiplier} onChange={setMultiplier} options={options} />
        <SelectField label="Tolerância" value={tolerance} onChange={setTolerance} options={options.filter((o) => ['brown', 'red', 'green', 'blue', 'violet', 'gray', 'gold', 'silver'].includes(o.value))} />
      </div>
    </section>
    {valid && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Result label="Resistência nominal" value={fmtResistance(ohms)} /><Result label="Tolerância" value={'±' + tol.tolerance + '%'} /><Result label="Valor mínimo" value={fmtResistance(ohms * (1 - (tol.tolerance ?? 0) / 100))} /><Result label="Valor máximo" value={fmtResistance(ohms * (1 + (tol.tolerance ?? 0) / 100))} /></div>}
    {!valid && <p className="text-sm text-amber-300">Selecione faixas válidas para visualizar a resistência.</p>}
    <LimitBar message="Calculadora para resistor de quatro faixas. As cores e tolerâncias seguem o código de cores usual; confirme a quantidade de faixas e a especificação do componente real." />
  </div>;
}

function CurrentCalculator() {
  const [power, setPower] = useState(Number.NaN);
  const [voltage, setVoltage] = useState(127);
  const [threePhase, setThreePhase] = useState(false);
  const [powerFactor, setPowerFactor] = useState(1);
  const [efficiency, setEfficiency] = useState(100);
  const current = useMemo(() => {
    if (!Number.isFinite(power) || power <= 0 || !Number.isFinite(voltage) || voltage <= 0 || !Number.isFinite(powerFactor) || powerFactor <= 0 || powerFactor > 1 || efficiency <= 0 || efficiency > 100) return null;
    const denominator = threePhase ? Math.sqrt(3) * voltage * powerFactor * (efficiency / 100) : voltage * powerFactor * (efficiency / 100);
    return power / denominator;
  }, [power, voltage, threePhase, powerFactor, efficiency]);
  return <div className="space-y-4">
    <section className={panelClass}>
      <NumberField label="Potência ativa (W)" value={power} min={1} onChange={setPower} />
      <NumberField label="Tensão (V)" value={voltage} min={1} onChange={setVoltage} />
      <label className="flex items-center gap-3 rounded-xl bg-[#101827] border border-[#354762] p-3 text-sm text-white"><input type="checkbox" checked={threePhase} onChange={(e) => setThreePhase(e.target.checked)} className="h-5 w-5 accent-blue-500" />Sistema trifásico (√3 × tensão de linha)</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><NumberField label="Fator de potência (cos φ)" value={powerFactor} min={0.01} step={0.01} onChange={setPowerFactor} /><NumberField label="Rendimento (%)" value={efficiency} min={1} step={1} onChange={setEfficiency} /></div>
    </section>
    {current !== null && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Result label="Corrente estimada" value={fmt(current, 3) + ' A'} /><Result label="Sistema" value={threePhase ? 'Trifásico' : 'Monofásico'} /><Result label="Fórmula aplicada" value={threePhase ? 'I = P / (√3 × V × cos φ × η)' : 'I = P / (V × cos φ × η)'} /></div>}
    <LimitBar message="Para corrente alternada, informe potência ativa, tensão e fator de potência coerentes com a placa do equipamento. Em trifásico, a tensão informada deve ser a tensão entre fases. Não substitui o dimensionamento de condutores e proteções." />
  </div>;
}

type Strip = { id: number; wattsPerMeter: number; length: number; voltage: string; distance: number };
function LedStripCalculator() {
  const [strips, setStrips] = useState<Strip[]>([{ id: 1, wattsPerMeter: 14.4, length: Number.NaN, voltage: '12', distance: 1 }]);
  const [nextId, setNextId] = useState(2);
  const [loadRatio, setLoadRatio] = useState(0.8);
  const [section, setSection] = useState('1.5');
  const result = useMemo(() => {
    if (!Number.isFinite(loadRatio) || loadRatio <= 0 || loadRatio > 1) return null;
    if (strips.some((s) => !Number.isFinite(s.wattsPerMeter) || s.wattsPerMeter <= 0 || !Number.isFinite(s.length) || s.length <= 0 || !Number.isFinite(s.distance) || s.distance < 0)) return null;
    const perStrip = strips.map((s) => {
      const power = s.wattsPerMeter * s.length;
      const current = power / Number(s.voltage);
      const sectionMm = Number(section);
      const voltageDrop = sectionMm > 0 ? (2 * 0.0175 * s.distance * current) / sectionMm : Number.NaN;
      return { id: s.id, power, current, voltageDrop, dropPercent: voltageDrop / Number(s.voltage) * 100 };
    });
    return { perStrip, totalPower: perStrip.reduce((sum, p) => sum + p.power, 0), recommendedSupply: perStrip.reduce((sum, p) => sum + p.power, 0) / loadRatio };
  }, [strips, loadRatio, section]);
  const update = (id: number, patch: Partial<Strip>) => setStrips((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  return <div className="space-y-4">
    {strips.map((strip, index) => <section key={strip.id} className={panelClass}>
      <div className="flex items-center justify-between"><h3 className="font-semibold text-white">Fita LED {index + 1}</h3>{strips.length > 1 && <button onClick={() => setStrips((prev) => prev.filter((s) => s.id !== strip.id))} className="p-2 text-red-300 rounded-lg" aria-label="Remover fita"><Trash2 size={16}/></button>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><NumberField label="Potência da fita (W/m)" value={strip.wattsPerMeter} min={0.1} onChange={(v) => update(strip.id, { wattsPerMeter: v })}/><NumberField label="Comprimento da fita (m)" value={strip.length} min={0.1} onChange={(v) => update(strip.id, { length: v })}/><SelectField label="Tensão da fita" value={strip.voltage} onChange={(v) => update(strip.id, { voltage: v })} options={[{ value: '5', label: '5 V' }, { value: '12', label: '12 V' }, { value: '24', label: '24 V' }]}/><NumberField label="Distância fonte → fita (m)" value={strip.distance} min={0} onChange={(v) => update(strip.id, { distance: v })}/></div>
      {result && result.perStrip.find((p) => p.id === strip.id) && <div className="grid grid-cols-2 gap-2"><Result label="Potência da fita" value={fmt(result.perStrip.find((p) => p.id === strip.id)!.power) + ' W'} /><Result label="Corrente" value={fmt(result.perStrip.find((p) => p.id === strip.id)!.current) + ' A'} /></div>}
    </section>)}
    <button className="w-full h-11 rounded-xl bg-[#F5B93A] text-[#101827] font-semibold flex items-center justify-center gap-2" onClick={() => { setStrips((prev) => [...prev, { id: nextId, wattsPerMeter: 14.4, length: Number.NaN, voltage: '12', distance: 1 }]); setNextId((n) => n + 1); }}><Plus size={16}/> Adicionar fita LED</button>
    <section className={panelClass}><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><NumberField label="Relação potência LED / fonte (ex.: 0,8)" value={loadRatio} min={0.1} max={1} step={0.05} onChange={setLoadRatio}/><SelectField label="Seção do cabo de cobre (mm²)" value={section} onChange={setSection} options={['0.5','0.75','1','1.5','2.5','4','6'].map((v) => ({ value: v, label: v.replace('.', ',') + ' mm²' }))}/></div></section>
    {result && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Result label="Potência total das fitas" value={fmt(result.totalPower) + ' W'} /><Result label="Potência mínima estimada da fonte" value={fmt(result.recommendedSupply) + ' W'} /><Result label="Fonte comercial sugerida" value={fmt(Math.ceil(result.recommendedSupply / 5) * 5, 0) + ' W ou superior'} />{result.perStrip.map((p, i) => <Result key={p.id} label={'Queda estimada no cabo — fita ' + (i + 1)} value={fmt(p.voltageDrop, 3) + ' V (' + fmt(p.dropPercent) + '%)'} />)}</div>}
    {!result && <p className="text-xs text-[#9FB0C8]">Preencha o comprimento de cada fita com valores maiores que zero para calcular.</p>}
    <LimitBar message="A fonte é estimada pela potência total dividida pela relação de carga informada. A queda de tensão é uma aproximação para cobre em circuito de ida e volta; confirme corrente admissível, comprimento, conectores, ventilação e recomendações do fabricante."/>
  </div>;
}

export const ElectricalCalculatorsView: React.FC<{ mode: ElectricalCalculatorMode }> = ({ mode }) => {
  const titles: Record<ElectricalCalculatorMode, string> = {
    lighting: 'Calculadora de iluminação',
    ampacity: 'Capacidade de condução de corrente',
    resistor: 'Calculadora de resistores',
    current: 'Calculadora de corrente',
    'led-strip': 'Fonte para fitas de LED',
  };
  return <div className="space-y-4">
    <div className="p-4 rounded-2xl bg-[#17243A] border border-[#2A3A55]"><h3 className="text-base font-semibold text-white">{titles[mode]}</h3><p className="text-xs text-[#9FB0C8] mt-1">Informe os parâmetros para obter uma estimativa e conferir a memória de cálculo.</p></div>
    {mode === 'lighting' && <LightingCalculator/>}
    {mode === 'ampacity' && <AmpacityCalculator/>}
    {mode === 'resistor' && <ResistorCalculator/>}
    {mode === 'current' && <CurrentCalculator/>}
    {mode === 'led-strip' && <LedStripCalculator/>}
  </div>;
};
