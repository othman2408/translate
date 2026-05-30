import { storage } from '#imports';

import type { TranslationSuccess } from './messages';
import type { ProviderType } from './settings';

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

export type TranslationCacheKeyParts = {
  providerId: string;
  providerType: ProviderType;
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
};

export const translationCacheItem = storage.defineItem<TranslationCache>('local:translationCache', {
  fallback: { entries: {} },
});

export function getCacheKey(parts: TranslationCacheKeyParts): string {
  return [
    parts.providerType,
    parts.providerId,
    parts.sourceLanguage || 'auto',
    parts.targetLanguage,
    parts.text.trim(),
  ].join('::');
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
