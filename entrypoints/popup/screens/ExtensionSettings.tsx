import { Button } from '@base-ui/react';
import { RotateCcw } from 'lucide-react';

import { getAppLanguageOptions, t, type AppLanguage } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';
import { getThemeModeOptions, type ThemeMode } from '@/lib/theme';

import { GroupedSection } from '../components/GroupedSection';
import { SettingSelect } from '../components/SettingSelect';
import type { SettingUpdateHandler } from '../types';

export function ExtensionSettings({
  settings,
  onUpdate,
  onReset,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
  onReset: () => void;
}) {
  return (
    <div className="settings-stack">
      <GroupedSection label={t('groupInterface')}>
        <SettingSelect
          label={t('labelExtensionLanguage')}
          value={settings.appLanguage}
          options={getAppLanguageOptions(settings.appLanguage)}
          onValueChange={(value) => onUpdate('appLanguage', value as AppLanguage)}
        />
        <SettingSelect
          label={t('labelTheme')}
          value={settings.themeMode}
          options={getThemeModeOptions(settings.appLanguage)}
          onValueChange={(value) => onUpdate('themeMode', value as ThemeMode)}
        />
      </GroupedSection>

      <GroupedSection label={t('groupSettings')}>
        <div className="setting-row">
          <span className="setting-row__copy">
            <strong className="setting-label">{t('actionReset')}</strong>
          </span>
          <Button className="danger-soft-button" type="button" onClick={onReset}>
            <RotateCcw size={14} />
            {t('actionReset')}
          </Button>
        </div>
      </GroupedSection>
    </div>
  );
}
