import { Button } from '@base-ui/react';
import { Copy, Loader2, X } from 'lucide-react';

import { t, type I18nKey } from '@/lib/i18n';
import { MarkdownText } from '@/lib/markdown-text';
import type { AiActionResponse, AiActionType } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { getManualAiResultText, useManualAiAction } from '../hooks/useManualAiAction';

export function ManualAiAction({
  action,
  copyLabelKey,
  enabled,
  language,
  loadingLabelKey,
  prompt,
  resultLabelKey,
  settings,
}: {
  action: AiActionType;
  copyLabelKey: I18nKey;
  enabled: boolean;
  language: string;
  loadingLabelKey: I18nKey;
  prompt: string;
  resultLabelKey: I18nKey;
  settings: ExtensionSettings;
}) {
  const {
    clearText,
    copyResult,
    isLoading,
    response,
    text,
    trimmedText,
    updateText,
  } = useManualAiAction({
    action,
    appLanguage: settings.appLanguage,
    language,
    prompt,
    enabled,
  });
  const sourceDirection = getTextDirection(text, 'auto');
  const resultText = response?.ok ? response.resultText : '';
  const resultDirection = getTextDirection(resultText, language);

  return (
    <section className="manual-translator manual-ai-action" aria-label={t(resultLabelKey)}>
      <div className="manual-translator__field">
        <textarea
          className="manual-translator__input"
          value={text}
          rows={4}
          disabled={!enabled}
          spellCheck={false}
          dir={sourceDirection}
          lang={getTextLanguage('auto')}
          placeholder={t('manualInputPlaceholder')}
          style={{ textAlign: getTextAlign(sourceDirection) }}
          onChange={(event) => updateText(event.currentTarget.value)}
        />
        {text && (
          <span className="manual-translator__field-actions">
            <Button
              className="manual-translator__icon-button"
              type="button"
              aria-label={t('actionClearText')}
              onClick={clearText}
            >
              <X size={13} />
            </Button>
          </span>
        )}
      </div>

      <div
        className="manual-translator__result"
        data-state={getResultState(trimmedText, response, isLoading)}
        aria-live="polite"
      >
        <div className="manual-translator__result-header">
          <span>{t(resultLabelKey)}</span>
          {isLoading && <Loader2 className="manual-translator__spinner" size={13} aria-hidden="true" />}
          {response?.ok && (
            <span className="manual-translator__result-actions">
              <Button
                className="manual-translator__icon-button"
                type="button"
                aria-label={t(copyLabelKey)}
                onClick={copyResult}
              >
                <Copy size={13} />
              </Button>
            </span>
          )}
        </div>

        {response?.ok ? (
          <MarkdownText
            className="manual-translator__result-text manual-translator__markdown"
            dir={resultDirection}
            lang={getTextLanguage(language)}
            style={{ textAlign: getTextAlign(resultDirection) }}
            text={response.resultText}
          />
        ) : (
          <p className="manual-translator__result-text">
            {getManualAiResultText(trimmedText, response, isLoading, loadingLabelKey)}
          </p>
        )}
      </div>
    </section>
  );
}

function getResultState(
  text: string,
  response: AiActionResponse | null,
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
