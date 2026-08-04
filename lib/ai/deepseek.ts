import { createDeepSeek } from '@ai-sdk/deepseek';

import { getDefaultAiModel, type AiProviderConfig } from '@/lib/settings';

import { runAiSdkTextAction } from './run-text-action';
import type {
  IAiProvider,
  AiTextActionProviderRequest,
  AiTextActionProviderResult,
  AiTextActionRunOptions,
} from './types';

export class DeepSeekAiProvider implements IAiProvider {
  readonly providerType = 'deepseek' as const;
  readonly providerName: string;

  constructor(private readonly config: AiProviderConfig) {
    this.providerName = config.name;
  }

  runTextAction(
    request: AiTextActionProviderRequest,
    options?: AiTextActionRunOptions,
  ): Promise<AiTextActionProviderResult> {
    const model = this.config.model || getDefaultAiModel(this.providerType);
    const deepseek = createDeepSeek({ apiKey: this.config.apiKey });
    return runAiSdkTextAction(deepseek(model), model, request, options);
  }
}
