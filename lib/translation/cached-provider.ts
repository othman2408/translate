import { getCacheKey, getCachedTranslation, setCachedTranslation } from '@/lib/cache';

import type {
  ITranslationProvider,
  TranslationProviderRequest,
  TranslationProviderResult,
} from './types';

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
    const cacheKey = getCacheKey({
      providerId: this.providerId,
      providerType: this.providerType,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      text: request.text,
    });
    const cached = await getCachedTranslation(cacheKey);

    if (cached) {
      return {
        translatedText: cached.translatedText,
        detectedSourceLanguage: cached.detectedSourceLanguage,
        targetLanguage: cached.targetLanguage,
        fromCache: true,
      };
    }

    const result = await this.provider.translate(request);
    await setCachedTranslation(cacheKey, {
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      targetLanguage: result.targetLanguage,
    });

    return {
      ...result,
      fromCache: false,
    };
  }
}
