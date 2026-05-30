import { LANGUAGE_OPTIONS } from '@/lib/languages';
import type { TranslationProviderConfig } from '@/lib/settings';

import {
  TranslationProviderError,
  type ITranslationProvider,
  type TranslationProviderRequest,
  type TranslationProviderResult,
} from './types';

const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_SUPPORTED_LANGUAGES = LANGUAGE_OPTIONS.map((language) => language.code);

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
  };
};

export class GoogleTranslationProvider implements ITranslationProvider {
  readonly providerType = 'google-v2' as const;
  readonly providerName: string;
  readonly supportedLanguages = GOOGLE_SUPPORTED_LANGUAGES;

  constructor(private readonly config: TranslationProviderConfig) {
    this.providerName = config.name;
  }

  async translate(request: TranslationProviderRequest): Promise<TranslationProviderResult> {
    const apiKey = this.config.apiKey.trim();
    if (!apiKey) {
      throw new TranslationProviderError({
        code: 'missing-api-key',
        messageKey: 'errorMissingApiKey',
      });
    }

    const params = new URLSearchParams({
      q: request.text,
      target: request.targetLanguage,
      format: 'text',
    });

    if (request.sourceLanguage !== 'auto') {
      params.set('source', request.sourceLanguage);
    }

    let response: Response;
    try {
      response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: params.toString(),
      });
    } catch {
      throw new TranslationProviderError({
        code: 'network',
        messageKey: 'errorNetwork',
      });
    }

    const payload = (await response.json().catch(() => ({}))) as GoogleTranslateResponse;
    if (!response.ok) {
      throw getGoogleError(response, payload);
    }

    const translation = payload.data?.translations?.[0];
    if (!translation?.translatedText) {
      throw new TranslationProviderError({
        code: 'provider',
        messageKey: 'errorEmptyProviderResponse',
      });
    }

    return {
      translatedText: decodeHtmlEntities(translation.translatedText),
      detectedSourceLanguage: translation.detectedSourceLanguage,
      targetLanguage: request.targetLanguage,
      fromCache: false,
    };
  }
}

function getGoogleError(response: Response, payload: GoogleTranslateResponse): TranslationProviderError {
  if (response.status === 401 || response.status === 403) {
    return new TranslationProviderError({
      code: 'auth',
      messageKey: 'errorApiKeyRejected',
      providerMessage: payload.error?.message,
    });
  }

  if (response.status === 429) {
    return new TranslationProviderError({
      code: 'quota',
      messageKey: 'errorQuota',
      providerMessage: payload.error?.message,
    });
  }

  return new TranslationProviderError({
    code: 'provider',
    messageKey: 'errorGoogleProvider',
    providerMessage: payload.error?.message,
  });
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity.toLowerCase()] ?? match;
  });
}
