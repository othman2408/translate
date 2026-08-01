import { Field } from '@base-ui/react';

import { t } from '@/lib/i18n';
import { TARGET_LANGUAGE_OPTIONS, localizeLanguageOptions } from '@/lib/languages';
import type { ExtensionSettings } from '@/lib/settings';

import { GroupedSection } from '../components/GroupedSection';
import { ManualAiAction } from '../components/ManualAiAction';
import { SettingSelect } from '../components/SettingSelect';
import { SettingToggle } from '../components/SettingToggle';
import type { AiSettingsScreen, SettingUpdateHandler } from '../types';
import { AiProviderSettings } from './AiProviderSettings';

export function AiSettings({
  screen,
  settings,
  onUpdate,
  onUpdateSettings,
}: {
  screen: AiSettingsScreen;
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
  onUpdateSettings: (settings: ExtensionSettings) => void;
}) {
  if (screen === 'ai-behavior') {
    return <AiBehaviorSettings settings={settings} onUpdate={onUpdate} />;
  }

  if (screen === 'ai-rewrite') {
    return <AiRewriteSettings settings={settings} onUpdate={onUpdate} />;
  }

  if (screen === 'ai-explain') {
    return <AiExplainSettings settings={settings} onUpdate={onUpdate} />;
  }

  return <AiProviderSettings settings={settings} onUpdateSettings={onUpdateSettings} />;
}

function AiBehaviorSettings({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  return (
    <div className="settings-stack">
      <GroupedSection label={t('groupBehavior')}>
        <SettingToggle
          label={t('aiRewriteEnabled')}
          checked={settings.aiRewriteEnabled}
          onCheckedChange={(checked) => onUpdate('aiRewriteEnabled', checked)}
        />
        <SettingToggle
          label={t('aiExplainEnabled')}
          checked={settings.aiExplainEnabled}
          onCheckedChange={(checked) => onUpdate('aiExplainEnabled', checked)}
        />
      </GroupedSection>
    </div>
  );
}

function AiRewriteSettings({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  return (
    <div className="settings-stack">
      <ManualAiAction
        action="rewrite"
        copyLabelKey="actionCopyRewrite"
        enabled={settings.aiRewriteEnabled}
        language={settings.aiRewriteLanguage}
        loadingLabelKey="rewritingText"
        prompt={settings.aiRewritePrompt}
        resultLabelKey="labelRewritten"
        settings={settings}
      />

      <GroupedSection label={t('groupAiRewrite')}>
        <SettingSelect
          label={t('labelAiRewriteLanguage')}
          value={settings.aiRewriteLanguage}
          options={localizeLanguageOptions(TARGET_LANGUAGE_OPTIONS, settings.appLanguage)
            .map((option) => ({ value: option.code, label: option.name }))}
          onValueChange={(value) => onUpdate('aiRewriteLanguage', value)}
        />
        <Field.Root className="setting-row setting-row--stacked">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelAiRewritePrompt')}</Field.Label>
            <Field.Description className="setting-description">
              {t('aiProviderPromptDescription')}
            </Field.Description>
          </span>
          <textarea
            className="text-input text-input--textarea"
            value={settings.aiRewritePrompt}
            rows={7}
            spellCheck={false}
            onChange={(event) => onUpdate('aiRewritePrompt', event.currentTarget.value)}
          />
        </Field.Root>
      </GroupedSection>
    </div>
  );
}

function AiExplainSettings({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  return (
    <div className="settings-stack">
      <ManualAiAction
        action="explain"
        copyLabelKey="actionCopyExplanation"
        enabled={settings.aiExplainEnabled}
        language={settings.aiExplanationLanguage}
        loadingLabelKey="explainingText"
        prompt={settings.aiExplainPrompt}
        resultLabelKey="labelExplanation"
        settings={settings}
      />

      <GroupedSection label={t('groupAiExplain')}>
        <SettingSelect
          label={t('labelAiExplanationLanguage')}
          value={settings.aiExplanationLanguage}
          options={localizeLanguageOptions(TARGET_LANGUAGE_OPTIONS, settings.appLanguage)
            .map((option) => ({ value: option.code, label: option.name }))}
          onValueChange={(value) => onUpdate('aiExplanationLanguage', value)}
        />
        <Field.Root className="setting-row setting-row--stacked">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelAiExplainPrompt')}</Field.Label>
            <Field.Description className="setting-description">
              {t('aiExplainPromptDescription')}
            </Field.Description>
          </span>
          <textarea
            className="text-input text-input--textarea"
            value={settings.aiExplainPrompt}
            rows={7}
            spellCheck={false}
            onChange={(event) => onUpdate('aiExplainPrompt', event.currentTarget.value)}
          />
        </Field.Root>
      </GroupedSection>
    </div>
  );
}
