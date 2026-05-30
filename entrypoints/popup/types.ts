import type { ReactNode } from 'react';

import type { ExtensionSettings } from '@/lib/settings';

export type Screen = 'home' | 'translation' | 'interaction' | 'provider';

export type SettingsScreen = Exclude<Screen, 'home'>;

export type NavigationDirection = 'forward' | 'back';

export type SaveState = 'idle' | 'saved';

export type SettingUpdateHandler = <TKey extends keyof ExtensionSettings>(
  key: TKey,
  value: ExtensionSettings[TKey],
) => void;

export type NavItem = {
  screen: SettingsScreen;
  title: string;
  icon: ReactNode;
};
