import { Button } from '@base-ui/react';
import { Check, Copy, Sparkles, Trash2, Languages } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  aiActionCacheItem,
  clearAiActionCache,
  clearTranslationCache,
  deleteCachedAiAction,
  deleteCachedTranslation,
  translationCacheItem,
  type AiActionCacheEntry,
  type TranslationCacheEntry,
} from '@/lib/cache';
import { t } from '@/lib/i18n';
import { getLanguageName } from '@/lib/languages';
import { MarkdownText } from '@/lib/markdown-text';
import type { AiActionType } from '@/lib/messages';
import { getAiProviderTypeName, type ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { AppHeader } from '../components/AppHeader';
import type { SaveState as SaveStateValue } from '../types';

type CacheEntry =
  | {
    kind: 'translation';
    key: string;
    entry: TranslationCacheEntry;
  }
  | {
    kind: 'ai';
    key: string;
    entry: AiActionCacheEntry;
  };

export function CacheScreen({
  settings,
  saveState,
  onBack,
}: {
  settings: ExtensionSettings;
  saveState: SaveStateValue;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEntries(): Promise<void> {
      const [translationCache, aiCache] = await Promise.all([
        translationCacheItem.getValue(),
        aiActionCacheItem.getValue(),
      ]);

      if (!active) {
        return;
      }

      setEntries(sortEntries([
        ...Object.entries(translationCache.entries).map(([key, entry]) => ({
          kind: 'translation' as const,
          key,
          entry,
        })),
        ...Object.entries(aiCache.entries).map(([key, entry]) => ({
          kind: 'ai' as const,
          key,
          entry,
        })),
      ]));
    }

    void loadEntries();

    const unwatchTranslation = translationCacheItem.watch(() => {
      void loadEntries();
    });
    const unwatchAi = aiActionCacheItem.watch(() => {
      void loadEntries();
    });

    return () => {
      active = false;
      unwatchTranslation();
      unwatchAi();
    };
  }, []);

  async function copyEntry(entry: CacheEntry): Promise<void> {
    await navigator.clipboard.writeText(getResultText(entry));
    setCopiedKey(entry.key);
    window.setTimeout(() => {
      setCopiedKey((currentKey) => currentKey === entry.key ? null : currentKey);
    }, 1100);
  }

  async function deleteEntry(entry: CacheEntry): Promise<void> {
    if (entry.kind === 'translation') {
      await deleteCachedTranslation(entry.key);
      return;
    }

    await deleteCachedAiAction(entry.key);
  }

  async function clearCache(): Promise<void> {
    await Promise.all([
      clearTranslationCache(),
      clearAiActionCache(),
    ]);
  }

  return (
    <section className="screen screen--settings" aria-label={t('titleCache')}>
      <AppHeader
        title={t('titleCache')}
        saveState={saveState}
        onBack={onBack}
        action={entries.length > 0 ? (
          <Button
            className="danger-soft-button history-clear-button"
            type="button"
            onClick={clearCache}
          >
            <Trash2 size={14} />
            {t('actionClearCache')}
          </Button>
        ) : undefined}
      />

      {entries.length === 0 ? (
        <div className="history-empty">
          <strong>{t('cacheEmptyTitle')}</strong>
          <span>{t('cacheEmptyDescription')}</span>
        </div>
      ) : (
        <div className="settings-stack history-stack">
          <section className="history-list" aria-label={t('titleCache')}>
            {entries.map((entry) => (
              <CacheItem
                key={`${entry.kind}:${entry.key}`}
                cacheEntry={entry}
                settings={settings}
                copied={copiedKey === entry.key}
                onCopy={() => void copyEntry(entry)}
                onDelete={() => void deleteEntry(entry)}
              />
            ))}
          </section>
        </div>
      )}
    </section>
  );
}

function CacheItem({
  cacheEntry,
  settings,
  copied,
  onCopy,
  onDelete,
}: {
  cacheEntry: CacheEntry;
  settings: ExtensionSettings;
  copied: boolean;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const originalText = getOriginalText(cacheEntry);
  const resultText = getResultText(cacheEntry);
  const originalLanguage = getOriginalLanguage(cacheEntry);
  const resultLanguage = getResultLanguage(cacheEntry);
  const originalDirection = getTextDirection(originalText, originalLanguage);
  const resultDirection = getTextDirection(resultText, resultLanguage);

  return (
    <article className="history-item">
      <div className="history-item__content">
        <header className="history-item__header">
          <span className="history-item__meta">
            <span className="history-item__action-icon" aria-hidden="true">
              {cacheEntry.kind === 'translation' ? <Languages size={13} /> : <Sparkles size={13} />}
            </span>
            <span className="history-item__meta-text">
              {getEntryMeta(cacheEntry, settings)}
            </span>
          </span>
        </header>

        <p
          className="history-item__text"
          dir={originalDirection}
          lang={getTextLanguage(originalLanguage)}
          style={{ textAlign: getTextAlign(originalDirection) }}
        >
          {originalText || t('cacheLegacyOriginalUnavailable', undefined, settings.appLanguage)}
        </p>
        {cacheEntry.kind === 'ai' ? (
          <MarkdownText
            className="history-item__text history-item__text--translation history-item__markdown"
            dir={resultDirection}
            lang={getTextLanguage(resultLanguage)}
            style={{ textAlign: getTextAlign(resultDirection) }}
            text={resultText}
          />
        ) : (
          <p
            className="history-item__text history-item__text--translation"
            dir={resultDirection}
            lang={getTextLanguage(resultLanguage)}
            style={{ textAlign: getTextAlign(resultDirection) }}
          >
            {resultText}
          </p>
        )}
      </div>

      <span className="history-item__actions">
        <Button
          className="plain-button history-icon-button"
          type="button"
          onClick={onCopy}
          title={t('actionCopyHistoryItem')}
          aria-label={t('actionCopyHistoryItem')}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
        <Button
          className="plain-button history-icon-button history-icon-button--danger"
          type="button"
          onClick={onDelete}
          title={t('actionDeleteHistoryItem')}
          aria-label={t('actionDeleteHistoryItem')}
        >
          <Trash2 size={14} />
        </Button>
      </span>
    </article>
  );
}

function sortEntries(entries: CacheEntry[]): CacheEntry[] {
  return entries.sort((left, right) => getRecency(right) - getRecency(left));
}

function getRecency(cacheEntry: CacheEntry): number {
  return cacheEntry.entry.lastUsedAt ?? cacheEntry.entry.createdAt;
}

function getEntryMeta(cacheEntry: CacheEntry, settings: ExtensionSettings): string {
  if (cacheEntry.kind === 'ai') {
    const action = getAiAction(cacheEntry);
    const actionLabel = t(action === 'explain' ? 'explainTitle' : 'rewriteTitle', undefined, settings.appLanguage);
    const providerName = cacheEntry.entry.providerName
      ?? getAiProviderTypeName(cacheEntry.entry.providerType ?? 'deepseek');

    return cacheEntry.entry.language
      ? t('footerAiProviderWithLanguage', [
        actionLabel,
        providerName,
        getLanguageName(cacheEntry.entry.language, settings.appLanguage),
      ], settings.appLanguage)
      : t('footerAiProvider', [actionLabel, providerName], settings.appLanguage);
  }

  const sourceLanguage = getOriginalLanguage(cacheEntry);
  return t('footerLanguagePair', [
    getLanguageName(sourceLanguage ?? 'auto', settings.appLanguage),
    getLanguageName(cacheEntry.entry.targetLanguage, settings.appLanguage),
  ], settings.appLanguage);
}

function getOriginalText(cacheEntry: CacheEntry): string {
  if (cacheEntry.entry.sourceText) {
    return cacheEntry.entry.sourceText;
  }

  if (cacheEntry.kind === 'translation') {
    return parseTranslationKey(cacheEntry.key).text;
  }

  return parseAiKey(cacheEntry.key).text;
}

function getResultText(cacheEntry: CacheEntry): string {
  return cacheEntry.kind === 'translation'
    ? cacheEntry.entry.translatedText
    : cacheEntry.entry.resultText;
}

function getOriginalLanguage(cacheEntry: CacheEntry): string | undefined {
  if (cacheEntry.kind === 'translation') {
    return cacheEntry.entry.detectedSourceLanguage
      ?? cacheEntry.entry.sourceLanguage
      ?? parseTranslationKey(cacheEntry.key).sourceLanguage;
  }

  return undefined;
}

function getResultLanguage(cacheEntry: CacheEntry): string | undefined {
  return cacheEntry.kind === 'translation'
    ? cacheEntry.entry.targetLanguage
    : cacheEntry.entry.language;
}

function getAiAction(cacheEntry: Extract<CacheEntry, { kind: 'ai' }>): AiActionType {
  return cacheEntry.entry.action ?? parseAiKey(cacheEntry.key).action ?? 'rewrite';
}

function parseTranslationKey(key: string): { sourceLanguage?: string; text: string } {
  const parts = key.split('::');
  return {
    sourceLanguage: parts[2],
    text: parts.slice(4).join('::'),
  };
}

function parseAiKey(key: string): { action?: AiActionType; text: string } {
  const parts = key.split('::');
  const action = parts[3] === 'rewrite' || parts[3] === 'explain' ? parts[3] : undefined;

  return {
    action,
    text: parts.slice(6).at(-1) ?? '',
  };
}
