import { createMoonshotAI } from '@ai-sdk/moonshotai';

import { getDefaultAiModel, type AiProviderConfig } from '@/lib/settings';

import { runAiSdkTextAction } from './run-text-action';
import type { IAiProvider, AiTextActionProviderRequest, AiTextActionProviderResult } from './types';

export class KimiAiProvider implements IAiProvider {
  readonly providerType = 'kimi' as const;
  readonly providerName: string;

  constructor(private readonly config: AiProviderConfig) {
    this.providerName = config.name;
  }

  runTextAction(request: AiTextActionProviderRequest): Promise<AiTextActionProviderResult> {
    const model = this.config.model || getDefaultAiModel(this.providerType);
    const moonshot = createMoonshotAI({ apiKey: this.config.apiKey });
    return runAiSdkTextAction(moonshot(model), model, request);
  }
}
