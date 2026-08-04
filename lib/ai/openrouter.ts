import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { getDefaultAiModel, type AiProviderConfig } from '@/lib/settings';

import { runAiSdkTextAction } from './run-text-action';
import type {
  IAiProvider,
  AiTextActionProviderRequest,
  AiTextActionProviderResult,
  AiTextActionRunOptions,
} from './types';

export class OpenRouterAiProvider implements IAiProvider {
  readonly providerType = 'openrouter' as const;
  readonly providerName: string;

  constructor(private readonly config: AiProviderConfig) {
    this.providerName = config.name;
  }

  runTextAction(
    request: AiTextActionProviderRequest,
    options?: AiTextActionRunOptions,
  ): Promise<AiTextActionProviderResult> {
    const model = this.config.model || getDefaultAiModel(this.providerType);
    const openrouter = createOpenRouter({
      apiKey: this.config.apiKey,
      appName: 'Translate Bubble',
    });
    return runAiSdkTextAction(openrouter(model), model, request, options);
  }
}
