/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Sun, Wind, AlertOctagon, Compass, ShieldAlert } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';
import { LimitBar } from '../components/LimitBar';

export type AIModuleTab = 'solar' | 'ventilacao' | 'patologias';

interface AIStudiesViewProps {
  initialTab?: AIModuleTab;
}

const RAD = Math.PI / 180;

function solarStudy(latitude: number, facadeAzimuth: number, period: 'verao' | 'inverno' | 'equinocio') {
  const declination = period === 'verao' ? -23.45 : period === 'inverno' ? 23.45 : 0;
  const altitude = 90 - Math.abs(latitude - declination);
  const sunAzimuth = latitude < 0 ? 0 : 180;
  const incidence = Math.acos(
    Math.max(-1, Math.min(1, Math.cos(altitude * RAD) * Math.cos((sunAzimuth - facadeAzimuth) * RAD)))
  ) / RAD;
  const irradiance = Math.max(0, 1000 * Math.cos(incidence * RAD));
  const label =
    incidence <= 30
      ? 'Incidência alta — risco de ganho térmico e ofuscamento'
      : incidence <= 60
        ? 'Incidência moderada — avaliar brises, beirais ou vidro de controle solar'
        : incidence <= 85
          ? 'Incidência baixa — luz difusa predominante'
          : 'Fachada sem incidência direta no horário solar de meio-dia';

  return { declination, altitude, sunAzimuth, incidence, irradiance, label };
}

function ventilationStudy(
  volumeM3: number,
  openingAreaM2: number,
  windSpeedMs: number,
  layout: 'opostas' | 'adjacentes' | 'mesma_parede'
) {
  const factor = layout === 'opostas' ? 0.8 : layout === 'adjacentes' ? 0.55 : 0.25;
  const airflowM3s = 0.6 * openingAreaM2 * windSpeedMs * factor;
  const ach = volumeM3 > 0 ? (airflowM3s * 3600) / volumeM3 : 0;
  const quality = ach >= 6 ? 'Excelente' : ach >= 3 ? 'Boa' : ach >= 1 ? 'Baixa' : 'Insuficiente';
  return { airflowM3s, airflowM3h: airflowM3s * 3600, ach, quality, factor };
}

function pathologyStudy(
  type: 'fissura_diagonal' | 'fissura_vertical' | 'infiltracao' | 'mofo' | 'corrosao',
  location: 'viga_pilar' | 'alvenaria_vedacao' | 'laje' | 'rodape',
  width: number
) {
  const structural = location === 'viga_pilar' || location === 'laje';
  const severity =
    structural && width >= 0.3 ? 'alto' : structural || width >= 1.0 ? 'moderado' : 'baixo';

  const hypotheses: Record<typeof type, { title: string; description: string; action: string }> = {
    fissura_diagonal: {
      title: 'Possível recalque diferencial ou cisalhamento',
      description:
        'Fissura inclinada em alvenaria pode indicar movimentação de fundação; em viga/pilar, pode indicar tensão cisalhante ou sobrecarga.',
      action:
        'Isolar a área se houver risco, instalar selos de monitoramento e solicitar vistoria de engenheiro calculista.',
    },
    fissura_vertical: {
      title: 'Retração, movimentação térmica ou junta de alvenaria',
      description:
        'Fissuras verticais curtas em alvenaria de vedação são frequentemente associadas à retração da argamassa ou ausência de junta de controle.',
      action:
        'Verificar se é ativa, revisar amarração e juntas; se atravessar blocos ou aumentar, avaliar causa estrutural.',
    },
    infiltracao: {
      title: 'Falha de impermeabilização, vedação ou tubulação',
      description:
        'Eflorescência e bolhas indicam umidade ativa. A origem pode estar na fachada, laje, viga baldrame ou instalação hidráulica.',
      action:
        'Localizar a fonte antes de reparar o revestimento, executar teste de estanqueidade e refazer a impermeabilização conforme projeto.',
    },
    mofo: {
      title: 'Condensação ou umidade crônica',
      description:
        'Mofo recorrente costuma indicar ventilação insuficiente, ponte térmica ou infiltração não resolvida.',
      action:
        'Corrigir a fonte de umidade, aumentar ventilação e higienizar com produto adequado; investigar infiltração oculta.',
    },
    corrosao: {
      title: 'Despassivação da armadura por carbonatação ou cloretos',
      description:
        'Armadura exposta com ferrugem reduz a seção de aço e pode gerar desprendimento do concreto de cobrimento.',
      action:
        'Isolar a área, remover concreto solto, tratar a armadura e recompor com argamassa de reparo; exigir laudo estrutural.',
    },
  };

  return { ...hypotheses[type], severity, structural };
}

export const AIStudiesView: React.FC<AIStudiesViewProps> = ({ initialTab = 'solar' }) => {
  const [activeTab, setActiveTab] = useState<AIModuleTab>(initialTab);

  const [latitude, setLatitude] = useState<number>(-23.55);
  const [buildingOrientation, setBuildingOrientation] = useState<number>(0);
  const [solarPeriod, setSolarPeriod] = useState<'verao' | 'inverno' | 'equinocio'>('verao');

  const [windDirection, setWindDirection] = useState<'SE' | 'NE' | 'S' | 'NW'>('SE');
  const [openingLayout, setOpeningLayout] = useState<'opostas' | 'adjacentes' | 'mesma_parede'>('opostas');
  const [roomVolume, setRoomVolume] = useState<number>(60);
  const [openingArea, setOpeningArea] = useState<number>(2);
  const [windSpeed, setWindSpeed] = useState<number>(2.5);

  const [pathologyType, setPathologyType] = useState<
    'fissura_diagonal' | 'fissura_vertical' | 'infiltracao' | 'mofo' | 'corrosao'
  >('fissura_diagonal');
  const [pathologyLocation, setPathologyLocation] = useState<
    'viga_pilar' | 'alvenaria_vedacao' | 'laje' | 'rodape'
  >('viga_pilar');
  const [crackWidthMm, setCrackWidthMm] = useState<number>(0.5);

  const solar = useMemo(
    () => solarStudy(latitude, buildingOrientation, solarPeriod),
    [latitude, buildingOrientation, solarPeriod]
  );
  const ventilation = useMemo(
    () => ventilationStudy(roomVolume, openingArea, windSpeed, openingLayout),
    [roomVolume, openingArea, windSpeed, openingLayout]
  );
  const pathology = useMemo(
    () => pathologyStudy(pathologyType, pathologyLocation, crackWidthMm),
    [pathologyType, pathologyLocation, crackWidthMm]
  );

  return (
    <div className="space-y-5 pb-24">
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

      {activeTab === 'solar' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Estudo Solar Geométrico">
            Cálculo de altura solar no meio-dia e incidência na fachada a partir da latitude, declinação e orientação.
            Estimativa conceitual; não substitui simulação com arquivo climático EPW.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <Field label="Latitude (graus; negativo no hemisfério sul)">
                <input
                  type="number"
                  step="0.01"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(event) => setLatitude(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Fachada principal voltada para">
                <select
                  value={buildingOrientation}
                  onChange={(event) => setBuildingOrientation(Number(event.target.value))}
                  className={inputClass}
                >
                  <option value={0}>Norte (0°)</option>
                  <option value={90}>Leste (90°)</option>
                  <option value={180}>Sul (180°)</option>
                  <option value={270}>Oeste (270°)</option>
                </select>
              </Field>
              <Field label="Período do ano">
                <div className="grid grid-cols-3 gap-1">
                  {(['verao', 'inverno', 'equinocio'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSolarPeriod(period)}
                      className={`h-11 rounded-lg border text-xs font-medium capitalize transition ${
                        solarPeriod === period
                          ? 'bg-[#1F66D6] text-white border-[#1F66D6]'
                          : 'border-[#2A3A55] text-[#9FB0C8]'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <Metric label="Declinação" value={`${solar.declination.toFixed(1)}°`} />
              <Metric label="Altura solar" value={`${solar.altitude.toFixed(1)}°`} />
              <Metric label="Incidência" value={`${solar.incidence.toFixed(1)}°`} />
              <Metric label="Irradiância" value={`${Math.round(solar.irradiance)} W/m²`} accent />
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center text-center gap-2">
              <Compass className="w-10 h-10 text-[#5B9BFF]" />
              <p className="text-sm font-semibold text-white">{solar.label}</p>
              <p className="text-xs text-[#9FB0C8] max-w-lg">
                No meio-dia solar, o Sol está a {solar.altitude.toFixed(1)}° acima do horizonte, no azimute{' '}
                {solar.sunAzimuth}°. A fachada selecionada recebe incidência de {solar.incidence.toFixed(1)}° em relação
                à sua normal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#101827] border border-[#2A3A55] space-y-1">
                <span className="font-bold text-[#3DD68C] block uppercase tracking-wider text-[10px]">
                  Confiança do método
                </span>
                <p className="text-white font-medium">Geométrico / conceitual</p>
                <p className="text-[11px] text-[#9FB0C8]">Válido para orientação preliminar e comparação de fachadas.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#101827] border border-[#2A3A55] space-y-1">
                <span className="font-bold text-[#F5B93A] block uppercase tracking-wider text-[10px]">
                  Dados que faltam para simulação rigorosa
                </span>
                <p className="text-[11px] text-[#9FB0C8]">
                  Modelo 3D de vizinhos, fator solar do vidro, absortância, sombreamento e série climática horária.
                </p>
              </div>
            </div>
          </div>

          <LimitBar message="O estudo solar preliminar não substitui a comprovação de desempenho térmico da ABNT NBR 15575." />
        </div>
      )}

      {activeTab === 'ventilacao' && (
        <div className="space-y-4">
          <AlertBanner level="info" title="Ventilação Natural — Estimativa de Renovação">
            Estimativa simplificada de vazão por abertura efetiva e vento local. Não substitui simulação CFD ou
            medição em campo.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Field label="Disposição das aberturas">
                <select
                  value={openingLayout}
                  onChange={(event) => setOpeningLayout(event.target.value as typeof openingLayout)}
                  className={inputClass}
                >
                  <option value="opostas">Paredes opostas — fluxo cruzado direto</option>
                  <option value="adjacentes">Paredes adjacentes em 90°</option>
                  <option value="mesma_parede">Mesma parede — ventilação unilateral</option>
                </select>
              </Field>
              <Field label="Vento dominante local">
                <select
                  value={windDirection}
                  onChange={(event) => setWindDirection(event.target.value as typeof windDirection)}
                  className={inputClass}
                >
                  <option value="SE">Sudeste (SE)</option>
                  <option value="NE">Nordeste (NE)</option>
                  <option value="S">Sul (S)</option>
                  <option value="NW">Noroeste (NO)</option>
                </select>
              </Field>
              <Field label="Volume do ambiente (m³)">
                <input
                  type="number"
                  min="1"
                  value={roomVolume}
                  onChange={(event) => setRoomVolume(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Área efetiva de abertura (m²)">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={openingArea}
                  onChange={(event) => setOpeningArea(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Velocidade do vento (m/s)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={windSpeed}
                  onChange={(event) => setWindSpeed(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
              <Metric label="Vazão estimada" value={`${ventilation.airflowM3h.toFixed(0)} m³/h`} />
              <Metric label="Renovações (ACH)" value={`${ventilation.ach.toFixed(1)} /h`} accent />
              <Metric label="Classificação" value={ventilation.quality} />
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-[#06B6D4]">
                <Wind className="w-4 h-4" />
                <span>Leitura do resultado</span>
              </div>
              <p className="text-[#E8EDF5] leading-relaxed">
                Considerando vento de {windDirection} a {windSpeed.toFixed(1)} m/s e fator de layout{' '}
                {ventilation.factor.toFixed(2)}, a vazão estimada é {ventilation.airflowM3s.toFixed(2)} m³/s. A
                classificação usa referência prática de 1 a 3 renovações/hora para ventilação mínima e acima de 6
                renovações/hora para ventilação eficiente.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#101827] border border-[#2A3A55] text-[11px] text-[#9FB0C8]">
              <strong>Fator de incerteza:</strong> divisórias, móveis altos, portas fechadas, telas e obstruções podem
              reduzir substancialmente o fluxo real.
            </div>
          </div>

          <LimitBar message="A estimativa de ventilação é orientativa. Conforto térmico e qualidade do ar exigem projeto e, quando necessário, simulação especializada." />
        </div>
      )}

      {activeTab === 'patologias' && (
        <div className="space-y-4">
          <AlertBanner level="danger" title="SINAIS DE PERIGO ESTRUTURAL — PROCEDIMENTO DE URGÊNCIA">
            Se notar fissuras inclinadas em vigas/pilares, flechas excessivas em lajes ou som oco com estalos:{' '}
            <strong>ISOLE IMEDIATAMENTE A ÁREA</strong>, evacue o local de risco e convoque a Defesa Civil ou um
            Engenheiro Calculista registrado no CREA. O app não emite laudo de estabilidade.
          </AlertBanner>

          <div className="p-5 rounded-2xl bg-[#17243A] border border-[#2A3A55] space-y-4">
            <h4 className="font-bold text-base text-white">Triagem Orientativa de Manifestações Patológicas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <Field label="Tipo de manifestação">
                <select
                  value={pathologyType}
                  onChange={(event) => setPathologyType(event.target.value as typeof pathologyType)}
                  className={inputClass}
                >
                  <option value="fissura_diagonal">Fissura inclinada (~45°)</option>
                  <option value="fissura_vertical">Fissura vertical em alvenaria</option>
                  <option value="infiltracao">Infiltração com eflorescência/bolhas</option>
                  <option value="mofo">Mofo e bolor recorrente</option>
                  <option value="corrosao">Armadura exposta com ferrugem</option>
                </select>
              </Field>
              <Field label="Elemento acometido">
                <select
                  value={pathologyLocation}
                  onChange={(event) => setPathologyLocation(event.target.value as typeof pathologyLocation)}
                  className={inputClass}
                >
                  <option value="viga_pilar">Viga ou pilar de concreto</option>
                  <option value="alvenaria_vedacao">Parede de vedação / tijolos</option>
                  <option value="laje">Laje de forro ou piso</option>
                  <option value="rodape">Rodapé / base da parede</option>
                </select>
              </Field>
              <Field label="Abertura estimada (mm)">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={crackWidthMm}
                  onChange={(event) => setCrackWidthMm(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
              <span className="font-bold text-[#F5B93A] uppercase tracking-wider text-[11px] block">
                Hipótese técnica preliminar
              </span>
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`w-5 h-5 ${
                    pathology.severity === 'alto'
                      ? 'text-[#FF6B6B]'
                      : pathology.severity === 'moderado'
                        ? 'text-[#F5B93A]'
                        : 'text-[#3DD68C]'
                  }`}
                />
                <p className="font-bold text-white">{pathology.title}</p>
              </div>
              <p className="text-[#E8EDF5] leading-relaxed">{pathology.description}</p>
              <p className="text-[#9FB0C8] leading-relaxed">
                <strong className="text-white">Conduta sugerida:</strong> {pathology.action}
              </p>
              <div className="text-[11px] pt-1">
                Severidade preliminar:{' '}
                <span className="font-bold uppercase">{pathology.severity}</span> · elemento{' '}
                {pathology.structural ? 'estrutural' : 'não estrutural'} · abertura {crackWidthMm.toFixed(1)} mm
              </div>
            </div>
          </div>

          <LimitBar message="A triagem fornece apenas hipóteses educativas preliminares. Não substitui Laudo Pericial de Engenharia Diagnóstica." />
        </div>
      )}
    </div>
  );
};

const inputClass =
  'w-full h-11 px-3 rounded-xl bg-[#101827] border border-[#6B7F9E] text-white text-xs outline-none focus:border-[#5B9BFF]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-1 block">
    <span className="text-[#9FB0C8]">{label}</span>
    {children}
  </label>
);

const Metric: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="p-3 rounded-xl bg-[#101827] border border-[#2A3A55]">
    <span className="text-[10px] text-[#9FB0C8] block">{label}</span>
    <span className={`text-sm font-bold font-mono ${accent ? 'text-[#5B9BFF]' : 'text-white'}`}>{value}</span>
  </div>
);
