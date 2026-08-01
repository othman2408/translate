import { storage } from '#imports';

import { DEFAULT_HISTORY_LIMIT, clampHistoryLimit } from './history';
import type { AppLanguage } from './i18n';
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
const DEEPSEEK_MODEL_OPTIONS = [
  { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
] as const;
const OPENROUTER_MODEL_OPTIONS = [
  { value: 'openrouter/auto', label: 'Auto Router' },
  { value: 'openrouter/free', label: 'Free Models Router' },
] as const;
const KIMI_MODEL_OPTIONS = [
  { value: 'kimi-k2.5', label: 'Kimi K2.5' },
  { value: 'kimi-k2.6', label: 'Kimi K2.6' },
  { value: 'kimi-k2.7-code', label: 'Kimi K2.7 Code' },
  { value: 'kimi-k2.7-code-highspeed', label: 'Kimi K2.7 Code Highspeed' },
  { value: 'kimi-k3', label: 'Kimi K3' },
] as const;

export type AiModelOption = { value: string; label: string };

const AI_PROVIDER_MODEL_OPTIONS: Record<AiProviderType, readonly AiModelOption[]> = {
  deepseek: DEEPSEEK_MODEL_OPTIONS,
  openrouter: OPENROUTER_MODEL_OPTIONS,
  kimi: KIMI_MODEL_OPTIONS,
};

const DEFAULT_AI_MODELS: Record<AiProviderType, string> = {
  deepseek: 'deepseek-v4-flash',
  openrouter: 'openrouter/auto',
  kimi: 'kimi-k2.5',
};

const AI_PROVIDER_NAMES: Record<AiProviderType, string> = {
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  kimi: 'Kimi',
};

export function getAiProviderModelOptions(type: AiProviderType): readonly AiModelOption[] {
  return AI_PROVIDER_MODEL_OPTIONS[type];
}

export function getDefaultAiModel(type: AiProviderType): string {
  return DEFAULT_AI_MODELS[type];
}

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
  const defaultAiProviderId = getNormalizedDefaultAiProviderId(aiProviders, currentSettings.defaultAiProviderId);
  const aiRewritePrompt = currentSettings.aiRewritePrompt?.trim() || DEFAULT_AI_REWRITE_PROMPT;
  const aiRewriteLanguage = currentSettings.aiRewriteLanguage?.trim() || currentSettings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;
  const aiExplainPrompt = currentSettings.aiExplainPrompt?.trim() || DEFAULT_AI_EXPLAIN_PROMPT;
  const aiExplanationLanguage = currentSettings.aiExplanationLanguage?.trim() || currentSettings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;

  return {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
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
        model: normalizeAiModel(type, provider.model),
      };
    })
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

function getDefaultAiProviderName(type: AiProviderType, index: number): string {
  const name = getAiProviderTypeName(type);
  return index === 0 ? name : `${name} ${index + 1}`;
}

function normalizeAiProviderType(type: AiProviderType | undefined): AiProviderType {
  return type === 'openrouter' || type === 'kimi' ? type : 'deepseek';
}

function normalizeAiModel(type: AiProviderType, model: string | undefined): string {
  const normalizedModel = model?.trim();
  if (type === 'openrouter' && normalizedModel) {
    return normalizedModel;
  }

  if (normalizedModel && getAiProviderModelOptions(type).some((option) => option.value === normalizedModel)) {
    return normalizedModel;
  }

  return getDefaultAiModel(type);
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

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
