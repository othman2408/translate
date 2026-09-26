import { browser } from '#imports';
import type { ExtensionSettings } from './settings';
import { getManualLanguages, getManualRequestKey, type TranslationDraft } from './translation-draft';
import type { ShowTranslationReaderMessage } from './messages';

// Open the existing content-script reader in the active page. Acknowledgment is
// required before the toolbar closes, so unsupported pages retain the draft.
export async function openTranslationReader(draft: TranslationDraft, settings: ExtensionSettings): Promise<void> {
  if (!draft.edit.text.trim()) throw new Error('Empty reader text');
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) throw new Error('No active page');
  const message: ShowTranslationReaderMessage = {
    type: 'SHOW_TRANSLATION_READER',
    text: draft.edit.text,
    ...getManualLanguages(draft.edit.side, settings),
    response: draft.requestKey === getManualRequestKey(draft.edit, settings) && draft.response?.ok
      ? draft.response : undefined,
  };
  const response = await browser.tabs.sendMessage(tab.id, message, { frameId: 0 });
  if (response?.ok !== true) throw new Error('Reader unavailable on this page');
}
