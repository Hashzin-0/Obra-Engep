import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurrent,
  calculatePower,
  calculateOhmsLawVoltage,
  estimateVoltageDrop,
  calculateReservoirCapacity,
  calculateMasonryMaterials,
  calculateRoofArea,
  calculateDilution,
  calculateHazenWilliams,
  calculateRecommendedDiameter,
  calculateCableSizing,
} from './calculations';

test('Calculadora Elétrica: Caso conhecido do briefing (3500 W, 220 V, FP 0.92 = 17.29 A)', () => {
  const result = calculateCurrent(3500, 220, 0.92);
  assert.equal(result.value, 17.29);
  assert.equal(result.unit, 'A');
  assert.equal(result.formula, 'I = P / (V × FP)');
  assert.ok(result.limitWarning.includes('NBR 5410'));
});

test('Calculadora Elétrica: Potência P = V * I * FP', () => {
  const result = calculatePower(220, 17.29, 0.92);
  // 220 * 17.29 * 0.92 = 3499.50
  assert.ok(result.value > 3490 && result.value < 3510);
  assert.equal(result.unit, 'W');
});

test('Lei de Ohm: V = R * I', () => {
  const result = calculateOhmsLawVoltage(10, 5);
  assert.equal(result.value, 50);
  assert.equal(result.unit, 'V');
});

test('Queda de Tensão percentual', () => {
  const result = estimateVoltageDrop(25, 20, 4, 220);
  assert.ok(result.value > 0);
  assert.equal(result.unit, '%');
});

test('Calculadora Hidráulica: Dimensionamento de reservatório', () => {
  // 4 pessoas x 150 L/dia x 2 dias = 1200 L
  const result = calculateReservoirCapacity(4, 150, 2);
  assert.equal(result.value, 1200);
  assert.equal(result.unit, 'Litros');
  assert.ok(result.limitWarning.includes('não é projeto'));
});

test('Calculadora de Materiais: Alvenaria com margem de perda', () => {
  // Parede de 5m x 3m = 15m², abertura de 2m² -> 13m² líquido
  // 13m² * 25 tijolos * 1.10 = 357.5 -> 358 tijolos
  const result = calculateMasonryMaterials(5, 3, 2, 25, 10);
  assert.equal(result.netAreaM2, 13);
  assert.equal(result.totalBricks, 358);
});

test('Calculadora de Telhado: Área inclinada com perda', () => {
  const result = calculateRoofArea(10, 5, 30, 8);
  assert.ok(result.realAreaM2 > 50);
  assert.ok(result.tileCountEstimate > 0);
});

test('Estética Automotiva: Diluição 1:10 para 1000 mL', () => {
  // 1:10 -> 1 parte produto, 10 partes água -> 11 partes total
  // 1000 / 11 = 90.9 mL produto, 909.1 mL água
  const result = calculateDilution(10, 1000);
  assert.equal(result.productMl, 90.9);
  assert.equal(result.waterMl, 909.1);
  assert.equal(result.ratioLabel, '1:10');
  assert.ok(result.caution.includes('Nunca misturar'));
});

test('Hidráulica: Hazen-Williams retorna perda positiva e velocidade', () => {
  const result = calculateHazenWilliams(20, 15, 25, 'PVC');
  assert.ok(result.value > 0);
  assert.equal(result.unit, 'mca');
  assert.ok(result.limitWarning.includes('Velocidade'));
});

test('Hidráulica: diâmetro comercial mínimo para 20 L/min e 1,5 m/s', () => {
  const result = calculateRecommendedDiameter(20, 1.5);
  assert.equal(result.value, 20);
  assert.equal(result.unit, 'mm');
});

test('Elétrica: cabo e disjuntor para 3500 W / 220 V / FP 0,92 / 25 m', () => {
  const result = calculateCableSizing(3500, 220, 0.92, 25);
  assert.equal(result.currentA, 17.29);
  assert.equal(result.sectionMm2, 2.5);
  assert.equal(result.breakerA, 20);
  assert.ok(result.voltageDropPercent <= 4);
});
