import { Button, Field, Input } from '@base-ui/react';
import { Check, Pencil, Plus, ShieldCheck, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings, TranslationProviderConfig } from '@/lib/settings';

type ProviderDraft = Pick<TranslationProviderConfig, 'name' | 'apiKey'>;

export function ProviderSettings({
  settings,
  onUpdateSettings,
}: {
  settings: ExtensionSettings;
  onUpdateSettings: (settings: ExtensionSettings) => void;
}) {
  const [editingProviderId, setEditingProviderId] = useState<string | 'new' | null>(null);
  const [draftProvider, setDraftProvider] = useState<ProviderDraft>(getEmptyDraft(settings.providers.length));

  useEffect(() => {
    if (editingProviderId === 'new') {
      setDraftProvider(getEmptyDraft(settings.providers.length));
      return;
    }

    const provider = settings.providers.find((item) => item.id === editingProviderId);
    if (provider) {
      setDraftProvider({ name: provider.name, apiKey: provider.apiKey });
    }
  }, [editingProviderId, settings.providers]);

  function startAddingProvider(): void {
    setEditingProviderId('new');
  }

  function startEditingProvider(provider: TranslationProviderConfig): void {
    setDraftProvider({ name: provider.name, apiKey: provider.apiKey });
    setEditingProviderId(provider.id);
  }

  function cancelEditing(): void {
    setEditingProviderId(null);
    setDraftProvider(getEmptyDraft(settings.providers.length));
  }

  function saveProvider(): void {
    const apiKey = draftProvider.apiKey.trim();
    if (!apiKey) {
      return;
    }

    const providerName = draftProvider.name.trim() || getDefaultProviderName(settings.providers.length);
    if (editingProviderId === 'new') {
      const provider = {
        id: createProviderId(),
        type: 'google-v2' as const,
        name: providerName,
        apiKey,
      };
      const providers = [...settings.providers, provider];
      saveProviders(providers, settings.defaultProviderId || provider.id);
      cancelEditing();
      return;
    }

    const providers = settings.providers.map((provider) => (
      provider.id === editingProviderId
        ? { ...provider, name: providerName, apiKey }
        : provider
    ));
    saveProviders(providers, settings.defaultProviderId);
    cancelEditing();
  }

  function deleteProvider(providerId: string): void {
    const providers = settings.providers.filter((provider) => provider.id !== providerId);
    const defaultProviderId = settings.defaultProviderId === providerId
      ? providers[0]?.id ?? ''
      : settings.defaultProviderId;
    saveProviders(providers, defaultProviderId);
    if (editingProviderId === providerId) {
      cancelEditing();
    }
  }

  function setDefaultProvider(providerId: string): void {
    saveProviders(settings.providers, providerId);
  }

  function saveProviders(providers: TranslationProviderConfig[], defaultProviderId: string): void {
    const defaultProvider = providers.find((provider) => provider.id === defaultProviderId) ?? providers[0];
    onUpdateSettings({
      ...settings,
      providers,
      defaultProviderId: defaultProvider?.id ?? '',
      apiKey: defaultProvider?.apiKey ?? '',
    });
  }

  const isEditingNewProvider = editingProviderId === 'new';
  const canSaveDraft = draftProvider.apiKey.trim().length > 0;

  return (
    <div className="settings-stack">
      <div className="provider-global-note">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{t('providerLocalOnlyNote')}</span>
      </div>

      <div className="provider-toolbar">
        <Button
          className="provider-action-button provider-action-button--primary"
          type="button"
          onClick={startAddingProvider}
        >
          <Plus size={14} />
          {t('actionAddProvider')}
        </Button>
      </div>

      {isEditingNewProvider && (
        <ProviderEditor
          draft={draftProvider}
          title={t('actionAddProvider')}
          canSave={canSaveDraft}
          onChange={setDraftProvider}
          onSave={saveProvider}
          onCancel={cancelEditing}
        />
      )}

      {settings.providers.length === 0 && !isEditingNewProvider ? (
        <section className="provider-empty">
          <strong>{t('providerEmptyTitle')}</strong>
          <span>{t('providerEmptyDescription')}</span>
        </section>
      ) : (
        settings.providers.map((provider) => (
          editingProviderId === provider.id ? (
            <ProviderEditor
              key={provider.id}
              draft={draftProvider}
              title={t('actionEditProvider')}
              canSave={canSaveDraft}
              onChange={setDraftProvider}
              onSave={saveProvider}
              onCancel={cancelEditing}
            />
          ) : (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isDefault={provider.id === settings.defaultProviderId}
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

function ProviderCard({
  provider,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  provider: TranslationProviderConfig;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <section className="provider-card" aria-label={provider.name}>
      <div className="provider-card__top">
        <ProviderLogo />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">
            {isDefault ? t('providerDefaultBadge') : t('providerConfigured')}
          </span>
          <h2>{provider.name}</h2>
          <p>{t('providerGoogleDescription')}</p>
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

function ProviderEditor({
  draft,
  title,
  canSave,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ProviderDraft;
  title: string;
  canSave: boolean;
  onChange: (draft: ProviderDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="provider-card" aria-label={title}>
      <div className="provider-card__top">
        <ProviderLogo />
        <div className="provider-card__copy">
          <span className="provider-card__eyebrow">{t('providerGoogleName')}</span>
          <h2>{title}</h2>
          <p>{t('providerGoogleDescription')}</p>
        </div>
      </div>

      <Field.Root className="provider-editor">
        <Field.Label className="setting-label">{t('labelProviderName')}</Field.Label>
        <Input
          className="text-input"
          type="text"
          spellCheck={false}
          value={draft.name}
          onValueChange={(name) => onChange({ ...draft, name })}
        />

        <Field.Label className="setting-label">{t('labelApiKey')}</Field.Label>
        <Field.Description className="setting-description">
          {t('providerApiKeyDescription')}
        </Field.Description>
        <Input
          className="text-input"
          type="password"
          spellCheck={false}
          placeholder={t('inputApiKey')}
          value={draft.apiKey}
          onValueChange={(apiKey) => onChange({ ...draft, apiKey })}
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

function ProviderLogo() {
  return (
    <span className="provider-logo provider-logo--google" aria-hidden="true">
      <img src="/google-logo.svg" alt="" />
    </span>
  );
}

function getEmptyDraft(index: number): ProviderDraft {
  return {
    name: getDefaultProviderName(index),
    apiKey: '',
  };
}

function getDefaultProviderName(index: number): string {
  return index === 0 ? 'Google Translate' : `Google Translate ${index + 1}`;
}

function createProviderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
