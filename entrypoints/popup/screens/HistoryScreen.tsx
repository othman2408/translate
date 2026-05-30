import { Button } from '@base-ui/react';
import { Check, Copy, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  clearTranslationHistory,
  deleteTranslationHistoryEntry,
  translationHistoryItem,
  type TranslationHistoryEntry,
} from '@/lib/history';
import { t } from '@/lib/i18n';
import { getLanguageName } from '@/lib/languages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import { AppHeader } from '../components/AppHeader';
import type { SaveState as SaveStateValue } from '../types';

export function HistoryScreen({
  settings,
  saveState,
  onBack,
}: {
  settings: ExtensionSettings;
  saveState: SaveStateValue;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<TranslationHistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

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
  }, []);

  async function copyTranslation(entry: TranslationHistoryEntry): Promise<void> {
    await navigator.clipboard.writeText(entry.translatedText);
    setCopiedId(entry.id);
    window.setTimeout(() => {
      setCopiedId((currentId) => currentId === entry.id ? null : currentId);
    }, 1100);
  }

  async function deleteEntry(id: string): Promise<void> {
    await deleteTranslationHistoryEntry(id);
  }

  async function clearHistory(): Promise<void> {
    await clearTranslationHistory();
  }

  return (
    <section className="screen screen--settings" aria-label={t('titleHistory')}>
      <AppHeader
        title={t('titleHistory')}
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
          <strong>{t('historyEmptyTitle')}</strong>
          <span>{t('historyEmptyDescription')}</span>
        </div>
      ) : (
        <div className="settings-stack history-stack">
          <section className="history-list" aria-label={t('titleHistory')}>
            {entries.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                settings={settings}
                copied={copiedId === entry.id}
                onCopy={() => void copyTranslation(entry)}
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
  entry: TranslationHistoryEntry;
  settings: ExtensionSettings;
  copied: boolean;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const sourceLanguage = entry.detectedSourceLanguage ?? entry.sourceLanguage;
  const sourceName = getLanguageName(sourceLanguage, settings.appLanguage);
  const targetName = getLanguageName(entry.targetLanguage, settings.appLanguage);
  const originalDirection = getTextDirection(entry.originalText, sourceLanguage);
  const translationDirection = getTextDirection(entry.translatedText, entry.targetLanguage);

  return (
    <article className="history-item">
      <header className="history-item__header">
        <span className="history-item__meta">
          {t('footerLanguagePair', [sourceName, targetName], settings.appLanguage)}
        </span>
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
      </header>

      <p
        className="history-item__text"
        dir={originalDirection}
        lang={getTextLanguage(sourceLanguage)}
        style={{ textAlign: getTextAlign(originalDirection) }}
      >
        {entry.originalText}
      </p>
      <p
        className="history-item__text history-item__text--translation"
        dir={translationDirection}
        lang={getTextLanguage(entry.targetLanguage)}
        style={{ textAlign: getTextAlign(translationDirection) }}
      >
        {entry.translatedText}
      </p>
    </article>
  );
}
