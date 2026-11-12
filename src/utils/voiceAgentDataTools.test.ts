import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeLikePattern, normalizeToolLimit } from './voiceAgentDataTools';

test('normaliza limites ausentes, inválidos e fora da faixa permitida', () => {
  assert.equal(normalizeToolLimit(undefined, 10, 20), 10);
  assert.equal(normalizeToolLimit(Number.NaN, 10, 20), 10);
  assert.equal(normalizeToolLimit(0, 10, 20), 1);
  assert.equal(normalizeToolLimit(-5, 10, 20), 1);
  assert.equal(normalizeToolLimit(99, 10, 20), 20);
  assert.equal(normalizeToolLimit(4.9, 10, 20), 4);
});

test('escapa curingas de pesquisa textual antes de montar o filtro ilike', () => {
  assert.equal(escapeLikePattern('NBR 5410'), 'NBR 5410');
  assert.equal(escapeLikePattern('100%_obra\\teste'), '100\\%\\_obra\\\\teste');
});
