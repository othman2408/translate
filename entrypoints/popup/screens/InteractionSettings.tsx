import { Button, Field, Input } from '@base-ui/react';
import { RotateCcw } from 'lucide-react';

import { t } from '@/lib/i18n';
import {
  RESULT_POPUP_SIZE_LIMITS,
  normalizeResultPopupSize,
  type ExtensionSettings,
  type PopupMode,
  type ReaderModeSize,
  type ResultPopupSize,
  type TriggerMode,
} from '@/lib/settings';

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
  function updatePopupSize(key: keyof ResultPopupSize, value: string): void {
    const parsedValue = Number.parseInt(value, 10);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    onUpdate('resultPopupSize', normalizeResultPopupSize({
      ...settings.resultPopupSize,
      [key]: parsedValue,
    }));
  }

  function resetPopupSize(): void {
    onUpdate('resultPopupSize', {
      width: RESULT_POPUP_SIZE_LIMITS.defaultWidth,
      height: RESULT_POPUP_SIZE_LIMITS.defaultHeight,
    });
  }

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
        <SettingToggle
          label={t('closeOnOutsideClick')}
          checked={settings.closeOnOutsideClick}
          onCheckedChange={(checked) => onUpdate('closeOnOutsideClick', checked)}
        />
      </GroupedSection>

      <GroupedSection label={t('groupPopupSize')}>
        <Field.Root className="setting-row">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelPopupWidth')}</Field.Label>
          </span>
          <Input
            className="number-input"
            type="number"
            min={RESULT_POPUP_SIZE_LIMITS.minWidth}
            step={1}
            value={String(settings.resultPopupSize.width)}
            onValueChange={(value) => updatePopupSize('width', value)}
          />
        </Field.Root>

        <Field.Root className="setting-row">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelPopupHeight')}</Field.Label>
          </span>
          <Input
            className="number-input"
            type="number"
            min={RESULT_POPUP_SIZE_LIMITS.minHeight}
            step={1}
            value={String(settings.resultPopupSize.height)}
            onValueChange={(value) => updatePopupSize('height', value)}
          />
        </Field.Root>

        <SettingRow label={t('labelReaderSize')}>
          <SegmentedControl<ReaderModeSize>
            value={settings.readerModeSize}
            options={[
              { value: 'medium', label: t('optionReaderMedium') },
              { value: 'large', label: t('optionReaderLarge') },
              { value: 'full', label: t('optionReaderFull') },
            ]}
            onChange={(value) => onUpdate('readerModeSize', value)}
          />
        </SettingRow>

        <div className="setting-row">
          <span className="setting-row__copy">
            <strong className="setting-label">{t('actionResetPopupSize')}</strong>
          </span>
          <Button className="secondary-soft-button" type="button" onClick={resetPopupSize}>
            <RotateCcw size={14} />
            {t('actionResetPopupSize')}
          </Button>
        </div>
      </GroupedSection>
    </div>
  );
}
