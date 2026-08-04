import { addTranslationHistoryEntry } from '@/lib/history';
import { t } from '@/lib/i18n';
import type { TranslationErrorCode, TranslationResponse } from '@/lib/messages';
import { getDefaultProvider, getSettings, type ExtensionSettings, type TranslationProviderConfig } from '@/lib/settings';

import { CachedTranslationProvider } from './cached-provider';
import { TranslationProviderFactory } from './factory';
import { TranslationProviderError, type ITranslationProvider } from './types';

export type TranslationServiceRequest = {
  text: string;
  sourceLanguage?: ExtensionSettings['sourceLanguage'];
  targetLanguage?: ExtensionSettings['targetLanguage'];
  providerId?: string;
  recordHistory?: boolean;
};

export class TranslationService {
  constructor(private readonly providerFactory = new TranslationProviderFactory()) {}

  async translate(request: TranslationServiceRequest): Promise<TranslationResponse> {
    const settings = await getSettings();
    const text = request.text.trim();

    if (!text) {
      return failure('empty-text', t('errorSelectText', undefined, settings.appLanguage));
    }

    const providerConfigs = getRequestedProviders(settings, request.providerId);
    if (providerConfigs.length === 0) {
      return failure('missing-api-key', t('errorMissingApiKey', undefined, settings.appLanguage));
    }

    const sourceLanguage = request.sourceLanguage ?? settings.sourceLanguage;
    const targetLanguage = request.targetLanguage ?? settings.targetLanguage;
    let lastError: unknown;

    for (const providerConfig of providerConfigs) {
      try {
        const provider = createProvider(providerConfig, settings.cacheEnabled, this.providerFactory);
        const result = await provider.translate({
          text,
          sourceLanguage,
          targetLanguage,
        });

        const response = {
          ok: true as const,
          translatedText: result.translatedText,
          detectedSourceLanguage: result.detectedSourceLanguage,
          targetLanguage: result.targetLanguage,
          fromCache: result.fromCache === true,
        };

        if (request.recordHistory === true) {
          await recordTranslationHistory(text, sourceLanguage, response, providerConfig, settings);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (!settings.providerFallbackEnabled || request.providerId || !(error instanceof TranslationProviderError)) {
          break;
        }
      }
    }

    return providerFailure(lastError, settings);
  }
}

function getRequestedProviders(
  settings: ExtensionSettings,
  providerId: string | undefined,
): TranslationProviderConfig[] {
  if (providerId) {
    const provider = settings.providers.find((candidate) => candidate.id === providerId);
    return provider ? [provider] : [];
  }

  const defaultProvider = getDefaultProvider(settings);
  if (!defaultProvider) {
    return [];
  }

  return [
    defaultProvider,
    ...settings.providers.filter((provider) => provider.id !== defaultProvider.id),
  ];
}

function createProvider(
  config: TranslationProviderConfig,
  cacheEnabled: boolean,
  providerFactory: TranslationProviderFactory,
): ITranslationProvider {
  const provider = providerFactory.createProvider(config);

  if (!cacheEnabled) {
    return provider;
  }

  return new CachedTranslationProvider(provider, config.id);
}

async function recordTranslationHistory(
  originalText: string,
  sourceLanguage: string,
  response: Extract<TranslationResponse, { ok: true }>,
  provider: TranslationProviderConfig,
  settings: ExtensionSettings,
): Promise<void> {
  if (!settings.historyEnabled || settings.historyLimit <= 0) {
    return;
  }

  try {
    await addTranslationHistoryEntry({
      originalText,
      translatedText: response.translatedText,
      sourceLanguage,
      detectedSourceLanguage: response.detectedSourceLanguage,
      targetLanguage: response.targetLanguage,
      provider: provider.type,
      providerName: provider.name,
    }, settings.historyLimit);
  } catch {
    // Translation should still succeed if local history storage is unavailable.
  }
}

function providerFailure(error: unknown, settings: ExtensionSettings): TranslationResponse {
  if (error instanceof TranslationProviderError) {
    return failure(
      error.code,
      error.providerMessage ?? t(error.messageKey, undefined, settings.appLanguage),
    );
  }

  return failure('unknown', t('errorProviderFailed', undefined, settings.appLanguage));
}

function failure(code: TranslationErrorCode, message: string): TranslationResponse {
  return {
    ok: false,
    error: { code, message },
  };
}
