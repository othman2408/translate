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
import { GeneralSettings } from './GeneralSettings';
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

      {screen === 'translation-languages' && (
        <TranslationSettings settings={settings} onUpdate={onUpdate} />
      )}

      {screen === 'interaction' && (
        <InteractionSettings settings={settings} onUpdate={onUpdate} />
      )}

      {screen === 'translation-providers' && (
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

      {screen === 'general' && (
        <GeneralSettings settings={settings} onUpdate={onUpdate} onReset={onReset} />
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
    case 'translation-languages':
      return {
        title: t('titleLanguages'),
      };
    case 'interaction':
      return {
        title: t('titleInteraction'),
      };
    case 'translation-providers':
      return {
        title: t('titleTranslationProviders'),
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
    case 'general':
      return {
        title: t('titleGeneral'),
      };
    case 'about':
      return {
        title: t('titleAbout'),
      };
  }
}
