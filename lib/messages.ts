import { TEXT_INPUT_MAX_LENGTH } from './text-limits';
import type { AlternativeSelection, TranslationAlternative } from './translation-alternatives';
import { ALTERNATIVE_TEXT_LIMIT, ALTERNATIVE_CONTEXT_LIMIT } from './translation-alternatives';
import type { AiModel } from './ai/types';
import type { AiProviderType, ExtensionSettings } from './settings';

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

export type TranslationAlternativesMessage = AlternativeSelection & { type: 'TRANSLATION_ALTERNATIVES' };
export type TranslationAlternativesResponse = {
  ok: true; alternatives: TranslationAlternative[]; providerName: string; model: string;
} | AiActionFailure;

export type ShowTranslationReaderMessage = {
  type: 'SHOW_TRANSLATION_READER';
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  response?: TranslationSuccess;
};

export type RuntimeMessage =
  | ShowTranslationReaderMessage
  | TranslationAlternativesMessage
  | ListAiModelsMessage
  | TranslateTextMessage
  | ShowContextTranslationMessage
  | RunSelectionActionMessage
  | GetSelectedTextMessage
  | RunAiActionMessage;

export type ListAiModelsMessage = {
  type: 'LIST_AI_MODELS';
  refresh?: boolean;
} & (
  | { providerType: AiProviderType }
  | { providerId: string }
  | { credentials: { type: AiProviderType; apiKey: string } }
);

export type ListAiModelsResponse = { ok: true; models: AiModel[] } | AiActionFailure;

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

export type AiActionFailure = {
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
  if (!isRecord(value)) return false;

  switch (value.type) {
    case 'SHOW_TRANSLATION_READER':
      return typeof value.text === 'string' && Boolean(value.text.trim()) && value.text.length <= TEXT_INPUT_MAX_LENGTH
        && typeof value.sourceLanguage === 'string' && typeof value.targetLanguage === 'string'
        && (value.response === undefined || (isRecord(value.response)
          && value.response.ok === true && typeof value.response.translatedText === 'string'
          && value.response.targetLanguage === value.targetLanguage
          && typeof value.response.fromCache === 'boolean'
          && isOptionalString(value.response.detectedSourceLanguage)));
    case 'GET_SELECTED_TEXT':
      return true;
    case 'SHOW_CONTEXT_TRANSLATION':
      return typeof value.text === 'string';
    case 'RUN_SELECTION_ACTION':
      return value.action === 'translate' || isAiAction(value.action);
    case 'TRANSLATE_TEXT':
      return typeof value.text === 'string'
        && isOptionalString(value.sourceLanguage)
        && isOptionalString(value.targetLanguage)
        && isOptionalString(value.providerId)
        && isOptionalBoolean(value.recordHistory);
    case 'TRANSLATION_ALTERNATIVES':
      return typeof value.text === 'string' && value.text.trim().length > 0
        && value.text.length <= ALTERNATIVE_TEXT_LIMIT
        && typeof value.context === 'string' && value.context.length <= ALTERNATIVE_CONTEXT_LIMIT
        && isOptionalString(value.language)
        && (value.language === undefined || (value.language as string).length <= 50);
    case 'RUN_AI_ACTION':
      return isAiAction(value.action)
        && typeof value.text === 'string'
        && isOptionalString(value.prompt)
        && isOptionalString(value.language)
        && isOptionalString(value.providerId)
        && isOptionalBoolean(value.recordHistory);
    case 'LIST_AI_MODELS': {
      if (!isOptionalBoolean(value.refresh)) return false;
      if ('providerType' in value) {
        return isAiProviderType(value.providerType) && !('providerId' in value) && !('credentials' in value);
      }
      if ('providerId' in value) {
        return typeof value.providerId === 'string' && !('credentials' in value);
      }
      const credentials = value.credentials;
      return isRecord(credentials)
        && typeof credentials.apiKey === 'string'
        && isAiProviderType(credentials.type);
    }
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAiProviderType(value: unknown): value is AiProviderType {
  return value === 'deepseek' || value === 'openrouter' || value === 'kimi';
}

function isAiAction(value: unknown): value is AiActionType {
  return value === 'rewrite' || value === 'explain';
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}
