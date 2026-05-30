import { Button, Field, Input } from '@base-ui/react';
import { RotateCcw, ShieldCheck } from 'lucide-react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';

import { GroupedSection } from '../components/GroupedSection';
import type { SettingUpdateHandler } from '../types';

export function ProviderSettings({
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
      <GroupedSection label={t('groupGoogleCloud')}>
        <Field.Root className="setting-row setting-row--stacked">
          <div className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelApiKey')}</Field.Label>
            <Field.Description className="setting-description">
              {t('providerDescription')}
            </Field.Description>
          </div>
          <Input
            className="text-input"
            type="password"
            spellCheck={false}
            placeholder={t('inputApiKey')}
            value={settings.apiKey}
            onValueChange={(value) => onUpdate('apiKey', value)}
          />
        </Field.Root>

        <div className="info-row">
          <span className="info-row__icon" aria-hidden="true">
            <ShieldCheck size={16} />
          </span>
          <span>
            <strong>{t('infoLocalOnlyStorage')}</strong>
          </span>
        </div>
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
