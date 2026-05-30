import { Button, Field, Input } from '@base-ui/react';
import { RotateCcw, ShieldCheck } from 'lucide-react';

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
      <GroupedSection label="Google Cloud">
        <Field.Root className="setting-row setting-row--stacked">
          <div className="setting-row__copy">
            <Field.Label className="setting-label">API key</Field.Label>
            <Field.Description className="setting-description">
              Google Cloud Translation Basic v2
            </Field.Description>
          </div>
          <Input
            className="text-input"
            type="password"
            spellCheck={false}
            placeholder="AIza..."
            value={settings.apiKey}
            onValueChange={(value) => onUpdate('apiKey', value)}
          />
        </Field.Root>

        <div className="info-row">
          <span className="info-row__icon" aria-hidden="true">
            <ShieldCheck size={16} />
          </span>
          <span>
            <strong>Local-only storage</strong>
          </span>
        </div>
      </GroupedSection>

      <GroupedSection label="Settings">
        <div className="setting-row">
          <span className="setting-row__copy">
            <strong className="setting-label">Reset settings</strong>
          </span>
          <Button className="danger-soft-button" type="button" onClick={onReset}>
            <RotateCcw size={14} />
            Reset
          </Button>
        </div>
      </GroupedSection>
    </div>
  );
}
