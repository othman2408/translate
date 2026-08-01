import type { ReactNode } from 'react';

import type { ExtensionSettings } from '@/lib/settings';

export type Screen =
  | 'home'
  | 'settings'
  | 'general'
  | 'storage'
  | 'cache'
  | 'history'
  | 'translation'
  | 'translation-languages'
  | 'translation-providers'
  | 'interaction'
  | 'ai'
  | 'ai-behavior'
  | 'ai-rewrite'
  | 'ai-explain'
  | 'ai-providers'
  | 'ai-history'
  | 'about';

export type SettingsScreen = Exclude<Screen, 'home' | 'settings' | 'storage' | 'cache' | 'history' | 'translation' | 'ai' | 'ai-history'>;
export type AiSettingsScreen = Extract<Screen, 'ai-behavior' | 'ai-rewrite' | 'ai-explain' | 'ai-providers'>;

export type NavigationDirection = 'forward' | 'back';

export type SaveState = 'idle' | 'saved';

export type SettingUpdateHandler = <TKey extends keyof ExtensionSettings>(
  key: TKey,
  value: ExtensionSettings[TKey],
) => void;

export type NavItem = {
  screen: Exclude<Screen, 'home'>;
  title: string;
  icon: ReactNode;
};
