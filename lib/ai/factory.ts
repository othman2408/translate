import type { AiProviderConfig, AiProviderType } from '@/lib/settings';

import { DeepSeekAiProvider } from './deepseek';
import { KimiAiProvider } from './kimi';
import { OpenRouterAiProvider } from './openrouter';
import { AiProviderError, type IAiProvider } from './types';

type AiProviderBuilder = (config: AiProviderConfig) => IAiProvider;

const AI_PROVIDER_REGISTRY = {
  deepseek: (config) => new DeepSeekAiProvider(config),
  openrouter: (config) => new OpenRouterAiProvider(config),
  kimi: (config) => new KimiAiProvider(config),
} satisfies Record<AiProviderType, AiProviderBuilder>;

export class AiProviderFactory {
  createProvider(config: AiProviderConfig): IAiProvider {
    const buildProvider = AI_PROVIDER_REGISTRY[config.type];
    if (!buildProvider) {
      throw new AiProviderError({
        code: 'provider',
        messageKey: 'errorAiProviderUnavailable',
      });
    }

    return buildProvider(config);
  }
}
