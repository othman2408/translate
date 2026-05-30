import { LANGUAGE_OPTIONS, TARGET_LANGUAGE_OPTIONS } from '@/lib/languages';
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
  return (
    <div className="settings-stack">
      <GroupedSection label="Languages">
        <SettingSelect
          label="From"
          value={settings.sourceLanguage}
          options={LANGUAGE_OPTIONS}
          onValueChange={(value) => onUpdate('sourceLanguage', value)}
        />
        <SettingSelect
          label="To"
          value={settings.targetLanguage}
          options={TARGET_LANGUAGE_OPTIONS}
          onValueChange={(value) => onUpdate('targetLanguage', value)}
        />
      </GroupedSection>

      <p className="quiet-note">
        Only selected text is sent to the translation provider.
      </p>
    </div>
  );
}
