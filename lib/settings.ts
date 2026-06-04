import { storage } from '#imports';

import { DEFAULT_HISTORY_LIMIT, clampHistoryLimit } from './history';
import type { AppLanguage } from './i18n';
import type { ThemeMode } from './theme';

export type TriggerMode = 'click' | 'instant';
export type PopupMode = 'bubble' | 'dictionary';
export type ProviderType = 'google-v2';
export type AiProviderType = 'deepseek';

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
  aiEnabled: boolean;
  aiProviders: AiProviderConfig[];
  defaultAiProviderId: string;
  aiRewritePrompt: string;
  aiRewriteLanguage: string;
  aiExplainPrompt: string;
  aiExplanationLanguage: string;
  aiHistoryEnabled: boolean;
  aiHistoryLimit: number;
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
  resultPopupSize: ResultPopupSize;
};

export const RESULT_POPUP_SIZE_LIMITS = {
  minWidth: 280,
  minHeight: 220,
  maxWidth: 720,
  maxHeight: 720,
  defaultWidth: 360,
  defaultHeight: 420,
} as const;

export const DEFAULT_AI_REWRITE_PROMPT = 'Rewrite the selected text to be clearer, more natural, and polished while preserving the original meaning. Return only the rewritten text.';
export const DEFAULT_AI_EXPLAIN_PROMPT = 'Explain the selected text clearly and briefly. Define key terms or context when useful. Return only the explanation.';
export const DEEPSEEK_MODEL_OPTIONS = [
  { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
] as const;
export type DeepSeekModel = typeof DEEPSEEK_MODEL_OPTIONS[number]['value'];
export const DEFAULT_AI_MODEL: DeepSeekModel = 'deepseek-v4-flash';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  providers: [],
  defaultProviderId: '',
  aiEnabled: false,
  aiProviders: [],
  defaultAiProviderId: '',
  aiRewritePrompt: DEFAULT_AI_REWRITE_PROMPT,
  aiRewriteLanguage: 'en',
  aiExplainPrompt: DEFAULT_AI_EXPLAIN_PROMPT,
  aiExplanationLanguage: 'en',
  aiHistoryEnabled: true,
  aiHistoryLimit: DEFAULT_HISTORY_LIMIT,
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
  resultPopupSize: {
    width: RESULT_POPUP_SIZE_LIMITS.defaultWidth,
    height: RESULT_POPUP_SIZE_LIMITS.defaultHeight,
  },
};

export const settingsItem = storage.defineItem<ExtensionSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await settingsItem.getValue();
  const nextSettings = normalizeSettings(settings);

  if (!settings.aiRewriteLanguage?.trim() || !settings.aiExplanationLanguage?.trim()) {
    await settingsItem.setValue(nextSettings);
  }

  return nextSettings;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const nextSettings = normalizeSettings(settings);
  await settingsItem.setValue(nextSettings);
}

function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
  const providers = normalizeProviders(settings.providers, settings.apiKey);
  const defaultProviderId = getNormalizedDefaultProviderId(providers, settings.defaultProviderId);
  const aiProviders = normalizeAiProviders(settings.aiProviders);
  const defaultAiProviderId = getNormalizedDefaultAiProviderId(aiProviders, settings.defaultAiProviderId);
  const aiRewritePrompt = settings.aiRewritePrompt?.trim() || DEFAULT_AI_REWRITE_PROMPT;
  const aiRewriteLanguage = settings.aiRewriteLanguage?.trim() || settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;
  const aiExplainPrompt = settings.aiExplainPrompt?.trim() || DEFAULT_AI_EXPLAIN_PROMPT;
  const aiExplanationLanguage = settings.aiExplanationLanguage?.trim() || settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    apiKey: providers.find((provider) => provider.id === defaultProviderId)?.apiKey ?? '',
    providers,
    defaultProviderId,
    aiProviders,
    defaultAiProviderId,
    aiRewritePrompt,
    aiRewriteLanguage,
    aiExplainPrompt,
    aiExplanationLanguage,
    historyLimit: clampHistoryLimit(settings.historyLimit ?? DEFAULT_SETTINGS.historyLimit),
    aiHistoryLimit: clampHistoryLimit(settings.aiHistoryLimit ?? DEFAULT_SETTINGS.aiHistoryLimit),
    resultPopupSize: normalizeResultPopupSize(settings.resultPopupSize),
  };
}

export function normalizeResultPopupSize(size: Partial<ResultPopupSize> | undefined): ResultPopupSize {
  return {
    width: clampNumber(
      size?.width,
      RESULT_POPUP_SIZE_LIMITS.minWidth,
      RESULT_POPUP_SIZE_LIMITS.maxWidth,
      RESULT_POPUP_SIZE_LIMITS.defaultWidth,
    ),
    height: clampNumber(
      size?.height,
      RESULT_POPUP_SIZE_LIMITS.minHeight,
      RESULT_POPUP_SIZE_LIMITS.maxHeight,
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

function normalizeAiProviders(providers: AiProviderConfig[] | undefined): AiProviderConfig[] {
  if (!Array.isArray(providers)) {
    return [];
  }

  return providers
    .map((provider, index) => ({
      id: provider.id || createProviderId(),
      type: provider.type === 'deepseek' ? provider.type : 'deepseek',
      name: provider.name.trim() || getDefaultAiProviderName(index),
      apiKey: provider.apiKey.trim(),
      model: normalizeDeepSeekModel(provider.model),
    }))
    .filter((provider) => provider.apiKey.length > 0);
}

function getNormalizedDefaultAiProviderId(
  providers: AiProviderConfig[],
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

function getDefaultAiProviderName(index: number): string {
  return index === 0 ? 'DeepSeek' : `DeepSeek ${index + 1}`;
}

function normalizeDeepSeekModel(model: string | undefined): DeepSeekModel {
  const normalizedModel = model?.trim();
  return DEEPSEEK_MODEL_OPTIONS.some((option) => option.value === normalizedModel)
    ? normalizedModel as DeepSeekModel
    : DEFAULT_AI_MODEL;
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(Math.min(Math.max(value, min), max));
}

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
