import { storage } from '#imports';

import { DEFAULT_HISTORY_LIMIT, clampHistoryLimit } from './history';
import type { AppLanguage } from './i18n';
import type { ThemeMode } from './theme';

export type TriggerMode = 'click' | 'instant';
export type PopupMode = 'bubble' | 'dictionary';
export type ProviderType = 'google-v2';

export type TranslationProviderConfig = {
  id: string;
  type: ProviderType;
  name: string;
  apiKey: string;
};

export type ExtensionSettings = {
  apiKey: string;
  providers: TranslationProviderConfig[];
  defaultProviderId: string;
  targetLanguage: string;
  sourceLanguage: 'auto' | string;
  triggerMode: TriggerMode;
  popupMode: PopupMode;
  cacheEnabled: boolean;
  closeOnOutsideClick: boolean;
  appLanguage: AppLanguage;
  themeMode: ThemeMode;
  disabledHosts: string[];
  historyEnabled: boolean;
  historyLimit: number;
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  providers: [],
  defaultProviderId: '',
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  triggerMode: 'click',
  popupMode: 'bubble',
  cacheEnabled: true,
  closeOnOutsideClick: true,
  appLanguage: 'auto',
  themeMode: 'system',
  disabledHosts: [],
  historyEnabled: true,
  historyLimit: DEFAULT_HISTORY_LIMIT,
};

export const settingsItem = storage.defineItem<ExtensionSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await settingsItem.getValue();
  return normalizeSettings(settings);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const nextSettings = normalizeSettings(settings);
  await settingsItem.setValue(nextSettings);
}

function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
  const providers = normalizeProviders(settings.providers, settings.apiKey);
  const defaultProviderId = getNormalizedDefaultProviderId(providers, settings.defaultProviderId);

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    apiKey: providers.find((provider) => provider.id === defaultProviderId)?.apiKey ?? '',
    providers,
    defaultProviderId,
    historyLimit: clampHistoryLimit(settings.historyLimit ?? DEFAULT_SETTINGS.historyLimit),
  };
}

export function getDefaultProvider(
  settings: Pick<ExtensionSettings, 'providers' | 'defaultProviderId'>,
): TranslationProviderConfig | undefined {
  return settings.providers.find((provider) => provider.id === settings.defaultProviderId)
    ?? settings.providers[0];
}

function normalizeProviders(
  providers: TranslationProviderConfig[] | undefined,
  legacyApiKey: string | undefined,
): TranslationProviderConfig[] {
  const normalizedProviders = Array.isArray(providers)
    ? providers
      .map((provider, index) => ({
        id: provider.id || createProviderId(),
        type: provider.type === 'google-v2' ? provider.type : 'google-v2',
        name: provider.name.trim() || getDefaultProviderName(index),
        apiKey: provider.apiKey.trim(),
      }))
      .filter((provider) => provider.apiKey.length > 0)
    : [];

  const trimmedLegacyApiKey = legacyApiKey?.trim() ?? '';
  if (normalizedProviders.length > 0 || !trimmedLegacyApiKey) {
    return normalizedProviders;
  }

  return [{
    id: 'google-default',
    type: 'google-v2',
    name: getDefaultProviderName(0),
    apiKey: trimmedLegacyApiKey,
  }];
}

function getNormalizedDefaultProviderId(
  providers: TranslationProviderConfig[],
  defaultProviderId: string | undefined,
): string {
  if (defaultProviderId && providers.some((provider) => provider.id === defaultProviderId)) {
    return defaultProviderId;
  }

  return providers[0]?.id ?? '';
}

function getDefaultProviderName(index: number): string {
  return index === 0 ? 'Google Translate' : `Google Translate ${index + 1}`;
}

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
