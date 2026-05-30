import { storage } from '#imports';

import type { TranslationSuccess } from './messages';

const MAX_CACHE_ENTRIES = 100;

export type TranslationCacheEntry = Pick<
  TranslationSuccess,
  'translatedText' | 'detectedSourceLanguage' | 'targetLanguage'
> & {
  createdAt: number;
};

export type TranslationCache = {
  entries: Record<string, TranslationCacheEntry>;
};

export const translationCacheItem = storage.defineItem<TranslationCache>('local:translationCache', {
  fallback: { entries: {} },
});

export function getCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
  return ['google-v2', sourceLanguage || 'auto', targetLanguage, text.trim()].join('::');
}

export async function getCachedTranslation(key: string): Promise<TranslationCacheEntry | undefined> {
  const cache = await translationCacheItem.getValue();
  return cache.entries[key];
}

export async function setCachedTranslation(
  key: string,
  entry: Omit<TranslationCacheEntry, 'createdAt'>,
): Promise<void> {
  const cache = await translationCacheItem.getValue();
  const entries = {
    ...cache.entries,
    [key]: { ...entry, createdAt: Date.now() },
  };

  const sortedEntries = Object.entries(entries).sort(
    ([, left], [, right]) => right.createdAt - left.createdAt,
  );

  await translationCacheItem.setValue({
    entries: Object.fromEntries(sortedEntries.slice(0, MAX_CACHE_ENTRIES)),
  });
}
