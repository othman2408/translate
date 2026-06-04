import { getAiActionCacheKey, getCachedAiAction, setCachedAiAction } from '@/lib/cache';
import { addAiHistoryEntry } from '@/lib/history';
import { t } from '@/lib/i18n';
import type { AiActionErrorCode, AiActionResponse, AiActionSuccess, AiActionType } from '@/lib/messages';
import {
  DEFAULT_AI_EXPLAIN_PROMPT,
  DEFAULT_AI_REWRITE_PROMPT,
  getDefaultAiProvider,
  getSettings,
  type AiProviderConfig,
  type ExtensionSettings,
} from '@/lib/settings';

import { AiProviderFactory } from './factory';
import type { AiTextActionProviderResult, IAiProvider } from './types';
import { AiProviderError } from './types';

export type AiTextActionServiceRequest = {
  action: AiActionType;
  text: string;
  prompt?: string;
  providerId?: string;
  language?: string;
  recordHistory?: boolean;
};

type AiTextActionResult = AiTextActionProviderResult & { fromCache?: boolean };

const inFlightAiActions = new Map<string, Promise<AiTextActionProviderResult>>();

export class AiTextActionService {
  constructor(private readonly providerFactory = new AiProviderFactory()) {}

  async run(request: AiTextActionServiceRequest): Promise<AiActionResponse> {
    const settings = await getSettings();
    const text = request.text.trim();

    if (!settings.aiEnabled) {
      return failure('disabled', t('errorAiDisabled', undefined, settings.appLanguage));
    }

    if (!text) {
      return failure('empty-text', t('errorSelectText', undefined, settings.appLanguage));
    }

    const providerConfig = getRequestedAiProvider(settings, request.providerId);
    if (!providerConfig) {
      return failure('missing-api-key', t('errorAiMissingApiKey', undefined, settings.appLanguage));
    }

    try {
      const provider = this.providerFactory.createProvider(providerConfig);
      const language = getActionLanguage(request, settings);
      const prompt = getActionPrompt(request, settings);
      const result: AiTextActionResult = settings.cacheEnabled
        ? await runCachedAiAction(request.action, text, prompt, language, providerConfig, provider)
        : {
          ...await provider.runTextAction({
            action: request.action,
            text,
            prompt,
            language,
          }),
          fromCache: false,
        };

      const response: AiActionSuccess = {
        ok: true,
        action: request.action,
        resultText: result.resultText,
        providerName: provider.providerName,
        model: result.model,
        language,
        fromCache: result.fromCache,
      };

      if (request.recordHistory !== false && settings.aiHistoryEnabled && settings.aiHistoryLimit > 0) {
        await recordAiHistory(request.action, text, response.resultText, providerConfig, response.model, settings, language);
      }

      return response;
    } catch (error) {
      return providerFailure(error, settings);
    }
  }
}

async function runCachedAiAction(
  action: AiActionType,
  text: string,
  prompt: string,
  language: string | undefined,
  providerConfig: AiProviderConfig,
  provider: IAiProvider,
): Promise<AiTextActionProviderResult & { fromCache?: boolean }> {
  const cacheKey = getAiActionCacheKey({
    providerId: providerConfig.id,
    providerType: providerConfig.type,
    model: providerConfig.model,
    action,
    language: language ?? '',
    prompt,
    text,
  });
  const cached = await getCachedAiActionSafely(cacheKey);

  if (cached) {
    return {
      resultText: cached.resultText,
      model: cached.model,
      fromCache: true,
    };
  }

  const existingRequest = inFlightAiActions.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = provider.runTextAction({ action, text, prompt, language })
    .then(async (result) => {
      await setCachedAiActionSafely(cacheKey, {
        action,
        providerId: providerConfig.id,
        providerName: providerConfig.name,
        providerType: providerConfig.type,
        prompt,
        sourceText: text,
        resultText: result.resultText,
        model: result.model,
        language,
      });

      return {
        ...result,
        fromCache: false,
      };
    })
    .finally(() => {
      inFlightAiActions.delete(cacheKey);
    });

  inFlightAiActions.set(cacheKey, nextRequest);
  return nextRequest;
}

async function getCachedAiActionSafely(cacheKey: string) {
  try {
    return await getCachedAiAction(cacheKey);
  } catch {
    return undefined;
  }
}

async function setCachedAiActionSafely(
  cacheKey: string,
  entry: Parameters<typeof setCachedAiAction>[1],
): Promise<void> {
  try {
    await setCachedAiAction(cacheKey, entry);
  } catch {
    // A cache write failure should not fail a successful provider response.
  }
}

async function recordAiHistory(
  action: AiActionType,
  originalText: string,
  resultText: string,
  provider: AiProviderConfig,
  model: string,
  settings: ExtensionSettings,
  language: string | undefined,
): Promise<void> {
  try {
    await addAiHistoryEntry({
      action,
      originalText,
      resultText,
      provider: provider.type,
      providerName: provider.name,
      model,
      language,
    }, settings.aiHistoryLimit);
  } catch {
    // AI actions should still succeed if local history storage is unavailable.
  }
}

function getRequestedAiProvider(
  settings: ExtensionSettings,
  providerId: string | undefined,
): AiProviderConfig | undefined {
  if (providerId) {
    return settings.aiProviders.find((provider) => provider.id === providerId);
  }

  return getDefaultAiProvider(settings);
}

function getActionPrompt(request: AiTextActionServiceRequest, settings: ExtensionSettings): string {
  if (request.prompt?.trim()) {
    return request.prompt.trim();
  }

  return request.action === 'explain'
    ? settings.aiExplainPrompt || DEFAULT_AI_EXPLAIN_PROMPT
    : settings.aiRewritePrompt || DEFAULT_AI_REWRITE_PROMPT;
}

function getActionLanguage(
  request: AiTextActionServiceRequest,
  settings: ExtensionSettings,
): string | undefined {
  if (request.action === 'rewrite') {
    return request.language?.trim() || settings.aiRewriteLanguage || settings.targetLanguage;
  }

  return request.language?.trim() || settings.aiExplanationLanguage || settings.targetLanguage;
}

function providerFailure(error: unknown, settings: ExtensionSettings): AiActionResponse {
  if (error instanceof AiProviderError) {
    return failure(
      error.code,
      error.providerMessage ?? t(error.messageKey, undefined, settings.appLanguage),
    );
  }

  return failure('unknown', t('errorAiProviderFailed', undefined, settings.appLanguage));
}

function failure(code: AiActionErrorCode, message: string): AiActionResponse {
  return {
    ok: false,
    error: { code, message },
  };
}
