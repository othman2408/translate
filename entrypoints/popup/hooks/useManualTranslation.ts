import { browser } from '#imports';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';
import type { TranslationResponse } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';

const MANUAL_TRANSLATION_DEBOUNCE_MS = 450;
const MANUAL_TRANSLATION_MAX_LENGTH = 5000;

export function useManualTranslation(settings: ExtensionSettings) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<TranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedText = text.trim();

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
      void browser.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: trimmedText,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage,
        recordHistory: false,
      }).then((nextResponse) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResponse(
          isTranslationResponse(nextResponse)
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
    }, MANUAL_TRANSLATION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [settings.appLanguage, settings.sourceLanguage, settings.targetLanguage, trimmedText]);

  function updateText(nextText: string): void {
    setText(nextText.slice(0, MANUAL_TRANSLATION_MAX_LENGTH));
  }

  async function copyTranslation(): Promise<void> {
    if (!response?.ok) {
      return;
    }

    await navigator.clipboard.writeText(response.translatedText);
  }

  function clearText(): void {
    setText('');
    setResponse(null);
    setIsLoading(false);
    requestIdRef.current += 1;
  }

  return {
    clearText,
    copyTranslation,
    isLoading,
    response,
    text,
    trimmedText,
    updateText,
  };
}

function isTranslationResponse(value: unknown): value is TranslationResponse {
  if (!value || typeof value !== 'object' || !('ok' in value)) {
    return false;
  }

  return value.ok === true || value.ok === false;
}

function getBackgroundUnavailableResponse(appLanguage: ExtensionSettings['appLanguage']): TranslationResponse {
  return {
    ok: false,
    error: {
      code: 'unknown',
      message: t('errorBackgroundUnavailable', undefined, appLanguage),
    },
  };
}
