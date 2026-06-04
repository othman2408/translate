import { Button, Select } from '@base-ui/react';
import { ArrowRight, Check, ChevronDown, Copy, Loader2, X } from 'lucide-react';
import { useMemo } from 'react';

import { t } from '@/lib/i18n';
import {
  LANGUAGE_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  localizeLanguageOptions,
} from '@/lib/languages';
import type { TranslationResponse } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { useManualTranslation } from '../hooks/useManualTranslation';
import type { SettingUpdateHandler } from '../types';

export function ManualTranslator({
  settings,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onUpdate: SettingUpdateHandler;
}) {
  const {
    clearText,
    copyTranslation,
    isLoading,
    response,
    text,
    trimmedText,
    updateText,
  } = useManualTranslation(settings);
  const sourceDirection = getTextDirection(text, settings.sourceLanguage);
  const translatedText = response?.ok ? response.translatedText : '';
  const translationDirection = getTextDirection(translatedText, settings.targetLanguage);

  const sourceLanguageOptions = useMemo(
    () => localizeLanguageOptions(LANGUAGE_OPTIONS, settings.appLanguage),
    [settings.appLanguage],
  );
  const targetLanguageOptions = useMemo(
    () => localizeLanguageOptions(TARGET_LANGUAGE_OPTIONS, settings.appLanguage),
    [settings.appLanguage],
  );

  return (
    <section className="manual-translator" aria-label={t('manualTranslatorTitle')}>
      <div className="manual-translator__bar">
        <LanguageMiniSelect
          label={t('labelFrom')}
          value={settings.sourceLanguage}
          options={sourceLanguageOptions}
          onValueChange={(sourceLanguage) => onUpdate('sourceLanguage', sourceLanguage)}
        />
        <span className="manual-translator__arrow" aria-hidden="true">
          <ArrowRight size={13} />
        </span>
        <LanguageMiniSelect
          label={t('labelTo')}
          value={settings.targetLanguage}
          options={targetLanguageOptions}
          onValueChange={(targetLanguage) => onUpdate('targetLanguage', targetLanguage)}
        />
      </div>

      <div className="manual-translator__field">
        <textarea
          className="manual-translator__input"
          value={text}
          rows={4}
          spellCheck={false}
          dir={sourceDirection}
          lang={getTextLanguage(settings.sourceLanguage)}
          placeholder={t('manualInputPlaceholder')}
          style={{ textAlign: getTextAlign(sourceDirection) }}
          onChange={(event) => updateText(event.currentTarget.value)}
        />
        {text && (
          <Button
            className="manual-translator__clear"
            type="button"
            aria-label={t('actionClearText')}
            onClick={clearText}
          >
            <X size={13} />
          </Button>
        )}
      </div>

      <div
        className="manual-translator__result"
        data-state={getResultState(trimmedText, response, isLoading)}
        aria-live="polite"
      >
        <div className="manual-translator__result-header">
          <span>{t('manualTranslationLabel')}</span>
          {isLoading && <Loader2 className="manual-translator__spinner" size={13} aria-hidden="true" />}
          {response?.ok && (
            <Button
              className="manual-translator__copy"
              type="button"
              aria-label={t('actionCopyTranslation')}
              onClick={copyTranslation}
            >
              <Copy size={13} />
            </Button>
          )}
        </div>

        <p
          className="manual-translator__result-text"
          dir={response?.ok ? translationDirection : undefined}
          lang={response?.ok ? getTextLanguage(settings.targetLanguage) : undefined}
          style={response?.ok ? { textAlign: getTextAlign(translationDirection) } : undefined}
        >
          {getResultText(trimmedText, response, isLoading)}
        </p>
      </div>
    </section>
  );
}

function LanguageMiniSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ name: string; code: string }>;
  onValueChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.code === value);

  return (
    <Select.Root<string>
      value={value}
      items={options.map((option) => ({ label: option.name, value: option.code }))}
      onValueChange={(nextValue) => {
        if (typeof nextValue === 'string') {
          onValueChange(nextValue);
        }
      }}
    >
      <Select.Trigger className="manual-language-select" aria-label={label}>
        <Select.Value>
          {(selectedValue) => (
            options.find((option) => option.code === selectedValue)?.name
            ?? selectedOption?.name
            ?? value
          )}
        </Select.Value>
        <Select.Icon className="select-trigger__icon">
          <ChevronDown size={13} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="select-positioner"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="select-popup">
            <Select.List className="select-list">
              {options.map((option) => (
                <Select.Item
                  key={option.code}
                  className="select-item"
                  value={option.code}
                  label={option.name}
                >
                  <Select.ItemText>{option.name}</Select.ItemText>
                  <Select.ItemIndicator className="select-item__indicator">
                    <Check size={13} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function getResultState(
  text: string,
  response: TranslationResponse | null,
  isLoading: boolean,
): 'empty' | 'loading' | 'error' | 'success' {
  if (!text) {
    return 'empty';
  }

  if (isLoading) {
    return 'loading';
  }

  if (response?.ok) {
    return 'success';
  }

  if (response && !response.ok) {
    return 'error';
  }

  return 'empty';
}

function getResultText(
  text: string,
  response: TranslationResponse | null,
  isLoading: boolean,
): string {
  if (!text) {
    return t('manualTranslationEmpty');
  }

  if (isLoading && !response) {
    return t('manualTranslating');
  }

  if (response?.ok) {
    return response.translatedText;
  }

  if (response && !response.ok) {
    return response.error.message;
  }

  return t('manualTranslationEmpty');
}
