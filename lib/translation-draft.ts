import type { ExtensionSettings } from './settings';
import { TEXT_INPUT_MAX_LENGTH } from './text-limits';
import type { TranslationResponse } from './messages';

export type TranslationSide = 'source' | 'target';
export type TranslationDraft = {
  texts: { source: string; target: string };
  edit: { side: TranslationSide; text: string };
  response: TranslationResponse | null;
  requestKey: string;
};

export function parseTranslationDraft(value: unknown): TranslationDraft | undefined {
  if (!value || typeof value !== 'object') return;
  const draft = value as Partial<TranslationDraft>;
  if (!draft.texts || !draft.edit || typeof draft.texts.source !== 'string'
    || typeof draft.texts.target !== 'string' || typeof draft.edit.text !== 'string'
    || !['source', 'target'].includes(draft.edit.side) || typeof draft.requestKey !== 'string'
    || draft.edit.text.length > TEXT_INPUT_MAX_LENGTH
    || draft.texts[draft.edit.side] !== draft.edit.text) return;
  const result = draft.response;
  // Only carry completed successes; pending and failed requests can retry.
  const response = result?.ok === true && typeof result.translatedText === 'string'
    && typeof result.targetLanguage === 'string' && typeof result.fromCache === 'boolean'
    && (result.detectedSourceLanguage === undefined || typeof result.detectedSourceLanguage === 'string')
    ? result : null;
  return { texts: draft.texts, edit: draft.edit, response, requestKey: draft.requestKey };
}

export function getManualLanguages(side: TranslationSide, settings: ExtensionSettings) {
  return side === 'source'
    ? { sourceLanguage: settings.sourceLanguage, targetLanguage: settings.targetLanguage }
    : {
        sourceLanguage: settings.targetLanguage,
        targetLanguage: settings.sourceLanguage === 'auto' ? settings.preferredLanguage : settings.sourceLanguage,
      };
}

// The handoff needs a request identity, not provider secrets.
export function getManualRequestKey(edit: TranslationDraft['edit'], settings: ExtensionSettings): string {
  return JSON.stringify([edit, getManualLanguages(edit.side, settings), settings.defaultProviderId,
    settings.providers.map(({ id, type }) => ({ id, type })), settings.providerFallbackEnabled]);
}
