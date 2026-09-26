import type { ReactNode } from 'react';

export type { SettingUpdateHandler } from '@/lib/settings';
export type { SaveState } from '@/lib/hooks/useSettings';

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

export type NavItem = {
  screen: Exclude<Screen, 'home'>;
  title: string;
  icon: ReactNode;
};
