import { browser } from '#imports';
import { Button, Combobox, Field } from '@base-ui/react';
import { Check, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AiModel } from '@/lib/ai/types';
import { t } from '@/lib/i18n';
import type { ListAiModelsMessage, ListAiModelsResponse } from '@/lib/messages';
import type { AiProviderConfig, AiProviderType } from '@/lib/settings';

type ModelChoice = AiModel & { custom?: boolean };

export function AiModelPicker({
  type,
  apiKey,
  value,
  savedProvider,
  onChange,
}: {
  type: AiProviderType;
  apiKey: string;
  value: string;
  savedProvider?: AiProviderConfig;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const requestId = useRef(0);
  const checkingProvider = useRef(false);
  const savedId =
    savedProvider?.type === type && savedProvider.apiKey === apiKey ? savedProvider.id : undefined;

  const load = useCallback(
    async (message: ListAiModelsMessage) => {
      const id = ++requestId.current;
      checkingProvider.current = !('providerType' in message);
      setLoading(true);
      setError('');
      try {
        const result: ListAiModelsResponse | undefined = await browser.runtime.sendMessage(message);
        if (id !== requestId.current) return;
        if (result?.ok) setModels(result.models);
        else setError(result?.error.message ?? t('modelsLoadError'));
      } catch {
        if (id === requestId.current) setError(t('modelsLoadError'));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (checkingProvider.current) {
      ++requestId.current;
      setLoading(false);
      setError('');
    }
  }, [savedId, apiKey]);

  useEffect(() => {
    setModels([]);
    setQuery('');
    void load({ type: 'LIST_AI_MODELS', providerType: type });
    return () => {
      ++requestId.current;
    };
  }, [type, load]);

  const selected: ModelChoice | null = useMemo(
    () =>
      value ? (models.find((model) => model.id === value) ?? { id: value, name: value }) : null,
    [models, value],
  );
  const search = query.trim().toLowerCase();
  const matches = models.filter((model) =>
    `${model.name} ${model.id}`.toLowerCase().includes(search),
  );
  const choices: ModelChoice[] = matches.slice(0, 100);
  if (
    selected &&
    `${selected.name} ${selected.id}`.toLowerCase().includes(search) &&
    !choices.some((model) => model.id === selected.id)
  ) choices.unshift(selected);
  if (
    query.trim() &&
    !models.some((model) => model.id === query.trim()) &&
    value !== query.trim()
  ) {
    choices.push({ id: query.trim(), name: query.trim(), custom: true });
  }

  return (
    <Field.Root className="model-picker">
      <div className="provider-editor__label-line">
        <Field.Label className="setting-label">{t('labelAiModel')}</Field.Label>
        <Button
          className="provider-setup-link model-picker__refresh"
          disabled={loading}
          title={t(models.length ? 'actionRefreshModels' : 'actionLoadModels')}
          onClick={() => void load({ type: 'LIST_AI_MODELS', providerType: type, refresh: true })}
        >
          {loading ? (
            <Loader2 size={13} className="manual-translator__spinner" />
          ) : (
            <RefreshCw size={13} />
          )}
          {t(models.length ? 'actionRefreshModels' : 'actionLoadModels')}
        </Button>
      </div>
      <Combobox.Root<ModelChoice>
        items={choices}
        filter={null}
        value={selected}
        itemToStringLabel={(model) => model.name}
        itemToStringValue={(model) => model.id}
        isItemEqualToValue={(a, b) => a.id === b.id}
        onInputValueChange={(nextQuery, details) => {
          if (details.reason === 'input-change') setQuery(nextQuery);
        }}
        onValueChange={(model) => {
          if (model) onChange(model.id);
        }}
        onOpenChange={(open) => {
          if (!open) setQuery('');
        }}
      >
        <Combobox.InputGroup className="model-picker__input-group">
          <Combobox.Input className="model-picker__input" placeholder={t('modelSearchPlaceholder')} />
          <Combobox.Trigger
            className="model-picker__trigger"
            aria-label={t('modelsChoose')}
          >
            <ChevronDown size={14} />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner
            className="select-positioner model-picker__positioner"
            sideOffset={6}
            align="start"
            collisionPadding={12}
          >
            <Combobox.Popup className="select-popup model-picker__popup">
              <Combobox.Empty className="model-picker__status">
                {t(loading ? 'modelsLoading' : 'modelsEmpty')}
              </Combobox.Empty>
              <Combobox.List className="select-list">
                {(model: ModelChoice) => (
                  <Combobox.Item
                    className="select-item model-picker__item"
                    key={model.id}
                    value={model}
                  >
                    <span>
                      <span>{model.custom ? t('labelCustomModel') : model.name}</span>
                      {(model.custom || model.name !== model.id) && (
                        <small dir="ltr">{model.id}</small>
                      )}
                    </span>
                    <Combobox.ItemIndicator className="select-item__indicator">
                      <Check size={13} />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
              {matches.length > 100 && <p className="model-picker__status">{t('modelsMore')}</p>}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {apiKey.trim() && (
        <Button
          className="provider-setup-link model-picker__refresh"
          disabled={loading}
          onClick={() => void load({
            type: 'LIST_AI_MODELS',
            refresh: true,
            ...(savedId ? { providerId: savedId } : { credentials: { type, apiKey } }),
          })}
        >
          {t('actionCheckProviderModels')}
        </Button>
      )}
      {error && (
        <p className="model-picker__error" role="status">
          {error}
        </p>
      )}
    </Field.Root>
  );
}
