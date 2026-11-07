import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GEMINI_LIVE_MODEL,
  resolveGeminiLiveModel,
  toGeminiLiveModelResource,
} from './geminiLiveConfig';

test('Gemini Live usa 3.8 quando não há modelo configurado', () => {
  assert.equal(resolveGeminiLiveModel(undefined), DEFAULT_GEMINI_LIVE_MODEL);
  assert.equal(resolveGeminiLiveModel('  '), DEFAULT_GEMINI_LIVE_MODEL);
});

test('Gemini Live atualiza automaticamente os IDs preview legados', () => {
  assert.equal(
    resolveGeminiLiveModel('gemini-2.5-flash-native-audio-preview-12-2025'),
    'gemini-3.8-live'
  );
  assert.equal(
    resolveGeminiLiveModel('models/gemini-live-2.5-flash-preview'),
    'gemini-3.8-live'
  );
});

test('Gemini Live preserva IDs atuais e normaliza o resource name', () => {
  assert.equal(resolveGeminiLiveModel('gemini-3.8-live-extended-thinking'), 'gemini-3.8-live-extended-thinking');
  assert.equal(toGeminiLiveModelResource('gemini-3.8-live'), 'models/gemini-3.8-live');
  assert.equal(toGeminiLiveModelResource('models/gemini-3.8-live'), 'models/gemini-3.8-live');
});
