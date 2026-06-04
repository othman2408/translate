import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

import { DEFAULT_AI_MODEL, type AiProviderConfig } from '@/lib/settings';

import { AiProviderError, type IAiProvider, type AiTextActionProviderRequest, type AiTextActionProviderResult } from './types';

const SYSTEM_PROMPT = 'You process selected text. Follow the user instruction exactly and return only the requested result.';

export class DeepSeekAiProvider implements IAiProvider {
  readonly providerType = 'deepseek' as const;
  readonly providerName: string;

  constructor(private readonly config: AiProviderConfig) {
    this.providerName = config.name;
  }

  async runTextAction(request: AiTextActionProviderRequest): Promise<AiTextActionProviderResult> {
    try {
      const deepseek = createDeepSeek({ apiKey: this.config.apiKey });
      const model = this.config.model || DEFAULT_AI_MODEL;
      const result = await generateText({
        model: deepseek(model),
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(request),
      });
      const resultText = result.text.trim();

      if (!resultText) {
        throw new AiProviderError({
          code: 'provider',
          messageKey: 'errorAiEmptyResponse',
        });
      }

      return {
        resultText,
        model,
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError({
        code: isNetworkError(error) ? 'network' : 'provider',
        messageKey: isNetworkError(error) ? 'errorAiNetwork' : 'errorAiProviderFailed',
        providerMessage: getErrorMessage(error),
      });
    }
  }
}

function buildPrompt(request: AiTextActionProviderRequest): string {
  const languageInstruction = request.language
    ? `\n\nOutput language: ${request.language}`
    : '';

  return `${request.prompt.trim()}${languageInstruction}\n\nSelected text:\n${request.text}`;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (getErrorMessage(error) ?? '').toLowerCase().includes('fetch');
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return undefined;
}
