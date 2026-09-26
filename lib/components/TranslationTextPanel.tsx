import { useId, useState } from 'react';
import { useCopyText } from '@/lib/hooks/useCopyText';
import { ReaderPanel } from './ReaderTools';
import { Button } from '@base-ui/react';
import { Check, Copy, Loader2, Maximize2, Volume2, VolumeX, X } from 'lucide-react';

import { t } from '@/lib/i18n';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { TEXT_INPUT_MAX_LENGTH, insertLimitedText } from '@/lib/text-limits';

export function TranslationTextPanel({
  label,
  panelId,
  text,
  language,
  loading,
  reading,
  onRead,
  onExpand,
  expandDisabled = false,
  onChange,
  onCompositionChange,
}: {
  label: string;
  panelId: 'original' | 'translation';
  text: string;
  language: string;
  loading: boolean;
  reading: boolean;
  onRead?: () => void;
  onExpand?: () => void;
  expandDisabled?: boolean;
  onChange: (text: string) => void;
  onCompositionChange: (composing: boolean) => void;
}) {
  const copy = useCopyText(text);
  const [truncated, setTruncated] = useState(false);
  const feedbackId = useId();
  const direction = getTextDirection(text, language);
  return (
    <div className="translation-text-panel">
      <div className="manual-translator__result-header">
        <span>{label}</span>
        {loading && <Loader2 size={13} className="manual-translator__spinner" aria-hidden="true" />}
        <span className="manual-translator__result-actions">
          {onExpand && (
            <Button
              className="manual-translator__icon-button"
              aria-label={t('actionOpenExpanded')}
              title={t('actionOpenExpanded')}
              disabled={expandDisabled}
              onClick={onExpand}
            >
              <Maximize2 size={13} aria-hidden="true" />
            </Button>
          )}
          {text && (
            <>
              {onRead && (
                <Button
                  className="manual-translator__icon-button"
                  aria-label={t(reading ? 'actionStopReading' : 'actionReadText')}
                  title={t(reading ? 'actionStopReading' : 'actionReadText')}
                  aria-pressed={reading}
                  onClick={onRead}
                >
                  {reading ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </Button>
              )}
              <Button
                className="manual-translator__icon-button"
                aria-label={t(copy.status === 'copied' ? 'feedbackCopied' : 'actionCopyText')}
                title={t(copy.status === 'copied' ? 'feedbackCopied' : 'actionCopyText')}
                onClick={() => void copy.copy()}
              >
                {copy.status === 'copied' ? <Check size={13} /> : <Copy size={13} />}
              </Button>
              <Button
                className="manual-translator__icon-button"
                aria-label={t('actionClearText')}
                title={t('actionClearText')}
                onClick={() => { setTruncated(false); onChange(''); }}
              >
                <X size={13} />
              </Button>
            </>
          )}
        </span>
      </div>
      <ReaderPanel label={label} id={panelId} text={text} direction={direction} language={getTextLanguage(language)} editable>
      <textarea
        className="manual-translator__input"
        aria-label={label}
        aria-busy={loading}
        aria-describedby={feedbackId}
        value={text}
        rows={5}
        maxLength={TEXT_INPUT_MAX_LENGTH}
        spellCheck={false}
        dir={direction}
        lang={getTextLanguage(language)}
        style={{ textAlign: getTextAlign(direction) }}
        placeholder={t('manualInputPlaceholder')}
        onPaste={(event) => {
          const input = event.currentTarget;
          const result = insertLimitedText(text, input.selectionStart, input.selectionEnd, event.clipboardData.getData('text/plain'));
          if (result.truncated) {
            event.preventDefault();
            setTruncated(true);
            onChange(result.text);
          } else { setTruncated(false); }
        }}
        onChange={(event) => { setTruncated(false); onChange(event.currentTarget.value); }}
        onCompositionStart={() => onCompositionChange(true)}
        onCompositionEnd={() => onCompositionChange(false)}
      />
      </ReaderPanel>
      <div id={feedbackId} className="manual-translator__feedback">
        <span className="manual-translator__count">{t('textCharacterCount', [text.length.toLocaleString(), TEXT_INPUT_MAX_LENGTH.toLocaleString()])}</span>
        <span role="status">{copy.status === 'copied' ? t('feedbackCopied') : copy.status === 'failed' ? t('feedbackCopyFailed') : ''}</span>
        {truncated && <span role="alert">{t('textPasteTruncated')}</span>}
      </div>
    </div>
  );
}
