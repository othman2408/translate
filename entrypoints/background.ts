import { browser, defineBackground } from '#imports';

import { t } from '@/lib/i18n';
import { isRuntimeMessage, type TranslationResponse } from '@/lib/messages';
import { getSettings, settingsItem } from '@/lib/settings';
import { getHttpHost, isHostDisabled } from '@/lib/sites';
import { TranslationService } from '@/lib/translation/service';

const CONTEXT_MENU_ID = 'translate-bubble-selection';

export default defineBackground(() => {
  const translationService = new TranslationService();

  setupContextMenu();

  browser.runtime.onInstalled.addListener(() => {
    void setupContextMenu();
  });

  settingsItem.watch(() => {
    void setupContextMenu();
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id || !info.selectionText?.trim()) {
      return;
    }

    if (await isTabDisabled(tab.url)) {
      return;
    }

    try {
      await browser.tabs.sendMessage(tab.id, {
        type: 'SHOW_CONTEXT_TRANSLATION',
        text: info.selectionText,
      });
    } catch {
      // Some pages cannot receive extension messages; the menu is still useful elsewhere.
    }
  });

  browser.runtime.onMessage.addListener((message): Promise<TranslationResponse> | undefined => {
    if (!isRuntimeMessage(message) || message.type !== 'TRANSLATE_TEXT') {
      return undefined;
    }

    return translationService.translate({
      text: message.text,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      providerId: message.providerId,
      recordHistory: message.recordHistory === true,
    });
  });
});

async function isTabDisabled(tabUrl: string | undefined): Promise<boolean> {
  const host = getHttpHost(tabUrl);
  if (!host) {
    return false;
  }

  const settings = await getSettings();
  return isHostDisabled(host, settings.disabledHosts);
}

async function setupContextMenu(): Promise<void> {
  try {
    const settings = await getSettings();

    await browser.contextMenus.removeAll();
    await browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: t('contextMenuTranslateSelection', undefined, settings.appLanguage),
      contexts: ['selection'],
    });
  } catch {
    // Context menus are unavailable in a few extension contexts during startup.
  }
}
