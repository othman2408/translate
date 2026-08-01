import { Button, Field, Input } from '@base-ui/react';
import { Check, ChevronRight, ExternalLink, Pencil, Plus, ShieldCheck, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { t, type I18nKey } from '@/lib/i18n';
import {
  getAiProviderModelOptions,
  getDefaultAiModel,
  type AiProviderConfig,
  type AiProviderType,
  type ExtensionSettings,
} from '@/lib/settings';

import { ProviderLogo } from '../components/ProviderLogo';
import { ProviderSelect } from '../components/ProviderSelect';

type AiProviderDraft = Pick<AiProviderConfig, 'type' | 'name' | 'apiKey' | 'model'>;

type AiProviderDefinition = {
  type: AiProviderType;
  nameKey: I18nKey;
  descriptionKey: I18nKey;
  apiKeyUrl: string;
  apiKeyPlaceholder: string;
  acceptsCustomModel?: boolean;
};

const AI_PROVIDER_DEFINITIONS: readonly AiProviderDefinition[] = [
  {
    type: 'deepseek',
    nameKey: 'aiProviderDeepSeekName',
    descriptionKey: 'aiProviderDeepSeekDescription',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    type: 'openrouter',
    nameKey: 'aiProviderOpenRouterName',
    descriptionKey: 'aiProviderOpenRouterDescription',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    apiKeyPlaceholder: 'sk-or-v1-...',
    acceptsCustomModel: true,
  },
  {
    type: 'kimi',
    nameKey: 'aiProviderKimiName',
    descriptionKey: 'aiProviderKimiDescription',
    apiKeyUrl: 'https://platform.moonshot.ai/console/api-keys',
    apiKeyPlaceholder: 'sk-...',
  },
] as const;

export function AiProviderSettings({
  settings,
  onUpdateSettings,
}: {
  settings: ExtensionSettings;
  onUpdateSettings: (settings: ExtensionSettings) => void;
}) {
  const [editingProviderId, setEditingProviderId] = useState<string | 'new' | null>(null);
  const [choosingProvider, setChoosingProvider] = useState(false);
  const [draftProvider, setDraftProvider] = useState<AiProviderDraft>(() => createDraft('deepseek'));

  useEffect(() => {
    if (!editingProviderId || editingProviderId === 'new') {
      return;
    }

    const provider = settings.aiProviders.find((item) => item.id === editingProviderId);
    if (provider) {
      setDraftProvider(toDraft(provider));
    }
  }, [editingProviderId, settings.aiProviders]);

  function startAddingProvider(): void {
    setEditingProviderId(null);
    setChoosingProvider(true);
  }

  function chooseProvider(type: AiProviderType): void {
    setDraftProvider(createDraft(type));
    setEditingProviderId('new');
    setChoosingProvider(false);
  }

  function startEditingProvider(provider: AiProviderConfig): void {
    setDraftProvider(toDraft(provider));
    setEditingProviderId(provider.id);
    setChoosingProvider(false);
  }

  function cancelEditing(): void {
    setEditingProviderId(null);
    setChoosingProvider(false);
  }

  function saveProvider(): void {
    const apiKey = draftProvider.apiKey.trim();
    if (!apiKey || !editingProviderId) {
      return;
    }

    const sameTypeCount = settings.aiProviders.filter((provider) => provider.type === draftProvider.type).length;
    const providerName = draftProvider.name.trim() || getDefaultProviderName(draftProvider.type, sameTypeCount);
    const model = draftProvider.model.trim() || getDefaultAiModel(draftProvider.type);

    if (editingProviderId === 'new') {
      const provider: AiProviderConfig = {
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
        ? { ...provider, name: providerName, apiKey, model }
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

  function saveProviders(aiProviders: AiProviderConfig[], defaultAiProviderId: string): void {
    const defaultProvider = aiProviders.find((provider) => provider.id === defaultAiProviderId) ?? aiProviders[0];
    onUpdateSettings({
      ...settings,
      aiProviders,
      defaultAiProviderId: defaultProvider?.id ?? '',
    });
  }

  const canSaveDraft = draftProvider.apiKey.trim().length > 0 && draftProvider.model.trim().length > 0;
  const isIdle = editingProviderId === null && !choosingProvider;

  return (
    <div className="settings-stack">
      <div className="provider-global-note">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{t('aiLocalOnlyNote')}</span>
      </div>

      {settings.aiProviders.length > 0 && isIdle && (
        <div className="provider-toolbar">
          <Button
            className="provider-action-button provider-action-button--primary"
            type="button"
            onClick={startAddingProvider}
          >
            <Plus size={14} />
            {t('actionAddAiProvider')}
          </Button>
        </div>
      )}

      {choosingProvider && (
        <ProviderPicker onChoose={chooseProvider} onCancel={cancelEditing} />
      )}

      {editingProviderId === 'new' && (
        <AiProviderEditor
          draft={draftProvider}
          title={t('actionAddAiProvider')}
          canSave={canSaveDraft}
          onChange={setDraftProvider}
          onSave={saveProvider}
          onCancel={cancelEditing}
        />
      )}

      {settings.aiProviders.length === 0 && isIdle ? (
        <section className="provider-empty">
          <strong>{t('aiEmptyTitle')}</strong>
          <span>{t('aiEmptyDescription')}</span>
          <Button
            className="provider-action-button provider-action-button--primary"
            type="button"
            onClick={startAddingProvider}
          >
            <Plus size={14} />
            {t('actionAddAiProvider')}
          </Button>
        </section>
      ) : (
        !choosingProvider && editingProviderId !== 'new' && settings.aiProviders.map((provider) => (
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
              onSetDefault={() => saveProviders(settings.aiProviders, provider.id)}
            />
          )
        ))
      )}
    </div>
  );
}

function ProviderPicker({
  onChoose,
  onCancel,
}: {
  onChoose: (type: AiProviderType) => void;
  onCancel: () => void;
}) {
  return (
    <section className="provider-picker" aria-label={t('titleChooseAiProvider')}>
      <div className="provider-picker__header">
        <div>
          <strong>{t('titleChooseAiProvider')}</strong>
          <span>{t('aiProviderPickerDescription')}</span>
        </div>
        <Button
          className="plain-button provider-picker__close"
          type="button"
          title={t('actionCancelProvider')}
          aria-label={t('actionCancelProvider')}
          onClick={onCancel}
        >
          <X size={15} />
        </Button>
      </div>

      <div className="provider-picker__list">
        {AI_PROVIDER_DEFINITIONS.map((provider) => (
          <Button
            key={provider.type}
            className="provider-choice"
            type="button"
            onClick={() => onChoose(provider.type)}
          >
            <ProviderLogo type={provider.type} />
            <span className="provider-choice__copy">
              <strong>{t(provider.nameKey)}</strong>
              <span>{t(provider.descriptionKey)}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        ))}
      </div>
    </section>
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
  const definition = getProviderDefinition(provider.type);

  return (
    <section className="provider-card" aria-label={provider.name}>
      <div className="provider-card__top">
        <ProviderLogo type={provider.type} />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">{t(definition.nameKey)}</span>
          <h2>{provider.name}</h2>
          <p>{getModelLabel(provider.type, provider.model)}</p>
        </div>
        {isDefault && (
          <span
            className="provider-status provider-status--ready provider-status--icon"
            title={t('providerDefaultBadge')}
            aria-label={t('providerDefaultBadge')}
          >
            <Check size={13} aria-hidden="true" />
          </span>
        )}
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
  const definition = getProviderDefinition(draft.type);
  const modelOptions = getAiProviderModelOptions(draft.type);

  return (
    <section className="provider-card" aria-label={title}>
      <div className="provider-card__top">
        <ProviderLogo type={draft.type} />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">{t(definition.nameKey)}</span>
          <h2>{title}</h2>
          <p>{t(definition.descriptionKey)}</p>
        </div>
      </div>

      <Field.Root className="provider-editor">
        <div className="provider-editor__label-line">
          <Field.Label className="setting-label">{t('labelApiKey')}</Field.Label>
          <a
            className="provider-setup-link"
            href={definition.apiKeyUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('actionGetApiKey')}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
        <Input
          className="text-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={definition.apiKeyPlaceholder}
          value={draft.apiKey}
          onValueChange={(apiKey) => onChange({ ...draft, apiKey })}
        />

        <Field.Label className="setting-label">{t('labelProviderNameOptional')}</Field.Label>
        <Input
          className="text-input"
          type="text"
          spellCheck={false}
          placeholder={t(definition.nameKey)}
          value={draft.name}
          onValueChange={(name) => onChange({ ...draft, name })}
        />

        {definition.acceptsCustomModel ? (
          <>
            <Field.Label className="setting-label">{t('labelAiModel')}</Field.Label>
            <Field.Description className="setting-description">
              {t('aiProviderOpenRouterModelDescription')}
            </Field.Description>
            <Input
              className="text-input"
              type="text"
              list="openrouter-model-options"
              spellCheck={false}
              value={draft.model}
              onValueChange={(model) => onChange({ ...draft, model })}
            />
            <datalist id="openrouter-model-options">
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </>
        ) : (
          <ProviderSelect
            label={t('labelAiModel')}
            value={draft.model}
            options={modelOptions}
            onValueChange={(model) => onChange({ ...draft, model })}
          />
        )}
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

function getProviderDefinition(type: AiProviderType): AiProviderDefinition {
  return AI_PROVIDER_DEFINITIONS.find((provider) => provider.type === type)!;
}

function createDraft(type: AiProviderType): AiProviderDraft {
  return {
    type,
    name: '',
    apiKey: '',
    model: getDefaultAiModel(type),
  };
}

function toDraft(provider: AiProviderConfig): AiProviderDraft {
  return {
    type: provider.type,
    name: provider.name,
    apiKey: provider.apiKey,
    model: provider.model,
  };
}

function getDefaultProviderName(type: AiProviderType, sameTypeCount: number): string {
  const name = t(getProviderDefinition(type).nameKey);
  return sameTypeCount === 0 ? name : `${name} ${sameTypeCount + 1}`;
}

function getModelLabel(type: AiProviderType, model: string): string {
  return getAiProviderModelOptions(type).find((option) => option.value === model)?.label ?? model;
}

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
