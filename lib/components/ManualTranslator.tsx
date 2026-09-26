import { Select } from '@base-ui/react';
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { openTranslationReader } from '@/lib/reader-handoff';
import type { TranslationDraft } from '@/lib/translation-draft';

import { t } from '@/lib/i18n';
import {
  LANGUAGE_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  getLanguageName,
  localizeLanguageOptions,
} from '@/lib/languages';
import type { ExtensionSettings, SettingUpdateHandler } from '@/lib/settings';
import { useTextToSpeech } from '@/lib/use-text-to-speech';

import { useManualTranslation } from '../hooks/useManualTranslation';
import { TranslationTextPanel } from './TranslationTextPanel';

export function ManualTranslator({
  settings,
  onUpdate,
  expanded = false,
  initialDraft,
  onDraftChange,
}: {
  settings: ExtensionSettings;
  expanded?: boolean;
  initialDraft?: TranslationDraft;
  onDraftChange?: (draft: TranslationDraft) => void;
  onUpdate: SettingUpdateHandler;
}) {
  const translator = useManualTranslation(settings, initialDraft, !expanded);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const { texts, sourceLanguage, editedSide, response, isLoading } = translator;
  const speech = useTextToSpeech();
  useEffect(() => { onDraftChange?.(translator.draft); }, [onDraftChange, texts, translator.draft.edit, response, translator.draft.requestKey]);
  const sourceOptions = useMemo(
    () => localizeLanguageOptions(LANGUAGE_OPTIONS, settings.appLanguage),
    [settings.appLanguage],
  );
  const targetOptions = useMemo(
    () => localizeLanguageOptions(TARGET_LANGUAGE_OPTIONS, settings.appLanguage),
    [settings.appLanguage],
  );

  useEffect(() => {
    speech.stop();
  }, [speech.stop, texts.source, texts.target, sourceLanguage, settings.targetLanguage]);

  const readerAction = {
    onExpand: expanded ? undefined : () => {
      setOpening(true);
      setOpenError(false);
      void openTranslationReader(translator.draft, settings)
        .then(() => window.close())
        .catch(() => { setOpenError(true); setOpening(false); });
    },
    expandDisabled: opening || translator.selectionLoading || !translator.draft.edit.text.trim(),
  };

  let statusMessage = '';
  if (openError) {
    statusMessage = t('errorOpenExpanded');
  } else if (response?.ok === false) {
    statusMessage = response.error.message;
  } else if (isLoading) {
    statusMessage = t('manualTranslating');
  } else if (response?.ok && response.fromCache) {
    statusMessage = t('footerCached');
  }

  return (
    <section className={`manual-translator${expanded ? ' manual-translator--expanded' : ''}`} aria-label={t('manualTranslatorTitle')}>
      <div className="manual-translator__bar">
        <div className="manual-language-control">
          <LanguageMiniSelect
            label={t('labelFrom')}
            value={settings.sourceLanguage}
            options={sourceOptions}
            onValueChange={(value) => onUpdate('sourceLanguage', value)}
          />
          {editedSide === 'target' && settings.sourceLanguage === 'auto' && (
            <span className="manual-translator__destination">
              {t('manualReverseDestination', getLanguageName(settings.preferredLanguage))}
            </span>
          )}
        </div>
        <span className="manual-translator__arrow" aria-hidden="true">
          {editedSide === 'source' ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
        </span>
        <LanguageMiniSelect
          label={t('labelTo')}
          value={settings.targetLanguage}
          options={targetOptions}
          onValueChange={(value) => onUpdate('targetLanguage', value)}
        />
      </div>
      <div className="reader-panels">
        <TranslationTextPanel
          {...readerAction}
          panelId="original"
          label={t('labelOriginal')}
          text={texts.source}
          language={sourceLanguage}
          loading={isLoading && editedSide === 'target'}
          reading={speech.activeTarget === 'original'}
          onRead={
            speech.isSupported
              ? () => speech.toggle('original', texts.source, sourceLanguage)
              : undefined
          }
          onChange={(text) => translator.updateText('source', text)}
          onCompositionChange={translator.setComposing}
        />
        <TranslationTextPanel
          {...readerAction}
          panelId="translation"
          label={t('manualTranslationLabel')}
          text={texts.target}
          language={settings.targetLanguage}
          loading={isLoading && editedSide === 'source'}
          reading={speech.activeTarget === 'result'}
          onRead={
            speech.isSupported
              ? () => speech.toggle('result', texts.target, settings.targetLanguage)
              : undefined
          }
          onChange={(text) => translator.updateText('target', text)}
          onCompositionChange={translator.setComposing}
        />
      </div>
      <div
        className="manual-translator__status"
        role={openError ? 'alert' : 'status'}
        data-error={openError || response?.ok === false || undefined}
      >
        {statusMessage}
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
          {(selectedValue) =>
            options.find((option) => option.code === selectedValue)?.name ??
            selectedOption?.name ??
            value
          }
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
