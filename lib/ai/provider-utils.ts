import { t } from '@/lib/i18n';
import type { AiActionErrorCode, AiActionFailure } from '@/lib/messages';
import { getDefaultAiProvider, type AiProviderConfig, type ExtensionSettings } from '@/lib/settings';
import { AiProviderError } from './types';

export function getRequestedAiProviders(
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

export function providerFailure(error: unknown, settings: ExtensionSettings): AiActionFailure {
  if (error instanceof AiProviderError) {
    return failure(
      error.code,
      error.providerMessage ?? t(error.messageKey, undefined, settings.appLanguage),
    );
  }

  return failure('unknown', t('errorAiProviderFailed', undefined, settings.appLanguage));
}

export function failure(code: AiActionErrorCode, message: string): AiActionFailure {
  return {
    ok: false,
    error: { code, message },
  };
}
