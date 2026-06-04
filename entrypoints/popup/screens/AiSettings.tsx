import { Button, Field, Input } from '@base-ui/react';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { HISTORY_LIMIT_MAX, HISTORY_LIMIT_MIN, clampHistoryLimit } from '@/lib/history';
import { t } from '@/lib/i18n';
import { TARGET_LANGUAGE_OPTIONS, localizeLanguageOptions } from '@/lib/languages';
import {
  DEEPSEEK_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
  type AiProviderConfig,
  type AiProviderType,
  type ExtensionSettings,
} from '@/lib/settings';

import { GroupedSection } from '../components/GroupedSection';
import { ManualAiAction } from '../components/ManualAiAction';
import { ProviderLogo } from '../components/ProviderLogo';
import { ProviderSelect } from '../components/ProviderSelect';
import { SettingSelect } from '../components/SettingSelect';
import { SettingToggle } from '../components/SettingToggle';
import type { AiSettingsScreen, SettingUpdateHandler } from '../types';

type AiProviderDraft = Pick<AiProviderConfig, 'type' | 'name' | 'apiKey' | 'model'>;

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
          label={t('aiEnabled')}
          checked={settings.aiEnabled}
          onCheckedChange={(checked) => onUpdate('aiEnabled', checked)}
        />
        <SettingToggle
          label={t('saveAiHistory')}
          checked={settings.aiHistoryEnabled}
          onCheckedChange={(checked) => onUpdate('aiHistoryEnabled', checked)}
        />
        <Field.Root className="setting-row">
          <span className="setting-row__copy">
            <Field.Label className="setting-label">{t('labelAiHistoryLimit')}</Field.Label>
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
            value={String(settings.aiHistoryLimit)}
            onValueChange={(value) => {
              const parsedValue = Number.parseInt(value, 10);
              if (Number.isFinite(parsedValue)) {
                onUpdate('aiHistoryLimit', clampHistoryLimit(parsedValue));
              }
            }}
          />
        </Field.Root>
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

function AiProviderSettings({
  settings,
  onUpdateSettings,
}: {
  settings: ExtensionSettings;
  onUpdateSettings: (settings: ExtensionSettings) => void;
}) {
  const [editingProviderId, setEditingProviderId] = useState<string | 'new' | null>(null);
  const [draftProvider, setDraftProvider] = useState<AiProviderDraft>(getEmptyDraft(settings.aiProviders.length));

  useEffect(() => {
    if (editingProviderId === 'new') {
      setDraftProvider(getEmptyDraft(settings.aiProviders.length));
      return;
    }

    const provider = settings.aiProviders.find((item) => item.id === editingProviderId);
    if (provider) {
      setDraftProvider({
        type: provider.type,
        name: provider.name,
        apiKey: provider.apiKey,
        model: provider.model,
      });
    }
  }, [editingProviderId, settings.aiProviders]);

  function startAddingProvider(): void {
    setEditingProviderId('new');
  }

  function startEditingProvider(provider: AiProviderConfig): void {
    setDraftProvider({
      type: provider.type,
      name: provider.name,
      apiKey: provider.apiKey,
      model: provider.model,
    });
    setEditingProviderId(provider.id);
  }

  function cancelEditing(): void {
    setEditingProviderId(null);
    setDraftProvider(getEmptyDraft(settings.aiProviders.length));
  }

  function saveProvider(): void {
    const apiKey = draftProvider.apiKey.trim();
    if (!apiKey) {
      return;
    }

    const providerName = draftProvider.name.trim() || getDefaultProviderName(settings.aiProviders.length);
    const model = draftProvider.model.trim() || DEFAULT_AI_MODEL;

    if (editingProviderId === 'new') {
      const provider = {
        id: createProviderId(),
        type: draftProvider.type,
        name: providerName,
        apiKey,
        model,
      };
      const aiProviders = [...settings.aiProviders, provider];
      saveProviders(aiProviders, settings.defaultAiProviderId || provider.id);
      cancelEditing();
      return;
    }

    const aiProviders = settings.aiProviders.map((provider) => (
      provider.id === editingProviderId
        ? { ...provider, type: draftProvider.type, name: providerName, apiKey, model }
        : provider
    ));
    saveProviders(aiProviders, settings.defaultAiProviderId);
    cancelEditing();
  }

  function deleteProvider(providerId: string): void {
    const aiProviders = settings.aiProviders.filter((provider) => provider.id !== providerId);
    const defaultAiProviderId = settings.defaultAiProviderId === providerId
      ? aiProviders[0]?.id ?? ''
      : settings.defaultAiProviderId;
    saveProviders(aiProviders, defaultAiProviderId);
    if (editingProviderId === providerId) {
      cancelEditing();
    }
  }

  function setDefaultProvider(providerId: string): void {
    saveProviders(settings.aiProviders, providerId);
  }

  function saveProviders(aiProviders: AiProviderConfig[], defaultAiProviderId: string): void {
    const defaultProvider = aiProviders.find((provider) => provider.id === defaultAiProviderId) ?? aiProviders[0];
    onUpdateSettings({
      ...settings,
      aiProviders,
      defaultAiProviderId: defaultProvider?.id ?? '',
    });
  }

  const isEditingNewProvider = editingProviderId === 'new';
  const canSaveDraft = draftProvider.apiKey.trim().length > 0;

  return (
    <div className="settings-stack">
      <GroupedSection label={t('groupAiProvider')}>
        <div className="setting-row">
          <span className="setting-row__copy">
            <strong className="setting-label">{t('titleAiProviders')}</strong>
            <span className="setting-description">{t('aiProviderDescription')}</span>
          </span>
          <Button
            className="provider-action-button provider-action-button--compact"
            type="button"
            onClick={startAddingProvider}
          >
            <Plus size={14} />
            {t('actionAddAiProvider')}
          </Button>
        </div>
      </GroupedSection>

      {isEditingNewProvider && (
        <AiProviderEditor
          draft={draftProvider}
          title={t('actionAddAiProvider')}
          canSave={canSaveDraft}
          onChange={setDraftProvider}
          onSave={saveProvider}
          onCancel={cancelEditing}
        />
      )}

      {settings.aiProviders.length === 0 && !isEditingNewProvider ? (
        <section className="provider-empty">
          <strong>{t('aiEmptyTitle')}</strong>
          <span>{t('aiEmptyDescription')}</span>
        </section>
      ) : (
        settings.aiProviders.map((provider) => (
          editingProviderId === provider.id ? (
            <AiProviderEditor
              key={provider.id}
              draft={draftProvider}
              title={t('actionEditProvider')}
              canSave={canSaveDraft}
              onChange={setDraftProvider}
              onSave={saveProvider}
              onCancel={cancelEditing}
            />
          ) : (
            <AiProviderCard
              key={provider.id}
              provider={provider}
              isDefault={provider.id === settings.defaultAiProviderId}
              onEdit={() => startEditingProvider(provider)}
              onDelete={() => deleteProvider(provider.id)}
              onSetDefault={() => setDefaultProvider(provider.id)}
            />
          )
        ))
      )}
    </div>
  );
}

function AiProviderCard({
  provider,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  provider: AiProviderConfig;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <section className="provider-card" aria-label={provider.name}>
      <div className="provider-card__top">
        <ProviderLogo type={provider.type} />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">
            {isDefault ? t('providerDefaultBadge') : t('providerConfigured')}
          </span>
          <h2>{provider.name}</h2>
          <p>{getModelLabel(provider.model)}</p>
        </div>
        <span
          className={isDefault ? 'provider-status provider-status--ready provider-status--icon' : 'provider-status'}
          title={isDefault ? t('providerDefaultBadge') : undefined}
          aria-label={isDefault ? t('providerDefaultBadge') : undefined}
        >
          {isDefault ? <Check size={13} aria-hidden="true" /> : t('providerConfigured')}
        </span>
      </div>

      <div className="provider-actions provider-actions--even">
        {!isDefault && (
          <Button
            className="provider-action-button"
            type="button"
            onClick={onSetDefault}
            title={t('actionSetDefaultProvider')}
            aria-label={t('actionSetDefaultProvider')}
          >
            <Star size={14} />
          </Button>
        )}
        <Button
          className="provider-action-button"
          type="button"
          onClick={onEdit}
          title={t('actionEditProvider')}
          aria-label={t('actionEditProvider')}
        >
          <Pencil size={14} />
        </Button>
        <Button
          className="provider-action-button provider-action-button--danger"
          type="button"
          onClick={onDelete}
          title={t('actionDeleteProvider')}
          aria-label={t('actionDeleteProvider')}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </section>
  );
}

function AiProviderEditor({
  draft,
  title,
  canSave,
  onChange,
  onSave,
  onCancel,
}: {
  draft: AiProviderDraft;
  title: string;
  canSave: boolean;
  onChange: (draft: AiProviderDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="provider-card" aria-label={title}>
      <div className="provider-card__top">
        <ProviderLogo type={draft.type} />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">{t('aiProviderDeepSeekName')}</span>
          <h2>{title}</h2>
          <p>{t('aiProviderDeepSeekDescription')}</p>
        </div>
      </div>

      <Field.Root className="provider-editor">
        <ProviderSelect<AiProviderType>
          label={t('labelAiProvider')}
          value={draft.type}
          options={[{ value: 'deepseek', label: t('aiProviderDeepSeekName') }]}
          onValueChange={(type) => onChange({ ...draft, type, model: DEFAULT_AI_MODEL })}
        />

        <Field.Label className="setting-label">{t('labelProviderName')}</Field.Label>
        <Input
          className="text-input"
          type="text"
          spellCheck={false}
          value={draft.name}
          onValueChange={(name) => onChange({ ...draft, name })}
        />

        <Field.Label className="setting-label">{t('labelApiKey')}</Field.Label>
        <Input
          className="text-input"
          type="password"
          spellCheck={false}
          placeholder="sk-..."
          value={draft.apiKey}
          onValueChange={(apiKey) => onChange({ ...draft, apiKey })}
        />

        <ProviderSelect
          label={t('labelAiModel')}
          value={draft.model}
          options={DEEPSEEK_MODEL_OPTIONS}
          onValueChange={(model) => onChange({ ...draft, model })}
        />
      </Field.Root>

      <div className="provider-actions provider-actions--even">
        <Button
          className="provider-action-button provider-action-button--primary"
          type="button"
          disabled={!canSave}
          onClick={onSave}
        >
          <Check size={14} />
          {t('actionSaveProvider')}
        </Button>
        <Button className="provider-action-button" type="button" onClick={onCancel}>
          <X size={14} />
          {t('actionCancelProvider')}
        </Button>
      </div>
    </section>
  );
}

function getEmptyDraft(index: number): AiProviderDraft {
  return {
    type: 'deepseek',
    name: getDefaultProviderName(index),
    apiKey: '',
    model: DEFAULT_AI_MODEL,
  };
}

function getDefaultProviderName(index: number): string {
  return index === 0 ? 'DeepSeek' : `DeepSeek ${index + 1}`;
}

function getModelLabel(model: string): string {
  return DEEPSEEK_MODEL_OPTIONS.find((option) => option.value === model)?.label ?? model;
}

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
