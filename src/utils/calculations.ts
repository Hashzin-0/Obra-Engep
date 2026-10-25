/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure calculation logic for OBra ENGEP
 */

export interface ElectricalCalcInput {
  powerWatts?: number;
  voltageVolts?: number;
  powerFactor?: number; // cos phi, default ~0.92
  currentAmps?: number;
  resistanceOhms?: number;
}

export interface ElectricalCalcResult {
  value: number;
  unit: string;
  formula: string;
  premises: string;
  limitWarning: string;
}

function assertFiniteInputs(values: number[]): void {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Preencha todos os campos com valores numéricos válidos.');
  }
}

/**
 * Calculates single-phase electrical current: I = P / (V × FP)
 * Test case from briefing: 3500 W / (220 V × 0.92) = 17.29 A
 */
export function calculateCurrent(powerW: number, voltageV: number, powerFactor: number = 0.92): ElectricalCalcResult {
  assertFiniteInputs([powerW, voltageV, powerFactor]);
  if (voltageV <= 0) throw new Error('A tensão deve ser maior que zero.');
  if (powerFactor <= 0 || powerFactor > 1) throw new Error('O fator de potência (FP) deve estar entre 0.01 e 1.00.');
  if (powerW < 0) throw new Error('A potência não pode ser negativa.');

  const current = powerW / (voltageV * powerFactor);
  const rounded = Math.round(current * 100) / 100;

  return {
    value: rounded,
    unit: 'A',
    formula: 'I = P / (V × FP)',
    premises: `Monofásico: P=${powerW} W, V=${voltageV} V, FP=${powerFactor}`,
    limitWarning: 'Dimensionamento de condutores e disjuntores exige validação conforme NBR 5410 e responsável técnico habilitado.',
  };
}

/**
 * Calculates power from current, voltage and power factor: P = V × I × FP
 */
export function calculatePower(voltageV: number, currentA: number, powerFactor: number = 0.92): ElectricalCalcResult {
  assertFiniteInputs([voltageV, currentA, powerFactor]);
  if (voltageV <= 0 || currentA < 0) throw new Error('Valores inválidos para cálculo de potência.');
  const power = voltageV * currentA * powerFactor;
  return {
    value: Math.round(power * 100) / 100,
    unit: 'W',
    formula: 'P = V × I × FP',
    premises: `V=${voltageV} V, I=${currentA} A, FP=${powerFactor}`,
    limitWarning: 'Cálculo para regime permanente em circuito monofásico.',
  };
}

/**
 * Ohm's law: V = R * I
 */
export function calculateOhmsLawVoltage(resistanceOhms: number, currentA: number): ElectricalCalcResult {
  assertFiniteInputs([resistanceOhms, currentA]);
  const v = resistanceOhms * currentA;
  return {
    value: Math.round(v * 100) / 100,
    unit: 'V',
    formula: 'V = R × I',
    premises: `R=${resistanceOhms} Ω, I=${currentA} A`,
    limitWarning: 'Válido para condutores puramente resistivos em corrente contínua ou alternada monofásica.',
  };
}

/**
 * Voltage drop estimation: e (%) = (2 * L * I * 100) / (gamma * S * V)
 * gamma for copper ~ 56 m/(ohm*mm2)
 */
export function estimateVoltageDrop(
  lengthMeters: number,
  currentA: number,
  sectionMm2: number,
  voltageV: number
): ElectricalCalcResult {
  assertFiniteInputs([lengthMeters, currentA, sectionMm2, voltageV]);
  if (sectionMm2 <= 0 || voltageV <= 0) throw new Error('Seção e tensão devem ser maiores que zero.');
  const dropVolts = (2 * lengthMeters * currentA) / (56 * sectionMm2);
  const dropPercent = (dropVolts / voltageV) * 100;
  return {
    value: Math.round(dropPercent * 100) / 100,
    unit: '%',
    formula: 'ΔV(%) = (2 × L × I × 100) / (56 × S × V)',
    premises: `Cobre: L=${lengthMeters}m, I=${currentA}A, S=${sectionMm2}mm², V=${voltageV}V (Queda máx NBR 5410: 4%)`,
    limitWarning: 'Estimativa preliminar. Não substitui cálculo formal considerando agrupamento e temperatura.',
  };
}

/**
 * Hydraulic reservoir estimation based on occupants and building type
 * Residência unifamiliar: ~150 L/pessoa/dia, reserva mínima 2 dias
 */
export function calculateReservoirCapacity(
  occupants: number,
  litersPerPersonPerDay: number = 150,
  reserveDays: number = 2
): ElectricalCalcResult {
  assertFiniteInputs([occupants, litersPerPersonPerDay, reserveDays]);
  if (occupants <= 0) throw new Error('Número de ocupantes deve ser maior que zero.');
  const totalLiters = occupants * litersPerPersonPerDay * reserveDays;
  return {
    value: totalLiters,
    unit: 'Litros',
    formula: 'V = Ocupantes × Consumo Diário × Dias de Reserva',
    premises: `${occupants} pessoas × ${litersPerPersonPerDay} L/dia × ${reserveDays} dias de autonomia`,
    limitWarning: 'Estimativa simples não é projeto hidráulico. Considere reserva técnica de incêndio conforme exigência dos bombeiros.',
  };
}

/**
 * Flow rate calculation: Q = Volume (L) / Time (min) -> L/min or m3/h
 */
export function calculateFlowRate(liters: number, minutes: number): ElectricalCalcResult {
  assertFiniteInputs([liters, minutes]);
  if (minutes <= 0) throw new Error('Tempo deve ser maior que zero.');
  const flowRateLmin = liters / minutes;
  return {
    value: Math.round(flowRateLmin * 100) / 100,
    unit: 'L/min',
    formula: 'Q = Volume / Tempo',
    premises: `V=${liters} L em ${minutes} min (equivale a ${((flowRateLmin * 60) / 1000).toFixed(2)} m³/h)`,
    limitWarning: 'Vazão média estimada. Não leva em consideração perda de carga distribuída e localizada.',
  };
}

/**
 * Masonry / Bricks estimator
 * Brick size e.g. 19x19x9 cm: ~25 bricks/m² plus waste margin (default 10%)
 */
export function calculateMasonryMaterials(
  wallLengthMeters: number,
  wallHeightMeters: number,
  openingsAreaM2: number = 0,
  bricksPerM2: number = 25,
  wastePercentage: number = 10
): {
  netAreaM2: number;
  totalBricks: number;
  mortarBagsEstimate: number;
  premises: string;
  limitWarning: string;
} {
  assertFiniteInputs([wallLengthMeters, wallHeightMeters, openingsAreaM2, bricksPerM2, wastePercentage]);
  const grossArea = wallLengthMeters * wallHeightMeters;
  const netArea = Math.max(0, grossArea - openingsAreaM2);
  const factor = 1 + wastePercentage / 100;
  const totalBricks = Math.ceil(netArea * bricksPerM2 * factor);
  const mortarBagsEstimate = Math.ceil((netArea * 18 * factor) / 50); // ~18kg/m2

  return {
    netAreaM2: Math.round(netArea * 100) / 100,
    totalBricks,
    mortarBagsEstimate,
    premises: `Área útil ${netArea.toFixed(2)} m² com ${wastePercentage}% de margem de perda configurada.`,
    limitWarning: 'Quantitativo estimativo para planejamento preliminar de compras. Não substitui lista de materiais do projeto executivo.',
  };
}

/**
 * Roof area with slope: Real Area = Projected Area / cos(arctan(slope% / 100))
 */
export function calculateRoofArea(
  lengthM: number,
  widthM: number,
  slopePercentage: number = 30,
  wastePercentage: number = 8
): {
  realAreaM2: number;
  tileCountEstimate: number; // e.g. Ceramic ~16 tiles/m2
  premises: string;
  limitWarning: string;
} {
  assertFiniteInputs([lengthM, widthM, slopePercentage, wastePercentage]);
  const projectedArea = lengthM * widthM;
  const radians = Math.atan(slopePercentage / 100);
  const realArea = projectedArea / Math.cos(radians);
  const totalAreaWithWaste = realArea * (1 + wastePercentage / 100);
  const tiles = Math.ceil(totalAreaWithWaste * 16);

  return {
    realAreaM2: Math.round(totalAreaWithWaste * 100) / 100,
    tileCountEstimate: tiles,
    premises: `Área plana ${projectedArea.toFixed(2)} m², inclinação ${slopePercentage}%, perda ${wastePercentage}%`,
    limitWarning: 'Cálculo geométrico sem verificação de sobrecarga de vento, peso próprio ou estrutura de madeiramento/aço.',
  };
}

/**
 * Automotive Dilution Calculator:
 * Ratio 1:X (e.g. 1:10) -> For total volume V (e.g. 1000 ml),
 * Product = V / (1 + X)
 * Water = V - Product
 */
export function calculateDilution(ratioNumber: number, targetTotalMl: number): {
  productMl: number;
  waterMl: number;
  ratioLabel: string;
  premises: string;
  caution: string;
} {
  assertFiniteInputs([ratioNumber, targetTotalMl]);
  if (ratioNumber < 1) throw new Error('A proporção de diluição deve ser maior ou igual a 1.');
  const totalParts = 1 + ratioNumber;
  const productMl = Math.round((targetTotalMl / totalParts) * 10) / 10;
  const waterMl = Math.round((targetTotalMl - productMl) * 10) / 10;

  return {
    productMl,
    waterMl,
    ratioLabel: `1:${ratioNumber}`,
    premises: `Solução total de ${targetTotalMl} mL na proporção 1:${ratioNumber}`,
    caution: 'Teste em área discreta. Nunca misturar produtos químicos. Diluição sempre com fonte registrada.',
  };
}

/**
 * Hazen-Williams head loss for water-filled pipes.
 * hf = 10.67 × L × Q^1.852 / (C^1.852 × D^4.87)
 * Q in m³/s, D in m, hf in mca.
 */
export function calculateHazenWilliams(
  flowLmin: number,
  lengthM: number,
  diameterMm: number,
  material: 'PVC' | 'Cobre' | 'Aço galvanizado' = 'PVC'
): ElectricalCalcResult {
  assertFiniteInputs([flowLmin, lengthM, diameterMm]);
  if (flowLmin <= 0 || lengthM <= 0 || diameterMm <= 0) {
    throw new Error('Vazão, comprimento e diâmetro devem ser maiores que zero.');
  }
  const c = material === 'PVC' ? 150 : material === 'Cobre' ? 130 : 120;
  const flowM3s = flowLmin / 60000;
  const diameterM = diameterMm / 1000;
  const headLoss =
    (10.67 * lengthM * Math.pow(flowM3s, 1.852)) /
    (Math.pow(c, 1.852) * Math.pow(diameterM, 4.87));
  const velocity = flowM3s / (Math.PI * Math.pow(diameterM, 2) / 4);

  return {
    value: Math.round(headLoss * 1000) / 1000,
    unit: 'mca',
    formula: 'hf = 10,67 × L × Q^1,852 / (C^1,852 × D^4,87)',
    premises: `Q=${flowLmin} L/min, L=${lengthM} m, D=${diameterMm} mm, C=${c} (${material})`,
    limitWarning:
      velocity > 3
        ? `Velocidade estimada de ${velocity.toFixed(2)} m/s acima do recomendado (≤ 3 m/s). Reavalie o diâmetro.`
        : `Velocidade estimada de ${velocity.toFixed(2)} m/s. Perda localizada (conexões) não incluída.`,
  };
}

/**
 * Minimum internal diameter for a target maximum velocity.
 * D = sqrt(4 × Q / (π × v))
 */
export function calculateRecommendedDiameter(
  flowLmin: number,
  maxVelocityMs: number = 1.5
): ElectricalCalcResult {
  assertFiniteInputs([flowLmin, maxVelocityMs]);
  if (flowLmin <= 0 || maxVelocityMs <= 0) {
    throw new Error('Vazão e velocidade máxima devem ser maiores que zero.');
  }
  const flowM3s = flowLmin / 60000;
  const areaM2 = flowM3s / maxVelocityMs;
  const diameterMm = Math.sqrt((4 * areaM2) / Math.PI) * 1000;
  const commercial = [20, 25, 32, 40, 50, 60, 75, 85, 100, 125, 150, 200, 250, 300];
  const recommended = commercial.find((size) => size >= diameterMm) ?? Math.ceil(diameterMm);

  return {
    value: recommended,
    unit: 'mm',
    formula: 'D = √(4 × Q / (π × v))',
    premises: `Q=${flowLmin} L/min, v máxima=${maxVelocityMs} m/s; diâmetro interno calculado ${diameterMm.toFixed(1)} mm`,
    limitWarning: 'Diâmetro comercial nominal sugerido. Confirme diâmetro interno real do fabricante e perdas localizadas.',
  };
}

export interface CableSizingResult {
  currentA: number;
  sectionMm2: number;
  breakerA: number;
  ampacityA: number;
  voltageDropPercent: number;
  formula: string;
  premises: string;
  limitWarning: string;
}

/**
 * Preliminary single-phase cable/breaker sizing for copper PVC insulated cables,
 * method B1, two loaded conductors. This is a planning aid, not a normative design.
 */
export function calculateCableSizing(
  powerW: number,
  voltageV: number,
  powerFactor: number,
  lengthM: number
): CableSizingResult {
  assertFiniteInputs([powerW, voltageV, powerFactor, lengthM]);
  if (powerW <= 0 || voltageV <= 0 || powerFactor <= 0 || lengthM <= 0) {
    throw new Error('Potência, tensão, fator de potência e comprimento devem ser maiores que zero.');
  }

  const currentA = powerW / (voltageV * powerFactor);
  const ampacityTable: Array<{ section: number; ampacity: number }> = [
    { section: 1.5, ampacity: 17.5 },
    { section: 2.5, ampacity: 24 },
    { section: 4, ampacity: 32 },
    { section: 6, ampacity: 41 },
    { section: 10, ampacity: 57 },
    { section: 16, ampacity: 76 },
    { section: 25, ampacity: 101 },
    { section: 35, ampacity: 125 },
    { section: 50, ampacity: 151 },
    { section: 70, ampacity: 192 },
    { section: 95, ampacity: 232 },
    { section: 120, ampacity: 269 },
    { section: 150, ampacity: 309 },
    { section: 185, ampacity: 353 },
    { section: 240, ampacity: 415 },
  ];

  const selected =
    ampacityTable.find((entry) => {
      const drop = (2 * lengthM * currentA) / (56 * entry.section);
      return entry.ampacity >= currentA && (drop / voltageV) * 100 <= 4;
    }) ?? ampacityTable[ampacityTable.length - 1];

  const voltageDropPercent = ((2 * lengthM * currentA) / (56 * selected.section) / voltageV) * 100;
  const breakers = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const breakerA = breakers.find((breaker) => breaker >= currentA && breaker <= selected.ampacity) ?? 0;

  return {
    currentA: Math.round(currentA * 100) / 100,
    sectionMm2: selected.section,
    breakerA,
    ampacityA: selected.ampacity,
    voltageDropPercent: Math.round(voltageDropPercent * 100) / 100,
    formula: 'IB = P / (V × FP); IB ≤ In ≤ Iz; ΔV ≤ 4%',
    premises: `Cobre/PVC, método B1, 2 condutores carregados: P=${powerW} W, V=${voltageV} V, FP=${powerFactor}, L=${lengthM} m`,
    limitWarning:
      'Pré-dimensionamento para circuito monofásico. Agrupamento, temperatura, curto-circuito e coordenação devem ser verificados por profissional habilitado conforme NBR 5410.',
  };
}
