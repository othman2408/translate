import { useCallback, useEffect, useRef, useState } from 'react';

import { getTextDirection } from './text-direction';

export type SpeechTarget = 'original' | 'result';

export function useTextToSpeech() {
  const [activeTarget, setActiveTarget] = useState<SpeechTarget | undefined>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, [isSupported]);

  const clearCurrentUtterance = useCallback(() => {
    if (!currentUtteranceRef.current) {
      return;
    }

    currentUtteranceRef.current.onend = null;
    currentUtteranceRef.current.onerror = null;
    currentUtteranceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearCurrentUtterance();

    if (isSupported) {
      window.speechSynthesis.cancel();
    }

    setActiveTarget(undefined);
  }, [clearCurrentUtterance, isSupported]);

  const toggle = useCallback((
    target: SpeechTarget,
    text: string,
    language?: string,
  ) => {
    const nextText = text.trim();
    if (!isSupported || !nextText) {
      return;
    }

    if (activeTarget === target) {
      stop();
      return;
    }

    const speechLanguage = getSpeechLanguage(nextText, language);
    const voice = findVoice(voices, speechLanguage);
    const utterance = new SpeechSynthesisUtterance(nextText);

    utterance.lang = voice?.lang ?? speechLanguage;
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => {
      if (currentUtteranceRef.current !== utterance) {
        return;
      }

      currentUtteranceRef.current = null;
      setActiveTarget(undefined);
    };
    utterance.onerror = () => {
      if (currentUtteranceRef.current !== utterance) {
        return;
      }

      currentUtteranceRef.current = null;
      setActiveTarget(undefined);
    };

    clearCurrentUtterance();
    window.speechSynthesis.cancel();
    currentUtteranceRef.current = utterance;
    setActiveTarget(target);
    window.speechSynthesis.speak(utterance);
  }, [activeTarget, clearCurrentUtterance, isSupported, stop, voices]);

  useEffect(() => stop, [stop]);

  return { activeTarget, isSupported, stop, toggle };
}

function findVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null {
  const normalizedLanguage = language.toLowerCase();
  const languagePrefix = normalizedLanguage.split('-')[0];

  return voices.find((voice) => voice.lang.toLowerCase() === normalizedLanguage)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`))
    ?? null;
}

function getSpeechLanguage(text: string, language?: string): string {
  if (language && language !== 'auto') {
    return normalizeLanguage(language);
  }

  return getTextDirection(text) === 'rtl' ? 'ar-SA' : 'en-US';
}

function normalizeLanguage(language: string): string {
  const fallbacks: Record<string, string> = {
    ar: 'ar-SA',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-BR',
    ru: 'ru-RU',
    'zh-cn': 'zh-CN',
    'zh-tw': 'zh-TW',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    hi: 'hi-IN',
    tr: 'tr-TR',
    nl: 'nl-NL',
    sv: 'sv-SE',
    pl: 'pl-PL',
    id: 'id-ID',
    ur: 'ur-PK',
  };
  const normalizedLanguage = language.toLowerCase();
  const baseLanguage = normalizedLanguage.split('-')[0];

  return fallbacks[normalizedLanguage]
    ?? (baseLanguage ? fallbacks[baseLanguage] : undefined)
    ?? language;
}
