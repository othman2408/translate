import { createDeepSeek } from '@ai-sdk/deepseek';

import type { AiProviderConfig } from '@/lib/settings';
import { fetchModels } from './list-models';

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

  listModels() {
    return fetchModels('https://api.deepseek.com/models', this.config.apiKey);
  }

  runTextAction(
    request: AiTextActionProviderRequest,
    options?: AiTextActionRunOptions,
  ): Promise<AiTextActionProviderResult> {
    const model = this.config.model;
    const deepseek = createDeepSeek({ apiKey: this.config.apiKey });
    return runAiSdkTextAction(deepseek(model), model, request, options);
  }
}
