import { storage } from '#imports';

import type { AiActionType } from './messages';
import type { AiProviderType, ProviderType } from './settings';

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

export type AiHistoryEntry = {
  id: string;
  action: AiActionType;
  originalText: string;
  resultText: string;
  provider: AiProviderType;
  providerName?: string;
  model: string;
  language?: string;
  createdAt: number;
};

export type AiHistory = {
  entries: AiHistoryEntry[];
};

type LegacyAiRewriteHistoryEntry = {
  id: string;
  originalText: string;
  rewrittenText: string;
  provider: AiProviderType;
  providerName?: string;
  model: string;
  createdAt: number;
};

type LegacyAiRewriteHistory = {
  entries: LegacyAiRewriteHistoryEntry[];
};

export type NewTranslationHistoryEntry = Omit<TranslationHistoryEntry, 'id' | 'createdAt'>;
export type NewAiHistoryEntry = Omit<AiHistoryEntry, 'id' | 'createdAt'>;

export const translationHistoryItem = storage.defineItem<TranslationHistory>('local:translationHistory', {
  fallback: { entries: [] },
});

const aiHistoryItem = storage.defineItem<AiHistory>('local:aiHistory', {
  fallback: { entries: [] },
});

const legacyAiRewriteHistoryItem = storage.defineItem<LegacyAiRewriteHistory>('local:aiRewriteHistory', {
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

export async function addAiHistoryEntry(
  entry: NewAiHistoryEntry,
  limit: number,
): Promise<void> {
  const normalizedLimit = clampHistoryLimit(limit);
  if (normalizedLimit <= 0) {
    await trimAiHistory(0);
    return;
  }

  const history = await getAiHistory();
  const nextEntry: AiHistoryEntry = {
    ...entry,
    id: createHistoryEntryId(),
    createdAt: Date.now(),
  };

  await aiHistoryItem.setValue({
    entries: [nextEntry, ...history.entries].slice(0, normalizedLimit),
  });
}

export async function deleteTranslationHistoryEntry(id: string): Promise<void> {
  const history = await translationHistoryItem.getValue();
  await translationHistoryItem.setValue({
    entries: history.entries.filter((entry) => entry.id !== id),
  });
}

export async function deleteAiHistoryEntry(id: string): Promise<void> {
  const history = await getAiHistory();
  await aiHistoryItem.setValue({
    entries: history.entries.filter((entry) => entry.id !== id),
  });
}

export async function clearTranslationHistory(): Promise<void> {
  await translationHistoryItem.setValue({ entries: [] });
}

export async function clearAiHistory(): Promise<void> {
  await aiHistoryItem.setValue({ entries: [] });
  await legacyAiRewriteHistoryItem.setValue({ entries: [] });
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

export async function trimAiHistory(limit: number): Promise<void> {
  const normalizedLimit = clampHistoryLimit(limit);
  const history = await getAiHistory();

  if (history.entries.length <= normalizedLimit) {
    return;
  }

  await aiHistoryItem.setValue({
    entries: history.entries.slice(0, normalizedLimit),
  });
}

export async function getAiHistory(): Promise<AiHistory> {
  return ensureAiHistoryMigrated();
}

export function watchAiHistory(onChange: (history: AiHistory) => void): () => void {
  return aiHistoryItem.watch(onChange);
}

async function ensureAiHistoryMigrated(): Promise<AiHistory> {
  const [history, legacyHistory] = await Promise.all([
    aiHistoryItem.getValue(),
    legacyAiRewriteHistoryItem.getValue(),
  ]);

  if (legacyHistory.entries.length === 0) {
    return history;
  }

  const existingIds = new Set(history.entries.map((entry) => entry.id));
  const migratedEntries = legacyHistory.entries
    .filter((entry) => !existingIds.has(entry.id))
    .map((entry): AiHistoryEntry => ({
      id: entry.id,
      action: 'rewrite',
      originalText: entry.originalText,
      resultText: entry.rewrittenText,
      provider: entry.provider,
      providerName: entry.providerName,
      model: entry.model,
      createdAt: entry.createdAt,
    }));

  const nextHistory = {
    entries: [...history.entries, ...migratedEntries]
      .sort((first, second) => second.createdAt - first.createdAt),
  };

  await aiHistoryItem.setValue(nextHistory);
  await legacyAiRewriteHistoryItem.setValue({ entries: [] });
  return nextHistory;
}

function createHistoryEntryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
