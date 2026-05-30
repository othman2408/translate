import { storage } from '#imports';

import type { ProviderType } from './settings';

export const DEFAULT_HISTORY_LIMIT = 50;
export const HISTORY_LIMIT_MIN = 0;
export const HISTORY_LIMIT_MAX = 200;

export type TranslationHistoryEntry = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  provider: ProviderType;
  providerName?: string;
  createdAt: number;
};

export type TranslationHistory = {
  entries: TranslationHistoryEntry[];
};

export type NewTranslationHistoryEntry = Omit<TranslationHistoryEntry, 'id' | 'createdAt'>;

export const translationHistoryItem = storage.defineItem<TranslationHistory>('local:translationHistory', {
  fallback: { entries: [] },
});

export function clampHistoryLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(HISTORY_LIMIT_MAX, Math.max(HISTORY_LIMIT_MIN, Math.trunc(value)));
}

export async function addTranslationHistoryEntry(
  entry: NewTranslationHistoryEntry,
  limit: number,
): Promise<void> {
  const normalizedLimit = clampHistoryLimit(limit);
  if (normalizedLimit <= 0) {
    await trimTranslationHistory(0);
    return;
  }

  const history = await translationHistoryItem.getValue();
  const nextEntry: TranslationHistoryEntry = {
    ...entry,
    id: createHistoryEntryId(),
    createdAt: Date.now(),
  };

  await translationHistoryItem.setValue({
    entries: [nextEntry, ...history.entries].slice(0, normalizedLimit),
  });
}

export async function deleteTranslationHistoryEntry(id: string): Promise<void> {
  const history = await translationHistoryItem.getValue();
  await translationHistoryItem.setValue({
    entries: history.entries.filter((entry) => entry.id !== id),
  });
}

export async function clearTranslationHistory(): Promise<void> {
  await translationHistoryItem.setValue({ entries: [] });
}

export async function trimTranslationHistory(limit: number): Promise<void> {
  const normalizedLimit = clampHistoryLimit(limit);
  const history = await translationHistoryItem.getValue();

  if (history.entries.length <= normalizedLimit) {
    return;
  }

  await translationHistoryItem.setValue({
    entries: history.entries.slice(0, normalizedLimit),
  });
}

function createHistoryEntryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
