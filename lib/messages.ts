import type { ExtensionSettings } from './settings';

export type TranslationErrorCode =
  | 'missing-api-key'
  | 'empty-text'
  | 'auth'
  | 'quota'
  | 'network'
  | 'provider'
  | 'unknown';

export type TranslateTextMessage = {
  type: 'TRANSLATE_TEXT';
  text: string;
  sourceLanguage?: ExtensionSettings['sourceLanguage'];
  targetLanguage?: ExtensionSettings['targetLanguage'];
};

export type ShowContextTranslationMessage = {
  type: 'SHOW_CONTEXT_TRANSLATION';
  text: string;
};

export type RuntimeMessage = TranslateTextMessage | ShowContextTranslationMessage;

export type TranslationSuccess = {
  ok: true;
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  fromCache: boolean;
};

export type TranslationFailure = {
  ok: false;
  error: {
    code: TranslationErrorCode;
    message: string;
  };
};

export type TranslationResponse = TranslationSuccess | TranslationFailure;

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'TRANSLATE_TEXT' || value.type === 'SHOW_CONTEXT_TRANSLATION')
  );
}
