import { storage } from '#imports';

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
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  triggerMode: 'click',
  popupMode: 'bubble',
  cacheEnabled: true,
  closeOnOutsideClick: true,
};

export const settingsItem = storage.defineItem<ExtensionSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await settingsItem.getValue();
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await settingsItem.setValue({ ...DEFAULT_SETTINGS, ...settings });
}
