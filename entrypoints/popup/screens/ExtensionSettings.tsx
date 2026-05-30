import { Button, Field, Input } from '@base-ui/react';
import { RotateCcw } from 'lucide-react';

import { HISTORY_LIMIT_MAX, HISTORY_LIMIT_MIN, clampHistoryLimit } from '@/lib/history';
import { getAppLanguageOptions, t, type AppLanguage } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';
import { getThemeModeOptions, type ThemeMode } from '@/lib/theme';

import { GroupedSection } from '../components/GroupedSection';
import { SettingSelect } from '../components/SettingSelect';
import { SettingToggle } from '../components/SettingToggle';
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

      <GroupedSection label={t('groupHistory')}>
        <SettingToggle
          label={t('saveHistory')}
          checked={settings.historyEnabled}
          onCheckedChange={(checked) => onUpdate('historyEnabled', checked)}
        />
        <Field.Root className="setting-row">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelHistoryLimit')}</Field.Label>
            <Field.Description className="setting-description">
              {t('historyLimitDescription', String(HISTORY_LIMIT_MAX))}
            </Field.Description>
          </span>
          <Input
            className="number-input"
            type="number"
            min={HISTORY_LIMIT_MIN}
            max={HISTORY_LIMIT_MAX}
            step={1}
            value={String(settings.historyLimit)}
            onValueChange={(value) => {
              const parsedValue = Number.parseInt(value, 10);
              if (Number.isFinite(parsedValue)) {
                onUpdate('historyLimit', clampHistoryLimit(parsedValue));
              }
            }}
          />
        </Field.Root>
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
