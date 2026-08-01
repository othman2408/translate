import { generateText, type LanguageModel } from 'ai';

import { AiProviderError, type AiTextActionProviderRequest, type AiTextActionProviderResult } from './types';

const SYSTEM_PROMPT = 'You process selected text. Follow the user instruction exactly and return only the requested result.';

export async function runAiSdkTextAction(
  model: LanguageModel,
  modelId: string,
  request: AiTextActionProviderRequest,
): Promise<AiTextActionProviderResult> {
  try {
    const result = await generateText({
      model,
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

    return { resultText, model: modelId };
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    const networkError = isNetworkError(error);
    throw new AiProviderError({
      code: networkError ? 'network' : 'provider',
      messageKey: networkError ? 'errorAiNetwork' : 'errorAiProviderFailed',
      providerMessage: getErrorMessage(error),
    });
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
  return error instanceof Error && error.message ? error.message : undefined;
}
