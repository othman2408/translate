import { t } from '@/lib/i18n';
import type { ExtensionSettings as ExtensionSettingsModel } from '@/lib/settings';

import { AppHeader } from '../components/AppHeader';
import type {
  AiSettingsScreen,
  SaveState as SaveStateValue,
  SettingUpdateHandler,
  SettingsScreen as SettingsScreenName,
} from '../types';
import { AboutScreen } from './AboutScreen';
import { AiSettings } from './AiSettings';
import { InteractionSettings } from './InteractionSettings';
import { ExtensionSettings as ExtensionSettingsScreen } from './ExtensionSettings';
import { ProviderSettings } from './ProviderSettings';
import { TranslationSettings } from './TranslationSettings';

export function SettingsScreen({
  screen,
  aiScreen,
  settings,
  saveState,
  onBack,
  onUpdate,
  onUpdateSettings,
  onReset,
}: {
  screen: SettingsScreenName;
  aiScreen?: AiSettingsScreen;
  settings: ExtensionSettingsModel;
  saveState: SaveStateValue;
  onBack: () => void;
  onUpdate: SettingUpdateHandler;
  onUpdateSettings: (settings: ExtensionSettingsModel) => void;
  onReset: () => void;
}) {
  const meta = getScreenMeta(screen);

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', meta.title)}>
      <AppHeader
        title={meta.title}
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
        <ProviderSettings settings={settings} onUpdateSettings={onUpdateSettings} />
      )}

      {aiScreen && (
        <AiSettings
          screen={aiScreen}
          settings={settings}
          onUpdate={onUpdate}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {screen === 'extension' && (
        <ExtensionSettingsScreen settings={settings} onUpdate={onUpdate} onReset={onReset} />
      )}

      {screen === 'about' && (
        <AboutScreen />
      )}
    </section>
  );
}

function getScreenMeta(screen: SettingsScreenName): {
  title: string;
} {
  switch (screen) {
    case 'translation':
      return {
        title: t('titleTranslation'),
      };
    case 'interaction':
      return {
        title: t('titleInteraction'),
      };
    case 'provider':
      return {
        title: t('titleProvider'),
      };
    case 'ai-behavior':
      return {
        title: t('titleAiBehavior'),
      };
    case 'ai-rewrite':
      return {
        title: t('rewriteTitle'),
      };
    case 'ai-explain':
      return {
        title: t('explainTitle'),
      };
    case 'ai-providers':
      return {
        title: t('titleAiProviders'),
      };
    case 'extension':
      return {
        title: t('titleExtension'),
      };
    case 'about':
      return {
        title: t('titleAbout'),
      };
  }
}
