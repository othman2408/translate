import { getCachedTranslation, getTranslationCacheKey, setCachedTranslation } from '@/lib/cache';

import type {
  ITranslationProvider,
  TranslationProviderRequest,
  TranslationProviderResult,
} from './types';

const inFlightTranslations = new Map<string, Promise<TranslationProviderResult>>();

export class CachedTranslationProvider implements ITranslationProvider {
  readonly providerType: ITranslationProvider['providerType'];
  readonly providerName: string;
  readonly supportedLanguages: readonly string[];

  constructor(
    private readonly provider: ITranslationProvider,
    private readonly providerId: string,
  ) {
    this.providerType = provider.providerType;
    this.providerName = provider.providerName;
    this.supportedLanguages = provider.supportedLanguages;
  }

  async translate(request: TranslationProviderRequest): Promise<TranslationProviderResult> {
    const cacheKey = getTranslationCacheKey({
      providerId: this.providerId,
      providerType: this.providerType,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      text: request.text,
    });
    const cached = await getCachedTranslationSafely(cacheKey);

    if (cached) {
      return {
        translatedText: cached.translatedText,
        detectedSourceLanguage: cached.detectedSourceLanguage,
        targetLanguage: cached.targetLanguage,
        fromCache: true,
      };
    }

    const existingRequest = inFlightTranslations.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    const nextRequest = this.provider.translate(request)
      .then(async (result) => {
        await setCachedTranslationSafely(cacheKey, {
          providerId: this.providerId,
          providerType: this.providerType,
          sourceLanguage: request.sourceLanguage,
          sourceText: request.text,
          translatedText: result.translatedText,
          detectedSourceLanguage: result.detectedSourceLanguage,
          targetLanguage: result.targetLanguage,
        });

        return {
          ...result,
          fromCache: false,
        };
      })
      .finally(() => {
        inFlightTranslations.delete(cacheKey);
      });

    inFlightTranslations.set(cacheKey, nextRequest);
    return nextRequest;
  }
}

async function getCachedTranslationSafely(cacheKey: string) {
  try {
    return await getCachedTranslation(cacheKey);
  } catch {
    return undefined;
  }
}

async function setCachedTranslationSafely(
  cacheKey: string,
  entry: Parameters<typeof setCachedTranslation>[1],
): Promise<void> {
  try {
    await setCachedTranslation(cacheKey, entry);
  } catch {
    // A cache write failure should not fail a successful provider response.
  }
}
