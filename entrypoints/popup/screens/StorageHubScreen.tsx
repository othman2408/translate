import { Field, Input } from '@base-ui/react';
import { Database, History, Sparkles } from 'lucide-react';

import { HISTORY_LIMIT_MAX, HISTORY_LIMIT_MIN, clampHistoryLimit } from '@/lib/history';
import { t } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';

import { AppHeader } from '../components/AppHeader';
import { GroupedSection } from '../components/GroupedSection';
import { NavigationList } from '../components/NavigationList';
import { SettingToggle } from '../components/SettingToggle';
import type { NavItem, SaveState, Screen, SettingUpdateHandler } from '../types';

export function StorageHubScreen({
  settings,
  saveState,
  onBack,
  onNavigate,
  onUpdate,
}: {
  settings: ExtensionSettings;
  saveState: SaveState;
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
  onUpdate: SettingUpdateHandler;
}) {
  const navItems: NavItem[] = [
    {
      screen: 'cache',
      title: t('titleCache'),
      icon: <Database size={17} />,
    },
    {
      screen: 'history',
      title: t('titleTranslationHistory'),
      icon: <History size={17} />,
    },
    {
      screen: 'ai-history',
      title: t('titleAiHistory'),
      icon: <Sparkles size={17} />,
    },
  ];

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', t('titleStorage'))}>
      <AppHeader title={t('titleStorage')} saveState={saveState} onBack={onBack} />
      <div className="settings-stack">
        <GroupedSection label={t('groupStoragePreferences')}>
          <SettingToggle
            label={t('cacheTranslations')}
            checked={settings.cacheEnabled}
            onCheckedChange={(checked) => onUpdate('cacheEnabled', checked)}
          />
          <SettingToggle
            label={t('saveHistory')}
            checked={settings.historyEnabled}
            onCheckedChange={(checked) => onUpdate('historyEnabled', checked)}
          />
          <HistoryLimitField
            label={t('labelHistoryLimit')}
            value={settings.historyLimit}
            onChange={(value) => onUpdate('historyLimit', value)}
          />
          <SettingToggle
            label={t('saveAiHistory')}
            checked={settings.aiHistoryEnabled}
            onCheckedChange={(checked) => onUpdate('aiHistoryEnabled', checked)}
          />
          <HistoryLimitField
            label={t('labelAiHistoryLimit')}
            value={settings.aiHistoryLimit}
            onChange={(value) => onUpdate('aiHistoryLimit', value)}
          />
        </GroupedSection>

        <div className="settings-group">
          <h2>{t('groupStoredContent')}</h2>
          <NavigationList items={navItems} onNavigate={onNavigate} />
        </div>
      </div>
    </section>
  );
}

function HistoryLimitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field.Root className="setting-row">
      <span className="setting-row__copy">
        <Field.Label className="setting-label">{label}</Field.Label>
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
        value={String(value)}
        onValueChange={(nextValue) => {
          const parsedValue = Number.parseInt(nextValue, 10);
          if (Number.isFinite(parsedValue)) {
            onChange(clampHistoryLimit(parsedValue));
          }
        }}
      />
    </Field.Root>
  );
}
