import { Database, Languages, Settings2, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings as ExtensionSettingsModel } from '@/lib/settings';

import { AppHeader } from '../components/AppHeader';
import type {
  SaveState as SaveStateValue,
  SettingUpdateHandler,
  SettingsScreen as SettingsScreenName,
} from '../types';
import { InteractionSettings } from './InteractionSettings';
import { ExtensionSettings as ExtensionSettingsScreen } from './ExtensionSettings';
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
  settings: ExtensionSettingsModel;
  saveState: SaveStateValue;
  onBack: () => void;
  onUpdate: SettingUpdateHandler;
  onReset: () => void;
}) {
  const meta = getScreenMeta(screen);

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', meta.title)}>
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
        <ProviderSettings settings={settings} onUpdate={onUpdate} />
      )}

      {screen === 'extension' && (
        <ExtensionSettingsScreen settings={settings} onUpdate={onUpdate} onReset={onReset} />
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
        title: t('titleTranslation'),
        icon: <Languages size={19} />,
      };
    case 'interaction':
      return {
        title: t('titleInteraction'),
        icon: <Zap size={19} />,
      };
    case 'provider':
      return {
        title: t('titleProvider'),
        icon: <Database size={19} />,
      };
    case 'extension':
      return {
        title: t('titleExtension'),
        icon: <Settings2 size={19} />,
      };
  }
}
