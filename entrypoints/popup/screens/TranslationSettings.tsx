import { t } from '@/lib/i18n';
import { LANGUAGE_OPTIONS, localizeLanguageOptions, TARGET_LANGUAGE_OPTIONS } from '@/lib/languages';
import type { ExtensionSettings } from '@/lib/settings';

import { GroupedSection } from '../components/GroupedSection';
import { SettingSelect } from '../components/SettingSelect';
import type { SettingUpdateHandler } from '../types';

export function TranslationSettings({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  const languageOptions = localizeLanguageOptions(LANGUAGE_OPTIONS, settings.appLanguage).map((option) => ({
    label: option.name,
    value: option.code,
  }));
  const targetLanguageOptions = localizeLanguageOptions(
    TARGET_LANGUAGE_OPTIONS,
    settings.appLanguage,
  ).map((option) => ({
    label: option.name,
    value: option.code,
  }));

  return (
    <div className="settings-stack">
      <GroupedSection label={t('groupLanguages')}>
        <SettingSelect
          label={t('labelFrom')}
          value={settings.sourceLanguage}
          options={languageOptions}
          onValueChange={(value) => onUpdate('sourceLanguage', value)}
        />
        <SettingSelect
          label={t('labelTo')}
          value={settings.targetLanguage}
          options={targetLanguageOptions}
          onValueChange={(value) => onUpdate('targetLanguage', value)}
        />
      </GroupedSection>

      <p className="quiet-note">
        {t('noteSelectedTextOnly')}
      </p>
    </div>
  );
}
