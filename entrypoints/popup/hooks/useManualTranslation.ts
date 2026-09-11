import { browser } from '#imports';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';
import type { GetSelectedTextResponse, TranslationResponse } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';

export type TranslationSide = 'source' | 'target';
export const MANUAL_TRANSLATION_MAX_LENGTH = 5000;

export function getManualLanguages(side: TranslationSide, settings: ExtensionSettings) {
  return side === 'source'
    ? { sourceLanguage: settings.sourceLanguage, targetLanguage: settings.targetLanguage }
    : {
        sourceLanguage: settings.targetLanguage,
        targetLanguage:
          settings.sourceLanguage === 'auto' ? settings.preferredLanguage : settings.sourceLanguage,
      };
}

export function useManualTranslation(settings: ExtensionSettings) {
  const [texts, setTexts] = useState({ source: '', target: '' });
  // Only a user edit changes this input; returned translations never do.
  const [edit, setEdit] = useState({ side: 'source' as TranslationSide, text: '' });
  const [response, setResponse] = useState<TranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const requestIdRef = useRef(0);
  const userEditedRef = useRef(false);
  const selectionRef = useRef<Promise<string> | null>(null);
  const languages = getManualLanguages(edit.side, settings);
  const providerKey = JSON.stringify([
    settings.defaultProviderId,
    settings.providers,
    settings.providerFallbackEnabled,
  ]);

  useEffect(() => {
    let active = true;
    selectionRef.current ??= getActiveTabSelection();
    void selectionRef.current.then((selection) => {
      if (!active || !selection || userEditedRef.current) return;
      const text = selection.slice(0, MANUAL_TRANSLATION_MAX_LENGTH);
      setTexts({ source: text, target: '' });
      setEdit({ side: 'source', text });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const text = edit.text.trim();
    const opposite = edit.side === 'source' ? 'target' : 'source';
    setResponse(null);
    setIsLoading(Boolean(text) && !isComposing);
    if (!text || isComposing) return;

    const accept = (result: TranslationResponse) => {
      if (requestId !== requestIdRef.current) return;
      setResponse(result);
      setIsLoading(false);
      if (result.ok) setTexts((current) => ({ ...current, [opposite]: result.translatedText }));
    };

    if (languages.sourceLanguage === languages.targetLanguage) {
      accept({
        ok: true,
        translatedText: edit.text,
        targetLanguage: languages.targetLanguage,
        fromCache: false,
      });
      return;
    }

    const timer = window.setTimeout(() => {
      if (requestId !== requestIdRef.current) return;
      void browser.runtime
        .sendMessage({
          type: 'TRANSLATE_TEXT',
          text,
          ...languages,
          recordHistory: false,
        })
        .then((result: TranslationResponse | undefined) => {
          accept(result && typeof result.ok === 'boolean' ? result : unavailable());
        })
        .catch(() => accept(unavailable()));
    }, 450);

    function unavailable(): TranslationResponse {
      return {
        ok: false,
        error: {
          code: 'unknown',
          message: t('errorBackgroundUnavailable', undefined, settings.appLanguage),
        },
      };
    }

    return () => {
      window.clearTimeout(timer);
      ++requestIdRef.current;
    };
  }, [
    edit,
    isComposing,
    languages.sourceLanguage,
    languages.targetLanguage,
    providerKey,
    settings.appLanguage,
  ]);

  function updateText(side: TranslationSide, value: string) {
    userEditedRef.current = true;
    ++requestIdRef.current;
    const text = value.slice(0, MANUAL_TRANSLATION_MAX_LENGTH);
    setTexts(side === 'source' ? { source: text, target: '' } : { source: '', target: text });
    setResponse(null);
    setIsLoading(Boolean(text.trim()) && !isComposing);
    setEdit({ side, text });
  }

  function setComposing(composing: boolean) {
    ++requestIdRef.current;
    setIsComposing(composing);
  }

  const detectedLanguage = response?.ok ? response.detectedSourceLanguage : undefined;
  const sourceLanguage = edit.side === 'target'
    ? languages.targetLanguage
    : detectedLanguage ?? settings.sourceLanguage;

  return {
    texts,
    sourceLanguage,
    editedSide: edit.side,
    isLoading,
    response,
    updateText,
    setComposing,
  };
}

async function getActiveTabSelection(): Promise<string> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return '';
    const result = (await browser.tabs.sendMessage(tab.id, {
      type: 'GET_SELECTED_TEXT',
    })) as GetSelectedTextResponse;
    return result.ok ? result.text.trim() : '';
  } catch {
    return '';
  }
}
