import type { ExtensionSettings } from './settings';

export type TranslationErrorCode =
  | 'missing-api-key'
  | 'empty-text'
  | 'auth'
  | 'quota'
  | 'network'
  | 'provider'
  | 'unknown';

export type AiActionType = 'rewrite' | 'explain';

export type AiActionErrorCode =
  | 'disabled'
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
  providerId?: string;
  recordHistory?: boolean;
};

export type ShowContextTranslationMessage = {
  type: 'SHOW_CONTEXT_TRANSLATION';
  text: string;
};

export type RunSelectionActionMessage = {
  type: 'RUN_SELECTION_ACTION';
  action: 'translate' | AiActionType;
};

type GetSelectedTextMessage = {
  type: 'GET_SELECTED_TEXT';
};

export type GetSelectedTextResponse = {
  ok: true;
  text: string;
} | {
  ok: false;
};

export type RunAiActionMessage = {
  type: 'RUN_AI_ACTION';
  action: AiActionType;
  text: string;
  prompt?: string;
  providerId?: string;
  language?: string;
  recordHistory?: boolean;
};

export type RuntimeMessage =
  | TranslateTextMessage
  | ShowContextTranslationMessage
  | RunSelectionActionMessage
  | GetSelectedTextMessage
  | RunAiActionMessage;

export type TranslationSuccess = {
  ok: true;
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  fromCache: boolean;
};

type TranslationFailure = {
  ok: false;
  error: {
    code: TranslationErrorCode;
    message: string;
  };
};

export type TranslationResponse = TranslationSuccess | TranslationFailure;

export type AiActionSuccess = {
  ok: true;
  action: AiActionType;
  resultText: string;
  providerName: string;
  model: string;
  language?: string;
  fromCache?: boolean;
};

type AiActionFailure = {
  ok: false;
  error: {
    code: AiActionErrorCode;
    message: string;
  };
};

export type AiActionResponse = AiActionSuccess | AiActionFailure;

export const AI_ACTION_STREAM_PORT = 'ai-action-stream';

export type AiActionStreamEvent =
  | { type: 'AI_ACTION_DELTA'; textDelta: string }
  | { type: 'AI_ACTION_COMPLETE'; response: AiActionResponse };

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (
      value.type === 'TRANSLATE_TEXT' ||
      value.type === 'SHOW_CONTEXT_TRANSLATION' ||
      value.type === 'RUN_SELECTION_ACTION' ||
      value.type === 'GET_SELECTED_TEXT' ||
      value.type === 'RUN_AI_ACTION'
    )
  );
}
