import { storage } from '#imports';

import { DEFAULT_HISTORY_LIMIT, clampHistoryLimit } from './history';
import type { AppLanguage } from './i18n';
import type { ThemeMode } from './theme';

export type TriggerMode = 'click' | 'instant';
export type PopupMode = 'bubble' | 'dictionary';

export type ExtensionSettings = {
  apiKey: string;
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
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    historyLimit: clampHistoryLimit(settings.historyLimit ?? DEFAULT_SETTINGS.historyLimit),
  };
}
