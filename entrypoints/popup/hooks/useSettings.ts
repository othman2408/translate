import { useEffect, useRef, useState } from 'react';

import { trimAiHistory, trimTranslationHistory } from '@/lib/history';
import {
  DEFAULT_SETTINGS,
  getSettings,
  normalizeSettings,
  saveSettings,
  settingsItem,
  type ExtensionSettings,
} from '@/lib/settings';

import type { SaveState } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    void getSettings().then((nextSettings) => {
      if (!active) {
        return;
      }

      setSettings(nextSettings);
      setLoaded(true);
    });

    const unwatch = settingsItem.watch((nextSettings) => {
      if (active) {
        setSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
      }
    });

    return () => {
      active = false;
      unwatch();

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function updateSettings(
    nextSettings: ExtensionSettings,
    trimHistoryLimit: 'ai' | 'translation' | false = false,
  ): void {
    setSettings(nextSettings);
    setSaveState('idle');

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    void saveSettings(nextSettings).then(() => {
      if (trimHistoryLimit === 'translation') {
        void trimTranslationHistory(nextSettings.historyLimit);
      }
      if (trimHistoryLimit === 'ai') {
        void trimAiHistory(nextSettings.aiHistoryLimit);
      }

      setSaveState('saved');
      saveTimerRef.current = window.setTimeout(() => setSaveState('idle'), 1100);
    });
  }

  function updateSetting<TKey extends keyof ExtensionSettings>(
    key: TKey,
    value: ExtensionSettings[TKey],
  ): void {
    updateSettings(
      { ...settings, [key]: value },
      key === 'historyLimit' ? 'translation' : key === 'aiHistoryLimit' ? 'ai' : false,
    );
  }

  function resetSettings(): void {
    updateSettings(normalizeSettings(DEFAULT_SETTINGS));
  }

  return {
    loaded,
    resetSettings,
    saveState,
    settings,
    updateSetting,
    updateSettings,
  };
}
