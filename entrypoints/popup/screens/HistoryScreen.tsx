import { Button } from '@base-ui/react';
import { Check, Copy, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  clearAiHistory,
  clearTranslationHistory,
  deleteAiHistoryEntry,
  deleteTranslationHistoryEntry,
  getAiHistory,
  translationHistoryItem,
  type AiHistoryEntry,
  type TranslationHistoryEntry,
  watchAiHistory,
} from '@/lib/history';
import { t } from '@/lib/i18n';
import { getLanguageName } from '@/lib/languages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { AppHeader } from '../components/AppHeader';
import type { SaveState as SaveStateValue } from '../types';

type HistoryMode = 'translation' | 'ai';
type HistoryEntry = TranslationHistoryEntry | AiHistoryEntry;

export function HistoryScreen({
  mode = 'translation',
  settings,
  saveState,
  onBack,
}: {
  mode?: HistoryMode;
  settings: ExtensionSettings;
  saveState: SaveStateValue;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const title = mode === 'ai' ? t('titleAiHistory') : t('titleTranslationHistory');

  useEffect(() => {
    let active = true;

    if (mode === 'ai') {
      void getAiHistory().then((history) => {
        if (active) {
          setEntries(history.entries);
        }
      });

      const unwatch = watchAiHistory((history) => {
        if (active) {
          setEntries(history.entries);
        }
      });

      return () => {
        active = false;
        unwatch();
      };
    }

    void translationHistoryItem.getValue().then((history) => {
      if (active) {
        setEntries(history.entries);
      }
    });

    const unwatch = translationHistoryItem.watch((history) => {
      if (active) {
        setEntries(history.entries);
      }
    });

    return () => {
      active = false;
      unwatch();
    };
  }, [mode]);

  async function copyEntry(entry: HistoryEntry): Promise<void> {
    await navigator.clipboard.writeText(getResultText(entry));
    setCopiedId(entry.id);
    window.setTimeout(() => {
      setCopiedId((currentId) => currentId === entry.id ? null : currentId);
    }, 1100);
  }

  async function deleteEntry(id: string): Promise<void> {
    if (mode === 'ai') {
      await deleteAiHistoryEntry(id);
      return;
    }

    await deleteTranslationHistoryEntry(id);
  }

  async function clearHistory(): Promise<void> {
    if (mode === 'ai') {
      await clearAiHistory();
      return;
    }

    await clearTranslationHistory();
  }

  return (
    <section className="screen screen--settings" aria-label={title}>
      <AppHeader
        title={title}
        saveState={saveState}
        onBack={onBack}
        action={entries.length > 0 ? (
          <Button
            className="danger-soft-button history-clear-button"
            type="button"
            onClick={clearHistory}
          >
            <Trash2 size={14} />
            {t('actionClearHistory')}
          </Button>
        ) : undefined}
      />

      {entries.length === 0 ? (
        <div className="history-empty">
          <strong>{mode === 'ai' ? t('aiHistoryEmptyTitle') : t('historyEmptyTitle')}</strong>
          <span>{mode === 'ai' ? t('aiHistoryEmptyDescription') : t('historyEmptyDescription')}</span>
        </div>
      ) : (
        <div className="settings-stack history-stack">
          <section className="history-list" aria-label={title}>
            {entries.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                settings={settings}
                copied={copiedId === entry.id}
                onCopy={() => void copyEntry(entry)}
                onDelete={() => void deleteEntry(entry.id)}
              />
            ))}
          </section>
        </div>
      )}
    </section>
  );
}

function HistoryItem({
  entry,
  settings,
  copied,
  onCopy,
  onDelete,
}: {
  entry: HistoryEntry;
  settings: ExtensionSettings;
  copied: boolean;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const originalLanguage = getOriginalLanguage(entry);
  const resultLanguage = getResultLanguage(entry);
  const originalDirection = getTextDirection(entry.originalText, originalLanguage);
  const resultText = getResultText(entry);
  const resultDirection = getTextDirection(resultText, resultLanguage);

  return (
    <article className="history-item">
      <div className="history-item__content">
        <header className="history-item__header">
          <span className="history-item__meta">
            {isAiHistoryEntry(entry) && (
              <span className="history-item__action-icon" aria-hidden="true">
                {getAiActionIcon(entry.action)}
              </span>
            )}
            <span className="history-item__meta-text">
              {getEntryMeta(entry, settings)}
            </span>
          </span>
        </header>

        <p
          className="history-item__text"
          dir={originalDirection}
          lang={getTextLanguage(originalLanguage)}
          style={{ textAlign: getTextAlign(originalDirection) }}
        >
          {entry.originalText}
        </p>
        <p
          className="history-item__text history-item__text--translation"
          dir={resultDirection}
          lang={getTextLanguage(resultLanguage)}
          style={{ textAlign: getTextAlign(resultDirection) }}
        >
          {resultText}
        </p>
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

function isAiHistoryEntry(entry: HistoryEntry): entry is AiHistoryEntry {
  return 'action' in entry;
}

function getEntryMeta(entry: HistoryEntry, settings: ExtensionSettings): string {
  if (isAiHistoryEntry(entry)) {
    const actionLabel = t(entry.action === 'explain' ? 'explainTitle' : 'rewriteTitle', undefined, settings.appLanguage);
    const providerLabel = entry.language
      ? t('footerAiProviderWithLanguage', [
        entry.providerName ?? t('aiProviderDeepSeekName'),
        entry.model,
        getLanguageName(entry.language, settings.appLanguage),
      ], settings.appLanguage)
      : t('footerAiProvider', [entry.providerName ?? t('aiProviderDeepSeekName'), entry.model], settings.appLanguage);

    return `${actionLabel} - ${providerLabel}`;
  }

  const sourceLanguage = entry.detectedSourceLanguage ?? entry.sourceLanguage;
  return t('footerLanguagePair', [
    getLanguageName(sourceLanguage, settings.appLanguage),
    getLanguageName(entry.targetLanguage, settings.appLanguage),
  ], settings.appLanguage);
}

function getAiActionIcon(action: AiHistoryEntry['action']) {
  return action === 'rewrite' ? <PenLine size={13} /> : <Sparkles size={13} />;
}

function getOriginalLanguage(entry: HistoryEntry): string | undefined {
  return isAiHistoryEntry(entry)
    ? undefined
    : entry.detectedSourceLanguage ?? entry.sourceLanguage;
}

function getResultLanguage(entry: HistoryEntry): string | undefined {
  return isAiHistoryEntry(entry) ? entry.language : entry.targetLanguage;
}

function getResultText(entry: HistoryEntry): string {
  return isAiHistoryEntry(entry) ? entry.resultText : entry.translatedText;
}
