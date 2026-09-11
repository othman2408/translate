import { expect, test } from 'bun:test';
import { isRuntimeMessage } from '../lib/messages';

test('runtime messages accept all supported actions and optional fields', () => {
  for (const message of [
    { type: 'GET_SELECTED_TEXT' },
    { type: 'SHOW_CONTEXT_TRANSLATION', text: 'Hello' },
    { type: 'RUN_SELECTION_ACTION', action: 'translate' },
    { type: 'RUN_SELECTION_ACTION', action: 'rewrite' },
    { type: 'RUN_SELECTION_ACTION', action: 'explain' },
    { type: 'TRANSLATE_TEXT', text: '' },
    { type: 'TRANSLATE_TEXT', text: 'Hello', sourceLanguage: 'auto', targetLanguage: 'ar', providerId: 'google', recordHistory: true },
    { type: 'RUN_AI_ACTION', action: 'rewrite', text: 'Hello', prompt: 'Rewrite', language: 'en', providerId: 'ai', recordHistory: false },
    { type: 'RUN_AI_ACTION', action: 'explain', text: 'Hello' },
    { type: 'LIST_AI_MODELS', providerId: 'saved', refresh: true },
    ...['deepseek', 'openrouter', 'kimi'].map(providerType => ({ type: 'LIST_AI_MODELS', providerType })),
    ...['deepseek', 'openrouter', 'kimi'].map(type => ({ type: 'LIST_AI_MODELS', credentials: { type, apiKey: 'key' } })),
  ]) expect(isRuntimeMessage(message)).toBe(true);
});

test('runtime messages reject malformed payloads before service dispatch', () => {
  for (const message of [
    null, undefined, [], 'TRANSLATE_TEXT', {}, { type: 'UNKNOWN' },
    { type: 'TRANSLATE_TEXT' },
    { type: 'TRANSLATE_TEXT', text: 123 },
    { type: 'TRANSLATE_TEXT', text: 'Hello', sourceLanguage: null },
    { type: 'TRANSLATE_TEXT', text: 'Hello', targetLanguage: [] },
    { type: 'TRANSLATE_TEXT', text: 'Hello', providerId: 1 },
    { type: 'TRANSLATE_TEXT', text: 'Hello', recordHistory: 'true' },
    { type: 'SHOW_CONTEXT_TRANSLATION', text: {} },
    { type: 'RUN_SELECTION_ACTION', action: 'other' },
    { type: 'RUN_AI_ACTION', action: 'translate', text: 'Hello' },
    { type: 'RUN_AI_ACTION', action: 'rewrite', text: 'Hello', prompt: {} },
    { type: 'RUN_AI_ACTION', action: 'explain' },
    { type: 'LIST_AI_MODELS' },
    { type: 'LIST_AI_MODELS', providerType: 'unknown' },
    { type: 'LIST_AI_MODELS', providerType: 'deepseek', providerId: 'saved' },
    { type: 'LIST_AI_MODELS', providerType: 'deepseek', credentials: { type: 'deepseek', apiKey: 'secret' } },
    { type: 'LIST_AI_MODELS', credentials: null },
    { type: 'LIST_AI_MODELS', credentials: { type: 'unknown', apiKey: 'key' } },
    { type: 'LIST_AI_MODELS', credentials: { type: 'kimi', apiKey: [] } },
    { type: 'LIST_AI_MODELS', providerId: 'saved', refresh: 'true' },
    { type: 'LIST_AI_MODELS', providerId: 'saved', credentials: { type: 'kimi', apiKey: 'key' } },
  ]) expect(isRuntimeMessage(message)).toBe(false);
});
