import type { ReactNode } from 'react';

import type { ExtensionSettings } from '@/lib/settings';

export type Screen = 'home' | 'history' | 'translation' | 'interaction' | 'provider' | 'extension';

export type SettingsScreen = Exclude<Screen, 'home' | 'history'>;
export type HomeNavScreen = Exclude<Screen, 'home'>;

export type NavigationDirection = 'forward' | 'back';

export type SaveState = 'idle' | 'saved';

export type SettingUpdateHandler = <TKey extends keyof ExtensionSettings>(
  key: TKey,
  value: ExtensionSettings[TKey],
) => void;

export type NavItem = {
  screen: HomeNavScreen;
  title: string;
  icon: ReactNode;
};
