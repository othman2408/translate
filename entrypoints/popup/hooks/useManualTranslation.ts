import { browser } from '#imports';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';
import type { GetSelectedTextResponse, TranslationResponse } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';

const MANUAL_TRANSLATION_DEBOUNCE_MS = 450;
const MANUAL_TRANSLATION_MAX_LENGTH = 5000;

export function useManualTranslation(settings: ExtensionSettings) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<TranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const loadedActiveSelectionRef = useRef(false);
  const userEditedTextRef = useRef(false);
  const trimmedText = text.trim();

  useEffect(() => {
    if (loadedActiveSelectionRef.current) {
      return;
    }

    loadedActiveSelectionRef.current = true;
    let active = true;

    void getActiveTabSelection().then((selectedText) => {
      if (active && selectedText && !userEditedTextRef.current) {
        setText(selectedText.slice(0, MANUAL_TRANSLATION_MAX_LENGTH));
      }
    });

    return () => {
      active = false;
    };
  }, []);

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
    userEditedTextRef.current = true;
    setText(nextText.slice(0, MANUAL_TRANSLATION_MAX_LENGTH));
  }

  async function copyTranslation(): Promise<void> {
    if (!response?.ok) {
      return;
    }

    await navigator.clipboard.writeText(response.translatedText);
  }

  function clearText(): void {
    userEditedTextRef.current = true;
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

async function getActiveTabSelection(): Promise<string> {
  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) {
      return '';
    }

    const response = await browser.tabs.sendMessage(activeTab.id, {
      type: 'GET_SELECTED_TEXT',
    }) as GetSelectedTextResponse;

    return response.ok ? response.text.trim() : '';
  } catch {
    return '';
  }
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
