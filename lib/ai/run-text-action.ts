import { APICallError, streamText, type LanguageModel } from 'ai';

import {
  AiProviderError,
  type AiTextActionProviderRequest,
  type AiTextActionProviderResult,
  type AiTextActionRunOptions,
} from './types';

const SYSTEM_PROMPT = 'You process selected text. Follow the user instruction exactly and return only the requested result.';

export async function runAiSdkTextAction(
  model: LanguageModel,
  modelId: string,
  request: AiTextActionProviderRequest,
  options: AiTextActionRunOptions = {},
): Promise<AiTextActionProviderResult> {
  try {
    let streamError: unknown;
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(request),
      abortSignal: options.abortSignal,
      onError: ({ error }) => {
        streamError ??= error;
      },
    });
    let resultText = '';

    for await (const part of result.stream) {
      if (part.type === 'error') {
        streamError ??= part.error;
        continue;
      }

      if (part.type === 'text-delta') {
        resultText += part.text;
        options.onTextDelta?.(part.text);
      }
    }

    if (streamError) {
      throw streamError;
    }

    resultText = resultText.trim();

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

    if (APICallError.isInstance(error)) {
      throw mapApiCallError(error);
    }

    const networkError = isNetworkError(error);
    throw new AiProviderError({
      code: networkError ? 'network' : 'provider',
      messageKey: networkError ? 'errorAiNetwork' : 'errorAiProviderFailed',
      providerMessage: getErrorMessage(error),
    });
  }
}

function mapApiCallError(error: APICallError): AiProviderError {
  if (error.statusCode === 401 || error.statusCode === 403) {
    return new AiProviderError({
      code: 'auth',
      messageKey: 'errorAiApiKeyRejected',
    });
  }

  if (error.statusCode === 429) {
    return new AiProviderError({
      code: 'quota',
      messageKey: 'errorAiQuota',
    });
  }

  return new AiProviderError({
    code: 'provider',
    messageKey: 'errorAiProviderFailed',
  });
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
