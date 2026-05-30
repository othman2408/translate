import { Database, Languages, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ExtensionSettings } from '@/lib/settings';

import { AppHeader } from '../components/AppHeader';
import type {
  SaveState as SaveStateValue,
  SettingUpdateHandler,
  SettingsScreen as SettingsScreenName,
} from '../types';
import { InteractionSettings } from './InteractionSettings';
import { ProviderSettings } from './ProviderSettings';
import { TranslationSettings } from './TranslationSettings';

export function SettingsScreen({
  screen,
  settings,
  saveState,
  onBack,
  onUpdate,
  onReset,
}: {
  screen: SettingsScreenName;
  settings: ExtensionSettings;
  saveState: SaveStateValue;
  onBack: () => void;
  onUpdate: SettingUpdateHandler;
  onReset: () => void;
}) {
  const meta = getScreenMeta(screen);

  return (
    <section className="screen screen--settings" aria-label={`${meta.title} settings`}>
      <AppHeader
        title={meta.title}
        icon={meta.icon}
        saveState={saveState}
        onBack={onBack}
      />

      {screen === 'translation' && (
        <TranslationSettings settings={settings} onUpdate={onUpdate} />
      )}

      {screen === 'interaction' && (
        <InteractionSettings settings={settings} onUpdate={onUpdate} />
      )}

      {screen === 'provider' && (
        <ProviderSettings settings={settings} onUpdate={onUpdate} onReset={onReset} />
      )}
    </section>
  );
}

function getScreenMeta(screen: SettingsScreenName): {
  title: string;
  icon: ReactNode;
} {
  switch (screen) {
    case 'translation':
      return {
        title: 'Translation',
        icon: <Languages size={19} />,
      };
    case 'interaction':
      return {
        title: 'Interaction',
        icon: <Zap size={19} />,
      };
    case 'provider':
      return {
        title: 'Provider',
        icon: <Database size={19} />,
      };
  }
}
