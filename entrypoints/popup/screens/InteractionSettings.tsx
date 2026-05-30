import { t } from '@/lib/i18n';
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
      <GroupedSection label={t('groupSelection')}>
        <SettingRow label={t('labelTrigger')}>
          <SegmentedControl<TriggerMode>
            value={settings.triggerMode}
            options={[
              { value: 'click', label: t('optionClick') },
              { value: 'instant', label: t('optionInstant') },
            ]}
            onChange={(value) => onUpdate('triggerMode', value)}
          />
        </SettingRow>

        <SettingRow label={t('labelPopupStyle')}>
          <SegmentedControl<PopupMode>
            value={settings.popupMode}
            options={[
              { value: 'bubble', label: t('optionBubble') },
              { value: 'dictionary', label: t('optionDictionary') },
            ]}
            onChange={(value) => onUpdate('popupMode', value)}
          />
        </SettingRow>
      </GroupedSection>

      <GroupedSection label={t('groupBehavior')}>
        <SettingToggle
          label={t('closeOnOutsideClick')}
          checked={settings.closeOnOutsideClick}
          onCheckedChange={(checked) => onUpdate('closeOnOutsideClick', checked)}
        />
        <SettingToggle
          label={t('cacheTranslations')}
          checked={settings.cacheEnabled}
          onCheckedChange={(checked) => onUpdate('cacheEnabled', checked)}
        />
      </GroupedSection>
    </div>
  );
}
