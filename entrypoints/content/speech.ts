import { useCallback, useEffect, useRef, useState } from 'react';

import { getTextDirection } from '@/lib/text-direction';

export type SpeechTarget = 'original' | 'result';

export function useTextToSpeech() {
  const [activeTarget, setActiveTarget] = useState<SpeechTarget | undefined>();
  const requestIdRef = useRef(0);
  const isSupported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';
  const voices = useSpeechVoices(isSupported);

  const stop = useCallback(() => {
    if (!isSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    requestIdRef.current += 1;
    setActiveTarget(undefined);
  }, [isSupported]);

  const toggle = useCallback(async (
    target: SpeechTarget,
    text: string,
    language?: string,
  ) => {
    const normalizedText = text.trim();
    if (!isSupported || !normalizedText) {
      return;
    }

    if (activeTarget === target) {
      stop();
      return;
    }

    window.speechSynthesis.cancel();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const speechLanguage = getSpeechLanguage(text, language);
    const availableVoices = await resolveSpeechVoices(voices);
    if (requestId !== requestIdRef.current) {
      return;
    }

    const voice = findSpeechVoice(speechLanguage, availableVoices);
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = voice?.lang ?? speechLanguage;
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => setActiveTarget(undefined);
    utterance.onerror = () => setActiveTarget(undefined);
    setActiveTarget(target);
    window.speechSynthesis.speak(utterance);
  }, [activeTarget, isSupported, stop, voices]);

  useEffect(() => stop, [stop]);

  return { activeTarget, isSupported, stop, toggle };
}

function useSpeechVoices(isSupported: boolean): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, [isSupported]);

  return voices;
}

function resolveSpeechVoices(currentVoices: SpeechSynthesisVoice[]): Promise<SpeechSynthesisVoice[]> {
  if (currentVoices.length > 0) {
    return Promise.resolve(currentVoices);
  }

  const loadedVoices = window.speechSynthesis.getVoices();
  if (loadedVoices.length > 0) {
    return Promise.resolve(loadedVoices);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 700);

    const handleVoicesChanged = () => {
      window.clearTimeout(timeoutId);
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  });
}

function findSpeechVoice(language: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const normalizedLanguage = normalizeSpeechLanguage(language).toLowerCase();
  const languagePrefix = normalizedLanguage.split('-')[0];

  return voices.find((voice) => voice.lang.toLowerCase() === normalizedLanguage)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`))
    ?? null;
}

function getSpeechLanguage(text: string, language?: string): string {
  if (language && language !== 'auto') {
    return normalizeSpeechLanguage(language);
  }

  return getTextDirection(text) === 'rtl' ? 'ar-SA' : 'en-US';
}

function normalizeSpeechLanguage(language: string): string {
  const normalizedLanguage = language.toLowerCase();
  const speechLanguageFallbacks: Record<string, string> = {
    ar: 'ar-SA',
    de: 'de-DE',
    en: 'en-US',
    es: 'es-ES',
    fa: 'fa-IR',
    fr: 'fr-FR',
    he: 'he-IL',
    hi: 'hi-IN',
    id: 'id-ID',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    nl: 'nl-NL',
    pl: 'pl-PL',
    pt: 'pt-BR',
    ru: 'ru-RU',
    sv: 'sv-SE',
    tr: 'tr-TR',
    ur: 'ur-PK',
    'zh-cn': 'zh-CN',
    'zh-tw': 'zh-TW',
    zh: 'zh-CN',
  };

  return speechLanguageFallbacks[normalizedLanguage]
    ?? speechLanguageFallbacks[normalizedLanguage.split('-')[0]]
    ?? language;
}
