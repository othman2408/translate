import { Button } from '@base-ui/react';
import { Copy, Loader2, Volume2, VolumeX, X } from 'lucide-react';

import { t } from '@/lib/i18n';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { MANUAL_TRANSLATION_MAX_LENGTH } from '../hooks/useManualTranslation';

export function TranslationTextPanel({
  label,
  text,
  language,
  loading,
  reading,
  onRead,
  onChange,
  onCompositionChange,
}: {
  label: string;
  text: string;
  language: string;
  loading: boolean;
  reading: boolean;
  onRead?: () => void;
  onChange: (text: string) => void;
  onCompositionChange: (composing: boolean) => void;
}) {
  const direction = getTextDirection(text, language);
  return (
    <div className="translation-text-panel">
      <div className="manual-translator__result-header">
        <span>{label}</span>
        {loading && <Loader2 size={13} className="manual-translator__spinner" aria-hidden="true" />}
        <span className="manual-translator__result-actions">
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
                aria-label={t('actionCopyText')}
                title={t('actionCopyText')}
                onClick={() => void navigator.clipboard.writeText(text).catch(() => undefined)}
              >
                <Copy size={13} />
              </Button>
              <Button
                className="manual-translator__icon-button"
                aria-label={t('actionClearText')}
                title={t('actionClearText')}
                onClick={() => onChange('')}
              >
                <X size={13} />
              </Button>
            </>
          )}
        </span>
      </div>
      <textarea
        className="manual-translator__input"
        aria-label={label}
        aria-busy={loading}
        value={text}
        rows={5}
        maxLength={MANUAL_TRANSLATION_MAX_LENGTH}
        spellCheck={false}
        dir={direction}
        lang={getTextLanguage(language)}
        style={{ textAlign: getTextAlign(direction) }}
        placeholder={t('manualInputPlaceholder')}
        onChange={(event) => onChange(event.currentTarget.value)}
        onCompositionStart={() => onCompositionChange(true)}
        onCompositionEnd={() => onCompositionChange(false)}
      />
    </div>
  );
}
