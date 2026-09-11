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
import type { AiTextActionProviderResult, AiTextActionRunOptions, IAiProvider } from './types';
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

  async run(
    request: AiTextActionServiceRequest,
    options: AiTextActionRunOptions = {},
  ): Promise<AiActionResponse> {
    const settings = await getSettings();
    const text = request.text.trim();

    if (!isActionEnabled(request.action, settings)) {
      return failure('disabled', t('errorAiDisabled', undefined, settings.appLanguage));
    }

    if (!text) {
      return failure('empty-text', t('errorSelectText', undefined, settings.appLanguage));
    }

    const providerConfigs = getRequestedAiProviders(settings, request.providerId);
    if (providerConfigs.length === 0) {
      return failure('missing-api-key', t('errorAiMissingApiKey', undefined, settings.appLanguage));
    }

    const language = getActionLanguage(request, settings);
    const prompt = getActionPrompt(request, settings);
    let lastError: unknown;

    for (const providerConfig of providerConfigs) {
      let streamedText = false;
      const attemptOptions: AiTextActionRunOptions = {
        ...options,
        onTextDelta: options.onTextDelta ? (textDelta) => {
          streamedText = true;
          options.onTextDelta?.(textDelta);
        } : undefined,
      };

      try {
        const provider = this.providerFactory.createProvider(providerConfig);
        const result: AiTextActionResult = settings.cacheEnabled
          ? await runCachedAiAction(request.action, text, prompt, language, providerConfig, provider, attemptOptions)
          : {
            ...await provider.runTextAction({
              action: request.action,
              text,
              prompt,
              language,
            }, attemptOptions),
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
        lastError = error;
        if (
          !settings.providerFallbackEnabled
          || request.providerId
          || streamedText
          || options.abortSignal?.aborted
          || !(error instanceof AiProviderError)
        ) {
          break;
        }
      }
    }

    return providerFailure(lastError, settings);
  }
}

async function runCachedAiAction(
  action: AiActionType,
  text: string,
  prompt: string,
  language: string | undefined,
  providerConfig: AiProviderConfig,
  provider: IAiProvider,
  options: AiTextActionRunOptions,
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
    options.onTextDelta?.(cached.resultText);
    return {
      resultText: cached.resultText,
      model: cached.model,
      fromCache: true,
    };
  }

  const runProvider = () => provider.runTextAction({ action, text, prompt, language }, options)
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
    });

  // A streamed request is owned by one UI and can be aborted when that UI closes.
  // Sharing it would let one consumer cancel every other consumer of the same key.
  if (options.abortSignal || options.onTextDelta) {
    return runProvider();
  }

  const existingRequest = inFlightAiActions.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = runProvider()
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

function getRequestedAiProviders(
  settings: ExtensionSettings,
  providerId: string | undefined,
): AiProviderConfig[] {
  if (providerId) {
    const provider = settings.aiProviders.find((candidate) => candidate.id === providerId);
    return provider ? [provider] : [];
  }

  const defaultProvider = getDefaultAiProvider(settings);
  if (!defaultProvider) {
    return [];
  }

  return [
    defaultProvider,
    ...settings.aiProviders.filter((provider) => provider.id !== defaultProvider.id),
  ];
}

function isActionEnabled(action: AiActionType, settings: ExtensionSettings): boolean {
  return action === 'rewrite' ? settings.aiRewriteEnabled : settings.aiExplainEnabled;
}

function getActionPrompt(request: AiTextActionServiceRequest, settings: ExtensionSettings): string {
  const actionPrompt = request.prompt?.trim() || (request.action === 'explain'
    ? settings.aiExplainPrompt || DEFAULT_AI_EXPLAIN_PROMPT
    : settings.aiRewritePrompt || DEFAULT_AI_REWRITE_PROMPT);
  const glossary = settings.aiGlossary.trim();

  return glossary
    ? `${actionPrompt}\n\nUse these preferred terms when relevant:\n${glossary}`
    : actionPrompt;
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
