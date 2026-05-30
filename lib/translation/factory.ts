import type { ProviderType, TranslationProviderConfig } from '@/lib/settings';

import { GoogleTranslationProvider } from './google';
import { TranslationProviderError, type ITranslationProvider } from './types';

type ProviderBuilder = (config: TranslationProviderConfig) => ITranslationProvider;

const PROVIDER_REGISTRY = {
  'google-v2': (config) => new GoogleTranslationProvider(config),
} satisfies Record<ProviderType, ProviderBuilder>;

export class TranslationProviderFactory {
  createProvider(config: TranslationProviderConfig): ITranslationProvider {
    const buildProvider = PROVIDER_REGISTRY[config.type];
    if (!buildProvider) {
      throw new TranslationProviderError({
        code: 'provider',
        messageKey: 'errorProviderUnavailable',
      });
    }

    return buildProvider(config);
  }
}
