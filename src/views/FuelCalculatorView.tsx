import React, { useMemo, useState } from 'react';
import { Fuel, Gauge, Route, Wallet, Users, FlaskConical, AlertTriangle, Info } from 'lucide-react';
import { LimitBar } from '../components/LimitBar';

type Panel = 'consumo' | 'custos' | 'e85';
const num = (v: string) => v.trim() === '' ? Number.NaN : Number(v);
const fmt = (v: number, digits = 2) => Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
const money = (v: number) => Number.isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const Field: React.FC<{label:string; value:string; onChange:(v:string)=>void; unit?:string; step?:string}> = ({label,value,onChange,unit,step='any'}) => (
  <label className="block min-w-0">
    <span className="text-xs text-[#9FB0C8]">{label}{unit ? ` (${unit})` : ''}</span>
    <input type="number" min="0" step={step} value={value} onChange={e=>onChange(e.target.value)}
      className="mt-1 w-full min-h-11 rounded-xl bg-[#101827] border border-[#40516d] px-3 py-2 text-white font-mono focus:outline-none focus:border-[#5B9BFF]" />
  </label>
);
const Metric: React.FC<{label:string;value:string;hint?:string}> = ({label,value,hint}) => (
  <div className="rounded-xl border border-[#2A3A55] bg-black/20 p-3 min-w-0">
    <div className="text-xs text-[#9FB0C8]">{label}</div><div className="mt-1 text-lg font-bold text-white break-words">{value}</div>
    {hint && <div className="mt-1 text-[11px] text-[#9FB0C8]">{hint}</div>}
  </div>
);
const Section: React.FC<{title:string; icon:React.ElementType; children:React.ReactNode}> = ({title,icon:Icon,children}) => (
  <section className="space-y-3 rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-[#5B9BFF]"/>{title}</h3>
    {children}
  </section>
);

export const FuelCalculatorView: React.FC = () => {
  const [panel,setPanel] = useState<Panel>('consumo');
  const [distance,setDistance] = useState('300');
  const [liters,setLiters] = useState('25');
  const [average,setAverage] = useState('12');
  const [before,setBefore] = useState('10');
  const [after,setAfter] = useState('12');
  const [price,setPrice] = useState('5.89');
  const [paid,setPaid] = useState('100');
  const [tank,setTank] = useState('50');
  const [monthlyDistance,setMonthlyDistance] = useState('1000');
  const [passengers,setPassengers] = useState('4');
  const [stationA,setStationA] = useState('5.89');
  const [stationB,setStationB] = useState('5.99');
  const [stationC,setStationC] = useState('5.79');
  const d=num(distance), l=num(liters), avg=num(average), p=num(price);
  const efficiency=useMemo(()=>({kmL:d>0&&l>0?d/l:NaN,l100:d>0&&l>0?l/d*100:NaN,tripLiters:d>0&&avg>0?d/avg:NaN,variation:num(before)>0&&num(after)>=0?(num(after)-num(before))/num(before)*100:NaN}),[distance,liters,average,before,after]);
  const cost=useMemo(()=>({perKm:d>0&&l>=0&&p>=0?l*p/d:NaN,per100:d>0&&l>=0&&p>=0?l*p/d*100:NaN,trip:d>0&&avg>0&&p>=0?d/avg*p:NaN,litersBought:p>0&&num(paid)>=0?num(paid)/p:NaN,range:num(tank)>=0&&avg>0?num(tank)*avg:NaN,monthly:num(monthlyDistance)>=0&&avg>0&&p>=0?num(monthlyDistance)/avg*p:NaN,share:num(passengers)>0&&d>0&&avg>0&&p>=0?d/avg*p/num(passengers):NaN}),[distance,liters,price,average,paid,tank,monthlyDistance,passengers]);
  const stations=[{name:'Posto A',price:num(stationA)},{name:'Posto B',price:num(stationB)},{name:'Posto C',price:num(stationC)}].filter(x=>Number.isFinite(x.price)&&x.price>0).sort((a,b)=>a.price-b.price);
  const tabs:[Panel,string][]=[['consumo','Consumo e eficiência'],['custos','Custos e abastecimento'],['e85','Estudo experimental E85']];
  return <div className="space-y-4">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-[#1F66D6]/20 p-3"><Fuel className="h-6 w-6 text-[#5B9BFF]"/></div>
      <div><h3 className="text-lg font-bold text-white">Calculadora de combustível</h3><p className="text-xs text-[#9FB0C8]">Consumo, autonomia, custos de viagem e informações técnicas sobre E85.</p></div>
    </div>
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2A3A55] bg-[#101827] p-1">
      {tabs.map(([id,label])=><button key={id} onClick={()=>setPanel(id)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${panel===id?'bg-[#1F66D6] text-white':'text-[#9FB0C8] hover:text-white'}`}>{label}</button>)}
    </div>
    {panel==='consumo' && <div className="space-y-4">
      <Section title="Dados de consumo" icon={Gauge}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Distância percorrida" unit="km" value={distance} onChange={setDistance}/>
          <Field label="Combustível consumido" unit="L" value={liters} onChange={setLiters}/>
          <Field label="Consumo médio conhecido" unit="km/L" value={average} onChange={setAverage}/>
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Consumo médio" value={`${fmt(efficiency.kmL)} km/L`} hint="Distância ÷ litros consumidos"/>
        <Metric label="Consumo internacional" value={`${fmt(efficiency.l100)} L/100 km`} hint="Litros ÷ distância × 100"/>
        <Metric label="Combustível para a viagem" value={`${fmt(efficiency.tripLiters)} L`} hint="Distância ÷ consumo médio"/>
      </div>
      <Section title="Comparar rendimento antes e depois" icon={Route}>
        <div className="grid grid-cols-2 gap-3"><Field label="Consumo anterior" unit="km/L" value={before} onChange={setBefore}/><Field label="Consumo novo" unit="km/L" value={after} onChange={setAfter}/></div>
        <Metric label="Variação do consumo" value={Number.isFinite(efficiency.variation)?`${efficiency.variation>0?'+':''}${fmt(efficiency.variation)}%`:'—'} hint="Percentual de mudança no km/L; positivo indica maior rendimento."/>
      </Section>
      <LimitBar message="São estimativas matemáticas com base nos valores informados. Consumo real varia com trânsito, relevo, carga, manutenção, clima e condução."/>
    </div>}
    {panel==='custos' && <div className="space-y-4">
      <Section title="Preço e abastecimento" icon={Wallet}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Preço por litro" unit="R$/L" value={price} onChange={setPrice}/>
          <Field label="Valor pago" unit="R$" value={paid} onChange={setPaid}/>
          <Field label="Capacidade do tanque" unit="L" value={tank} onChange={setTank}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Litros abastecidos" value={`${fmt(cost.litersBought)} L`} hint="Valor pago ÷ preço/L"/>
          <Metric label="Autonomia estimada" value={`${fmt(cost.range,0)} km`} hint="Tanque cheio × km/L"/>
        </div>
      </Section>
      <Section title="Custo de uso e viagem" icon={Route}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Distância da viagem" unit="km" value={distance} onChange={setDistance}/>
          <Field label="Consumo médio" unit="km/L" value={average} onChange={setAverage}/>
          <Field label="Distância mensal" unit="km/mês" value={monthlyDistance} onChange={setMonthlyDistance}/>
          <Field label="Número de passageiros" value={passengers} onChange={setPassengers} step="1"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Custo por km" value={money(cost.perKm)} hint="Custo informado ÷ distância"/>
          <Metric label="Custo por 100 km" value={money(cost.per100)}/>
          <Metric label="Custo estimado da viagem" value={money(cost.trip)} hint="Litros necessários × preço/L"/>
          <Metric label="Custo mensal estimado" value={money(cost.monthly)} hint="Distância mensal ÷ km/L × preço/L"/>
          <Metric label="Cota por passageiro" value={money(cost.share)} hint="Custo estimado dividido igualmente"/>
        </div>
      </Section>
      <Section title="Comparar preços de postos" icon={Wallet}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Posto A" unit="R$/L" value={stationA} onChange={setStationA}/>
          <Field label="Posto B" unit="R$/L" value={stationB} onChange={setStationB}/>
          <Field label="Posto C" unit="R$/L" value={stationC} onChange={setStationC}/>
        </div>
        {stations.length>0 ? <div className="space-y-2">{stations.map((s,i)=><div key={s.name} className="flex items-center justify-between rounded-lg border border-[#2A3A55] px-3 py-2 text-sm"><span className="text-[#E8EDF5]">{i+1}. {s.name}</span><strong className="text-white">{money(s.price)}/L</strong></div>)}<p className="text-xs text-[#9FB0C8]">Menor preço informado: {stations[0].name}. Considere distância, qualidade e custo para chegar ao posto.</p></div>:<p className="text-xs text-[#9FB0C8]">Informe ao menos um preço válido.</p>}
      </Section>
      <LimitBar message="A comparação considera apenas os preços digitados manualmente; não consulta preços em tempo real. O custo mensal não inclui manutenção, pedágios, estacionamento ou depreciação."/>
    </div>}
    {panel==='e85' && <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white"><AlertTriangle className="h-4 w-4 text-amber-400"/>Parecer preliminar: pesquisa em laboratório, com condições</h3>
        <p className="text-sm leading-relaxed text-[#D5DEEA]">A conversão experimental de um motor flex brasileiro para E85 pode ser tecnicamente viável, mas não é possível aprovar um veículo sem identificar motor, ECU, alimentação e materiais. Viabilidade mecânica não comprova segurança, durabilidade ou legalidade para uso em vias públicas.</p>
      </div>
      <Section title="Combustível de referência" icon={FlaskConical}>
        <p className="text-sm leading-relaxed text-[#D5DEEA]">O documento-base descreve E85 como mistura de gasolina e etanol anidro dentro da especificação aplicável ASTM D5798 (51% a 83% de etanol por volume). Não deve ser confundido com etanol hidratado brasileiro nem com misturas experimentais feitas sem caracterização.</p>
        <p className="text-sm leading-relaxed text-[#D5DEEA]">Antes dos ensaios, devem ser conhecidos teor de etanol, água, volatilidade, qualidade da gasolina-base e contaminantes.</p>
      </Section>
      <Section title="Itens críticos de avaliação" icon={Info}>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[#D5DEEA]">
          <li><strong>Sistema de alimentação:</strong> bomba, injetores, filtro, regulador, tanque, tubulações, vedações e sensores; verificar vazão, pressão e compatibilidade química.</li>
          <li><strong>Materiais:</strong> avaliar elastômeros, metais, plásticos, revestimentos e interfaces quanto a inchamento, corrosão, permeação, fissuras e vazamentos.</li>
          <li><strong>ECU:</strong> validar mistura ar-combustível, capacidade dos injetores, ignição, detonação, temperaturas, sensores, catalisador e diagnóstico de falhas.</li>
          <li><strong>Partida a frio:</strong> testar diferentes temperaturas, estabilidade inicial, hesitação, apagamentos e emissões durante aquecimento.</li>
          <li><strong>Segurança:</strong> instalação preparada para inflamáveis, ventilação, controle de ignição, contenção, resposta a vazamentos, equipamentos de proteção e emergência.</li>
        </ul>
      </Section>
      <Section title="Sequência de validação sugerida" icon={Route}>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[#D5DEEA]">
          <li>Caracterizar o combustível e verificar sua especificação.</li>
          <li>Testar compatibilidade dos materiais e inspecionar componentes.</li>
          <li>Validar pressão, vazão e estabilidade em bancada.</li>
          <li>Calibrar e avaliar o motor em dinamômetro com instrumentação adequada.</li>
          <li>Validar durabilidade, partida a frio, emissões e repetibilidade.</li>
        </ol>
      </Section>
      <Section title="Custos e conformidade" icon={Wallet}>
        <p className="text-sm leading-relaxed text-[#D5DEEA]">O orçamento deve separar engenharia, componentes, eletrônica e instrumentação, laboratório (combustível, materiais, emissões e dinamômetro) e conformidade. No Brasil, modificações veiculares exigem análise do enquadramento legal aplicável; confirmar o procedimento com o órgão de trânsito competente antes de qualquer alteração.</p>
      </Section>
      <LimitBar message="Conteúdo informativo para planejamento de pesquisa. Não é procedimento de conversão nem autorização de uso rodoviário. Não faça misturas improvisadas ou testes em vias públicas; a avaliação exige profissionais qualificados e instalação apropriada."/>
    </div>}
  </div>;
};
