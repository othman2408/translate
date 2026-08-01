import { browser } from '#imports';
import { useEffect, useRef, useState } from 'react';

import { t, type I18nKey } from '@/lib/i18n';
import type { AiActionResponse, AiActionType, RunAiActionMessage } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';

const MANUAL_AI_DEBOUNCE_MS = 450;
const MANUAL_AI_MAX_LENGTH = 5000;

export function useManualAiAction({
  action,
  appLanguage,
  enabled,
  language,
  prompt,
}: {
  action: AiActionType;
  appLanguage: ExtensionSettings['appLanguage'];
  enabled: boolean;
  language: string;
  prompt: string;
}) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState<AiActionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedText = text.trim();

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!enabled || !trimmedText) {
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
            : getBackgroundUnavailableResponse(appLanguage),
        );
      }).catch(() => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResponse(getBackgroundUnavailableResponse(appLanguage));
      }).finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
    }, MANUAL_AI_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [action, appLanguage, enabled, language, prompt, trimmedText]);

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

  return {
    clearText,
    copyResult,
    isLoading,
    response,
    text,
    trimmedText,
    updateText,
  };
}

export function getManualAiResultText(
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
