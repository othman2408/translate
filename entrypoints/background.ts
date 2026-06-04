import { browser, defineBackground } from '#imports';

import { AiTextActionService } from '@/lib/ai/service';
import { t } from '@/lib/i18n';
import { isRuntimeMessage, type AiActionResponse, type TranslationResponse } from '@/lib/messages';
import { getSettings, settingsItem } from '@/lib/settings';
import { getHttpHost, isHostDisabled } from '@/lib/sites';
import { TranslationService } from '@/lib/translation/service';

const CONTEXT_MENU_ID = 'translate-bubble-selection';
let contextMenuSetupPromise = Promise.resolve();

export default defineBackground(() => {
  const translationService = new TranslationService();
  const aiTextActionService = new AiTextActionService();

  queueContextMenuSetup();

  browser.runtime.onInstalled.addListener(() => {
    queueContextMenuSetup();
  });

  settingsItem.watch(() => {
    queueContextMenuSetup();
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

  browser.runtime.onMessage.addListener((message): Promise<AiActionResponse | TranslationResponse> | undefined => {
    if (!isRuntimeMessage(message)) {
      return undefined;
    }

    if (message.type === 'TRANSLATE_TEXT') {
      return translationService.translate({
        text: message.text,
        sourceLanguage: message.sourceLanguage,
        targetLanguage: message.targetLanguage,
        providerId: message.providerId,
        recordHistory: message.recordHistory === true,
      });
    }

    if (message.type === 'RUN_AI_ACTION') {
      return aiTextActionService.run({
        action: message.action,
        text: message.text,
        prompt: message.prompt,
        providerId: message.providerId,
        language: message.language,
        recordHistory: message.recordHistory,
      });
    }

    return undefined;
  });
});

function queueContextMenuSetup(): void {
  contextMenuSetupPromise = contextMenuSetupPromise
    .catch(() => undefined)
    .then(setupContextMenu);
}

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
