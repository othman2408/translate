import { storage } from '#imports';

import type { AiActionSuccess, AiActionType, TranslationSuccess } from './messages';
import type { AiProviderType, ProviderType } from './settings';

const MAX_TRANSLATION_CACHE_ENTRIES = 200;
const MAX_AI_CACHE_ENTRIES = 200;

export type TranslationCacheEntry = Pick<
  TranslationSuccess,
  'translatedText' | 'detectedSourceLanguage' | 'targetLanguage'
> & {
  providerId?: string;
  providerType?: ProviderType;
  sourceLanguage?: string;
  sourceText?: string;
  createdAt: number;
  lastUsedAt?: number;
};

export type TranslationCache = {
  entries: Record<string, TranslationCacheEntry>;
};

export type AiActionCacheEntry = Pick<
  AiActionSuccess,
  'resultText' | 'model' | 'language'
> & {
  action?: AiActionType;
  providerId?: string;
  providerName?: string;
  providerType?: AiProviderType;
  prompt?: string;
  sourceText?: string;
  createdAt: number;
  lastUsedAt?: number;
};

export type AiActionCache = {
  entries: Record<string, AiActionCacheEntry>;
};

export type TranslationCacheKeyParts = {
  providerId: string;
  providerType: ProviderType;
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
};

export type AiActionCacheKeyParts = {
  providerId: string;
  providerType: AiProviderType;
  model: string;
  action: AiActionType;
  language: string;
  prompt: string;
  text: string;
};

export const translationCacheItem = storage.defineItem<TranslationCache>('local:translationCache', {
  fallback: { entries: {} },
});

export const aiActionCacheItem = storage.defineItem<AiActionCache>('local:aiActionCache', {
  fallback: { entries: {} },
});

export function getTranslationCacheKey(parts: TranslationCacheKeyParts): string {
  return [
    parts.providerType,
    parts.providerId,
    parts.sourceLanguage || 'auto',
    parts.targetLanguage,
    parts.text.trim(),
  ].join('::');
}

export function getAiActionCacheKey(parts: AiActionCacheKeyParts): string {
  return [
    parts.providerType,
    parts.providerId,
    parts.model,
    parts.action,
    parts.language,
    parts.prompt.trim(),
    parts.text.trim(),
  ].join('::');
}

export async function getCachedTranslation(key: string): Promise<TranslationCacheEntry | undefined> {
  const cache = await translationCacheItem.getValue();
  const cached = cache.entries[key];

  if (!cached) {
    return undefined;
  }

  await translationCacheItem.setValue({
    entries: trimEntries({
      ...cache.entries,
      [key]: { ...cached, lastUsedAt: Date.now() },
    }, MAX_TRANSLATION_CACHE_ENTRIES),
  });

  return cached;
}

export async function setCachedTranslation(
  key: string,
  entry: Omit<TranslationCacheEntry, 'createdAt' | 'lastUsedAt'>,
): Promise<void> {
  const cache = await translationCacheItem.getValue();
  const now = Date.now();
  const entries = {
    ...cache.entries,
    [key]: { ...entry, createdAt: now, lastUsedAt: now },
  };

  await translationCacheItem.setValue({
    entries: trimEntries(entries, MAX_TRANSLATION_CACHE_ENTRIES),
  });
}

export async function getCachedAiAction(key: string): Promise<AiActionCacheEntry | undefined> {
  const cache = await aiActionCacheItem.getValue();
  const cached = cache.entries[key];

  if (!cached) {
    return undefined;
  }

  await aiActionCacheItem.setValue({
    entries: trimEntries({
      ...cache.entries,
      [key]: { ...cached, lastUsedAt: Date.now() },
    }, MAX_AI_CACHE_ENTRIES),
  });

  return cached;
}

export async function setCachedAiAction(
  key: string,
  entry: Omit<AiActionCacheEntry, 'createdAt' | 'lastUsedAt'>,
): Promise<void> {
  const cache = await aiActionCacheItem.getValue();
  const now = Date.now();
  const entries = {
    ...cache.entries,
    [key]: { ...entry, createdAt: now, lastUsedAt: now },
  };

  await aiActionCacheItem.setValue({
    entries: trimEntries(entries, MAX_AI_CACHE_ENTRIES),
  });
}

export async function deleteCachedTranslation(key: string): Promise<void> {
  const cache = await translationCacheItem.getValue();
  const { [key]: _removed, ...entries } = cache.entries;
  await translationCacheItem.setValue({ entries });
}

export async function deleteCachedAiAction(key: string): Promise<void> {
  const cache = await aiActionCacheItem.getValue();
  const { [key]: _removed, ...entries } = cache.entries;
  await aiActionCacheItem.setValue({ entries });
}

export async function clearTranslationCache(): Promise<void> {
  await translationCacheItem.setValue({ entries: {} });
}

export async function clearAiActionCache(): Promise<void> {
  await aiActionCacheItem.setValue({ entries: {} });
}

function trimEntries<TEntry extends { createdAt: number; lastUsedAt?: number }>(
  entries: Record<string, TEntry>,
  limit: number,
): Record<string, TEntry> {
  const sortedEntries = Object.entries(entries).sort(
    ([, left], [, right]) => getEntryRecency(right) - getEntryRecency(left),
  );

  return Object.fromEntries(sortedEntries.slice(0, limit));
}

function getEntryRecency(entry: { createdAt: number; lastUsedAt?: number }): number {
  return entry.lastUsedAt ?? entry.createdAt;
}
