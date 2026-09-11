import { createMoonshotAI } from '@ai-sdk/moonshotai';

import type { AiProviderConfig } from '@/lib/settings';
import { fetchModels } from './list-models';

import { runAiSdkTextAction } from './run-text-action';
import type {
  IAiProvider,
  AiTextActionProviderRequest,
  AiTextActionProviderResult,
  AiTextActionRunOptions,
} from './types';

export class KimiAiProvider implements IAiProvider {
  readonly providerType = 'kimi' as const;
  readonly providerName: string;

  constructor(private readonly config: AiProviderConfig) {
    this.providerName = config.name;
  }

  listModels() {
    return fetchModels('https://api.moonshot.ai/v1/models', this.config.apiKey);
  }

  runTextAction(
    request: AiTextActionProviderRequest,
    options?: AiTextActionRunOptions,
  ): Promise<AiTextActionProviderResult> {
    const model = this.config.model;
    const moonshot = createMoonshotAI({ apiKey: this.config.apiKey });
    return runAiSdkTextAction(moonshot(model), model, request, options);
  }
}
