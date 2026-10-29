import test from 'node:test';
import assert from 'node:assert/strict';
import { contractCategories, contractModels } from '../data/contractsCatalog';

test('catalog contains a broad set of distinct contract models', () => {
  assert.ok(contractModels.length >= 36);
  const ids = contractModels.map((model) => model.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(contractCategories.some((category) => category.id === 'trabalhista'));
  assert.ok(contractCategories.some((category) => category.id === 'rural'));
});

test('every model has legal basis, parties, required data and application warnings', () => {
  for (const model of contractModels) {
    assert.ok(model.title.trim(), `title missing for ${model.id}`);
    assert.ok(model.regime.trim(), `regime missing for ${model.id}`);
    assert.ok(model.parties.length >= 2, `parties missing for ${model.id}`);
    assert.ok(model.sources.length >= 1, `legal sources missing for ${model.id}`);
    assert.ok(model.sources.every((source) => source.url.startsWith('https://') && source.articles.trim()), `invalid source for ${model.id}`);
    assert.ok(model.fields.some((field) => field.required), `required fields missing for ${model.id}`);
    assert.ok(model.clauses.length >= 1, `clauses missing for ${model.id}`);
    assert.ok(model.warnings.length >= 1, `application warnings missing for ${model.id}`);
    const fieldKeys = model.fields.map((field) => field.key);
    assert.equal(new Set(fieldKeys).size, fieldKeys.length, `duplicate field key for ${model.id}`);
  }
});

test('special regimes are represented separately instead of being mislabeled as ordinary CLT', () => {
  const byId = new Map(contractModels.map((model) => [model.id, model]));
  assert.match(byId.get('estagio')?.regime ?? '', /não é contrato CLT/i);
  assert.match(byId.get('autonomo')?.regime ?? '', /risco de requalificação trabalhista/i);
  assert.match(byId.get('clt-intermitente')?.sources.map((source) => source.articles).join(' ' ) ?? '', /452-A/);
  assert.match(byId.get('clt-aprendizagem')?.sources.map((source) => source.articles).join(' ') ?? '', /428 a 433/);
  assert.match(byId.get('clt-safra')?.sources.map((source) => source.articles).join(' ') ?? '', /art\. 14/);
});
