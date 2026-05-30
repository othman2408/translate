import type { ExtensionSettings, PopupMode, TriggerMode } from '@/lib/settings';

import { GroupedSection } from '../components/GroupedSection';
import { SegmentedControl } from '../components/SegmentedControl';
import { SettingRow } from '../components/SettingRow';
import { SettingToggle } from '../components/SettingToggle';
import type { SettingUpdateHandler } from '../types';

export function InteractionSettings({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  return (
    <div className="settings-stack">
      <GroupedSection label="Selection">
        <SettingRow label="Trigger">
          <SegmentedControl<TriggerMode>
            value={settings.triggerMode}
            options={[
              { value: 'click', label: 'Click' },
              { value: 'instant', label: 'Instant' },
            ]}
            onChange={(value) => onUpdate('triggerMode', value)}
          />
        </SettingRow>

        <SettingRow label="Popup style">
          <SegmentedControl<PopupMode>
            value={settings.popupMode}
            options={[
              { value: 'bubble', label: 'Bubble' },
              { value: 'dictionary', label: 'Dictionary' },
            ]}
            onChange={(value) => onUpdate('popupMode', value)}
          />
        </SettingRow>
      </GroupedSection>

      <GroupedSection label="Behavior">
        <SettingToggle
          label="Close on outside click"
          checked={settings.closeOnOutsideClick}
          onCheckedChange={(checked) => onUpdate('closeOnOutsideClick', checked)}
        />
        <SettingToggle
          label="Cache translations"
          checked={settings.cacheEnabled}
          onCheckedChange={(checked) => onUpdate('cacheEnabled', checked)}
        />
      </GroupedSection>
    </div>
  );
}
