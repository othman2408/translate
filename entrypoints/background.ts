import { browser, defineBackground } from '#imports';

import { AiTextActionService } from '@/lib/ai/service';
import { AiModelCatalog } from '@/lib/ai/model-catalog';
import { t } from '@/lib/i18n';
import {
  AI_ACTION_STREAM_PORT,
  isRuntimeMessage,
  type AiActionResponse,
  type AiActionStreamEvent,
  type TranslationResponse,
  type ListAiModelsResponse,
} from '@/lib/messages';
import { getSettings, settingsItem } from '@/lib/settings';
import { getSiteKey, isSiteDisabled } from '@/lib/sites';
import { TranslationService } from '@/lib/translation/service';

const CONTEXT_MENU_ID = 'translate-bubble-selection';
let contextMenuSetupPromise = Promise.resolve();

export default defineBackground(() => {
  const translationService = new TranslationService();
  const aiTextActionService = new AiTextActionService();
  const aiModelCatalog = new AiModelCatalog();

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

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (!isSelectionCommand(command)) {
      return;
    }

    const targetTab = tab?.id
      ? tab
      : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    if (!targetTab?.id || await isTabDisabled(targetTab.url)) {
      return;
    }

    try {
      await browser.tabs.sendMessage(targetTab.id, {
        type: 'RUN_SELECTION_ACTION',
        action: command.replace('-selection', ''),
      });
    } catch {
      // Restricted pages do not run the content script.
    }
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== AI_ACTION_STREAM_PORT) {
      return;
    }

    const abortController = new AbortController();
    port.onDisconnect.addListener(() => abortController.abort());
    port.onMessage.addListener((message) => {
      if (!isRuntimeMessage(message) || message.type !== 'RUN_AI_ACTION') {
        return;
      }

      void aiTextActionService.run({
        action: message.action,
        text: message.text,
        prompt: message.prompt,
        providerId: message.providerId,
        language: message.language,
        recordHistory: message.recordHistory,
      }, {
        abortSignal: abortController.signal,
        onTextDelta: (textDelta) => postStreamEvent(port, {
          type: 'AI_ACTION_DELTA',
          textDelta,
        }),
      }).then((response) => postStreamEvent(port, {
        type: 'AI_ACTION_COMPLETE',
        response,
      })).catch(() => postStreamEvent(port, {
        type: 'AI_ACTION_COMPLETE',
        response: {
          ok: false,
          error: {
            code: 'unknown',
            message: t('errorAiProviderFailed'),
          },
        },
      }));
    });
  });

  browser.runtime.onMessage.addListener((message, sender): Promise<AiActionResponse | TranslationResponse | ListAiModelsResponse> | undefined => {
    if (!isRuntimeMessage(message)) {
      return undefined;
    }

    if (message.type === 'LIST_AI_MODELS') {
      if (sender.id !== browser.runtime.id || !sender.url?.startsWith(browser.runtime.getURL('/'))) {
        return undefined;
      }
      return aiModelCatalog.list(message);
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
  const siteKey = getSiteKey(tabUrl);
  if (!siteKey) {
    return true;
  }

  const settings = await getSettings();
  return isSiteDisabled(siteKey, settings.disabledHosts);
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

function isSelectionCommand(command: string): command is 'translate-selection' | 'rewrite-selection' | 'explain-selection' {
  return command === 'translate-selection'
    || command === 'rewrite-selection'
    || command === 'explain-selection';
}

function postStreamEvent(
  port: Parameters<Parameters<typeof browser.runtime.onConnect.addListener>[0]>[0],
  event: AiActionStreamEvent,
): void {
  try {
    port.postMessage(event);
  } catch {
    // The user may close the popup while a streamed request is finishing.
  }
}
