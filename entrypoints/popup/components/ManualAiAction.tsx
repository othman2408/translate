import { browser } from '#imports';
import { Button } from '@base-ui/react';
import { Copy, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { t, type I18nKey } from '@/lib/i18n';
import type { AiActionResponse, AiActionType, RunAiActionMessage } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

const MANUAL_AI_DEBOUNCE_MS = 450;
const MANUAL_AI_MAX_LENGTH = 5000;

export function ManualAiAction({
  action,
  copyLabelKey,
  language,
  loadingLabelKey,
  prompt,
  resultLabelKey,
  settings,
}: {
  action: AiActionType;
  copyLabelKey: I18nKey;
  language: string;
  loadingLabelKey: I18nKey;
  prompt: string;
  resultLabelKey: I18nKey;
  settings: ExtensionSettings;
}) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<AiActionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedText = text.trim();
  const sourceDirection = getTextDirection(text, 'auto');
  const resultText = response?.ok ? response.resultText : '';
  const resultDirection = getTextDirection(resultText, language);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!trimmedText) {
      setIsLoading(false);
      setResponse(null);
      return;
    }

    setResponse(null);
    setIsLoading(true);

    const timeoutId = window.setTimeout(() => {
      const message: RunAiActionMessage = {
        type: 'RUN_AI_ACTION',
        action,
        text: trimmedText,
        prompt,
        language,
        recordHistory: false,
      };

      void browser.runtime.sendMessage(message).then((nextResponse) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResponse(
          isAiActionResponse(nextResponse)
            ? nextResponse
            : getBackgroundUnavailableResponse(settings.appLanguage),
        );
      }).catch(() => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResponse(getBackgroundUnavailableResponse(settings.appLanguage));
      }).finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
    }, MANUAL_AI_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [action, language, prompt, settings.appLanguage, trimmedText]);

  function updateText(nextText: string): void {
    setText(nextText.slice(0, MANUAL_AI_MAX_LENGTH));
  }

  async function copyResult(): Promise<void> {
    if (!response?.ok) {
      return;
    }

    await navigator.clipboard.writeText(response.resultText);
  }

  function clearText(): void {
    setText('');
    setResponse(null);
    setIsLoading(false);
    requestIdRef.current += 1;
  }

  return (
    <section className="manual-translator manual-ai-action" aria-label={t(resultLabelKey)}>
      <div className="manual-translator__field">
        <textarea
          className="manual-translator__input"
          value={text}
          rows={4}
          spellCheck={false}
          dir={sourceDirection}
          lang={getTextLanguage('auto')}
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
          <span>{t(resultLabelKey)}</span>
          {isLoading && <Loader2 className="manual-translator__spinner" size={13} aria-hidden="true" />}
          {response?.ok && (
            <Button
              className="manual-translator__copy"
              type="button"
              aria-label={t(copyLabelKey)}
              onClick={copyResult}
            >
              <Copy size={13} />
            </Button>
          )}
        </div>

        <p
          className="manual-translator__result-text"
          dir={response?.ok ? resultDirection : undefined}
          lang={response?.ok ? getTextLanguage(language) : undefined}
          style={response?.ok ? { textAlign: getTextAlign(resultDirection) } : undefined}
        >
          {getResultText(trimmedText, response, isLoading, loadingLabelKey)}
        </p>
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

function getResultText(
  text: string,
  response: AiActionResponse | null,
  isLoading: boolean,
  loadingLabelKey: I18nKey,
): string {
  if (!text) {
    return t('manualTranslationEmpty');
  }

  if (isLoading && !response) {
    return t(loadingLabelKey);
  }

  if (response?.ok) {
    return response.resultText;
  }

  if (response && !response.ok) {
    return response.error.message;
  }

  return t('manualTranslationEmpty');
}

function isAiActionResponse(value: unknown): value is AiActionResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) {
    return false;
  }

  return value.ok === true || value.ok === false;
}

function getBackgroundUnavailableResponse(appLanguage: ExtensionSettings['appLanguage']): AiActionResponse {
  return {
    ok: false,
    error: {
      code: 'unknown',
      message: t('errorBackgroundUnavailable', undefined, appLanguage),
    },
  };
}
