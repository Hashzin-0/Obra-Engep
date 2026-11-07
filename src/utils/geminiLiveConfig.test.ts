import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GEMINI_LIVE_MODEL,
  resolveGeminiLiveModel,
  toGeminiLiveModelResource,
} from './geminiLiveConfig';

test('Gemini Live usa Extended Thinking quando não há modelo configurado', () => {
  assert.equal(DEFAULT_GEMINI_LIVE_MODEL, 'gemini-3.8-live-extended-thinking');
  assert.equal(resolveGeminiLiveModel(undefined), DEFAULT_GEMINI_LIVE_MODEL);
  assert.equal(resolveGeminiLiveModel('  '), DEFAULT_GEMINI_LIVE_MODEL);
});

test('Gemini Live atualiza automaticamente IDs preview e o modelo padrão anterior', () => {
  for (const legacyModel of [
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'models/gemini-live-2.5-flash-preview',
    'gemini-3.1-flash-live-preview',
    'gemini-3.8-live',
  ]) {
    assert.equal(resolveGeminiLiveModel(legacyModel), 'gemini-3.8-live-extended-thinking');
  }
});

test('Gemini Live preserva o modelo Extended Thinking e normaliza o resource name', () => {
  assert.equal(
    resolveGeminiLiveModel('models/gemini-3.8-live-extended-thinking'),
    'gemini-3.8-live-extended-thinking'
  );
  assert.equal(
    toGeminiLiveModelResource('gemini-3.8-live-extended-thinking'),
    'models/gemini-3.8-live-extended-thinking'
  );
  assert.equal(
    toGeminiLiveModelResource('models/gemini-3.8-live-extended-thinking'),
    'models/gemini-3.8-live-extended-thinking'
  );
});
