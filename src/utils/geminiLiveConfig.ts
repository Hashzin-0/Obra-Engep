export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.8-live';

const LEGACY_GEMINI_LIVE_MODELS = new Set([
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-live-2.5-flash-preview',
  'gemini-2.0-flash-live-001',
  'gemini-3.1-flash-live-preview',
]);

/**
 * Resolve model IDs from Vercel/local configuration.
 * Legacy preview IDs are upgraded to the supported Gemini 3.8 Live model.
 */
export function resolveGeminiLiveModel(configuredModel?: string | null): string {
  const model = configuredModel?.trim().replace(/^models\//i, '');
  if (!model || LEGACY_GEMINI_LIVE_MODELS.has(model)) {
    return DEFAULT_GEMINI_LIVE_MODEL;
  }
  return model;
}

export function toGeminiLiveModelResource(model: string): string {
  const normalized = model.trim().replace(/^models\//i, '');
  if (!normalized) throw new Error('Gemini Live model is required.');
  return `models/${normalized}`;
}
