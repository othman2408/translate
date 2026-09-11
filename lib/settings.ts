import { browser, storage } from '#imports';

import { DEFAULT_HISTORY_LIMIT, clampHistoryLimit } from './history';
import type { AppLanguage } from './i18n';
import { resolvePreferredLanguage } from './languages';
import type { ThemeMode } from './theme';

export type TriggerMode = 'click' | 'instant';
export type PopupMode = 'bubble' | 'dictionary';
export type ReaderModeSize = 'medium' | 'large' | 'full';
export type ProviderType = 'google-v2';
export type AiProviderType = 'deepseek' | 'openrouter' | 'kimi';

export type TranslationProviderConfig = {
  id: string;
  type: ProviderType;
  name: string;
  apiKey: string;
};

export type AiProviderConfig = {
  id: string;
  type: AiProviderType;
  name: string;
  apiKey: string;
  model: string;
};

export type ResultPopupSize = {
  width: number;
  height: number;
};

export type ExtensionSettings = {
  apiKey: string;
  providers: TranslationProviderConfig[];
  defaultProviderId: string;
  aiProviders: AiProviderConfig[];
  defaultAiProviderId: string;
  aiRewriteEnabled: boolean;
  aiExplainEnabled: boolean;
  aiRewritePrompt: string;
  aiRewriteLanguage: string;
  aiExplainPrompt: string;
  aiExplanationLanguage: string;
  aiGlossary: string;
  aiHistoryEnabled: boolean;
  aiHistoryLimit: number;
  targetLanguage: string;
  sourceLanguage: 'auto' | string;
  preferredLanguage: string;
  triggerMode: TriggerMode;
  popupMode: PopupMode;
  cacheEnabled: boolean;
  providerFallbackEnabled: boolean;
  closeOnOutsideClick: boolean;
  appLanguage: AppLanguage;
  themeMode: ThemeMode;
  disabledHosts: string[];
  historyEnabled: boolean;
  historyLimit: number;
  resultPopupSize: ResultPopupSize;
  readerModeSize: ReaderModeSize;
};

export const RESULT_POPUP_SIZE_LIMITS = {
  minWidth: 280,
  minHeight: 220,
  defaultWidth: 360,
  defaultHeight: 420,
} as const;

export const DEFAULT_AI_REWRITE_PROMPT = 'Rewrite the selected text to be clearer, more natural, and polished while preserving the original meaning. Return only the rewritten text.';
export const DEFAULT_AI_EXPLAIN_PROMPT = 'Explain the selected text clearly and briefly. Define key terms or context when useful. Return only the explanation.';
// Only used to preserve the effective model of old configurations without an ID.
const LEGACY_AI_MODELS: Record<AiProviderType, string> = {
  deepseek: 'deepseek-v4-flash',
  openrouter: 'openrouter/auto',
  kimi: 'kimi-k2.5',
};

const AI_PROVIDER_NAMES: Record<AiProviderType, string> = {
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  kimi: 'Kimi',
};

export function getAiProviderTypeName(type: AiProviderType): string {
  return AI_PROVIDER_NAMES[type];
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  providers: [],
  defaultProviderId: '',
  aiProviders: [],
  defaultAiProviderId: '',
  aiRewriteEnabled: false,
  aiExplainEnabled: false,
  aiRewritePrompt: DEFAULT_AI_REWRITE_PROMPT,
  aiRewriteLanguage: 'en',
  aiExplainPrompt: DEFAULT_AI_EXPLAIN_PROMPT,
  aiExplanationLanguage: 'en',
  aiGlossary: '',
  aiHistoryEnabled: true,
  aiHistoryLimit: DEFAULT_HISTORY_LIMIT,
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  preferredLanguage: '',
  triggerMode: 'click',
  popupMode: 'bubble',
  cacheEnabled: true,
  providerFallbackEnabled: false,
  closeOnOutsideClick: true,
  appLanguage: 'auto',
  themeMode: 'system',
  disabledHosts: [],
  historyEnabled: true,
  historyLimit: DEFAULT_HISTORY_LIMIT,
  resultPopupSize: {
    width: RESULT_POPUP_SIZE_LIMITS.defaultWidth,
    height: RESULT_POPUP_SIZE_LIMITS.defaultHeight,
  },
  readerModeSize: 'large',
};

export const settingsItem = storage.defineItem<ExtensionSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await settingsItem.getValue();
  const nextSettings = normalizeSettings(settings);
  const legacySettings = settings as Partial<ExtensionSettings> & { aiEnabled?: boolean };

  if (
    'aiEnabled' in legacySettings
    || !settings.aiRewriteLanguage?.trim()
    || !settings.aiExplanationLanguage?.trim()
    || !settings.preferredLanguage?.trim()
  ) {
    await settingsItem.setValue(nextSettings);
  }

  return nextSettings;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const nextSettings = normalizeSettings(settings);
  await settingsItem.setValue(nextSettings);
}

export function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
  const { aiEnabled, ...currentSettings } = settings as Partial<ExtensionSettings> & { aiEnabled?: boolean };
  const legacyAiEnabled = aiEnabled === true;
  const providers = normalizeProviders(currentSettings.providers, currentSettings.apiKey);
  const defaultProviderId = getNormalizedDefaultProviderId(providers, currentSettings.defaultProviderId);
  const aiProviders = normalizeAiProviders(currentSettings.aiProviders);
  const defaultAiProviderId = getNormalizedDefaultProviderId(aiProviders, currentSettings.defaultAiProviderId);
  const aiRewritePrompt = currentSettings.aiRewritePrompt?.trim() || DEFAULT_AI_REWRITE_PROMPT;
  const aiRewriteLanguage = currentSettings.aiRewriteLanguage?.trim() || currentSettings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;
  const aiExplainPrompt = currentSettings.aiExplainPrompt?.trim() || DEFAULT_AI_EXPLAIN_PROMPT;
  const aiExplanationLanguage = currentSettings.aiExplanationLanguage?.trim() || currentSettings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;

  return {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    preferredLanguage: resolvePreferredLanguage(currentSettings.preferredLanguage || getBrowserLanguage()),
    apiKey: providers.find((provider) => provider.id === defaultProviderId)?.apiKey ?? '',
    providers,
    defaultProviderId,
    aiProviders,
    defaultAiProviderId,
    aiRewriteEnabled: currentSettings.aiRewriteEnabled ?? legacyAiEnabled,
    aiExplainEnabled: currentSettings.aiExplainEnabled ?? legacyAiEnabled,
    aiRewritePrompt,
    aiRewriteLanguage,
    aiExplainPrompt,
    aiExplanationLanguage,
    historyLimit: clampHistoryLimit(currentSettings.historyLimit ?? DEFAULT_SETTINGS.historyLimit),
    aiHistoryLimit: clampHistoryLimit(currentSettings.aiHistoryLimit ?? DEFAULT_SETTINGS.aiHistoryLimit),
    resultPopupSize: normalizeResultPopupSize(currentSettings.resultPopupSize),
    readerModeSize: normalizeReaderModeSize(currentSettings.readerModeSize),
  };
}

export function normalizeResultPopupSize(size: Partial<ResultPopupSize> | undefined): ResultPopupSize {
  return {
    width: clampNumberMin(
      size?.width,
      RESULT_POPUP_SIZE_LIMITS.minWidth,
      RESULT_POPUP_SIZE_LIMITS.defaultWidth,
    ),
    height: clampNumberMin(
      size?.height,
      RESULT_POPUP_SIZE_LIMITS.minHeight,
      RESULT_POPUP_SIZE_LIMITS.defaultHeight,
    ),
  };
}

export function getDefaultProvider(
  settings: Pick<ExtensionSettings, 'providers' | 'defaultProviderId'>,
): TranslationProviderConfig | undefined {
  return settings.providers.find((provider) => provider.id === settings.defaultProviderId)
    ?? settings.providers[0];
}

export function getDefaultAiProvider(
  settings: Pick<ExtensionSettings, 'aiProviders' | 'defaultAiProviderId'>,
): AiProviderConfig | undefined {
  return settings.aiProviders.find((provider) => provider.id === settings.defaultAiProviderId)
    ?? settings.aiProviders[0];
}

function normalizeProviders(
  providers: TranslationProviderConfig[] | undefined,
  legacyApiKey: string | undefined,
): TranslationProviderConfig[] {
  const normalizedProviders = Array.isArray(providers)
    ? providers
      .map((provider, index) => ({
        id: provider.id || createProviderId(),
        type: 'google-v2' as const,
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
  providers: { id: string }[],
  defaultProviderId: string | undefined,
): string {
  if (defaultProviderId && providers.some((provider) => provider.id === defaultProviderId)) {
    return defaultProviderId;
  }

  return providers[0]?.id ?? '';
}

function normalizeAiProviders(providers: AiProviderConfig[] | undefined): AiProviderConfig[] {
  if (!Array.isArray(providers)) {
    return [];
  }

  const providerCounts = new Map<AiProviderType, number>();

  return providers
    .map((provider) => {
      const type = normalizeAiProviderType(provider.type);
      const typeIndex = providerCounts.get(type) ?? 0;
      providerCounts.set(type, typeIndex + 1);

      return {
        id: provider.id || createProviderId(),
        type,
        name: provider.name.trim() || getDefaultAiProviderName(type, typeIndex),
        apiKey: provider.apiKey.trim(),
        model: provider.model?.trim() || LEGACY_AI_MODELS[type],
      };
    })
    .filter((provider) => provider.apiKey.length > 0);
}

function getDefaultProviderName(index: number): string {
  return index === 0 ? 'Google Translate' : `Google Translate ${index + 1}`;
}

function getDefaultAiProviderName(type: AiProviderType, index: number): string {
  const name = getAiProviderTypeName(type);
  return index === 0 ? name : `${name} ${index + 1}`;
}

function normalizeAiProviderType(type: AiProviderType | undefined): AiProviderType {
  return type === 'openrouter' || type === 'kimi' ? type : 'deepseek';
}

function getBrowserLanguage(): string {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return 'en';
  }
}

function normalizeReaderModeSize(value: ReaderModeSize | undefined): ReaderModeSize {
  return value === 'medium' || value === 'full' ? value : 'large';
}

function clampNumberMin(value: number | undefined, min: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(Math.max(value, min));
}

export function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
