import { browser, defineBackground } from '#imports';

import { getCacheKey, getCachedTranslation, setCachedTranslation } from '@/lib/cache';
import { t } from '@/lib/i18n';
import { isRuntimeMessage, type TranslationErrorCode, type TranslationResponse } from '@/lib/messages';
import { getSettings, settingsItem } from '@/lib/settings';
import { getHttpHost, isHostDisabled } from '@/lib/sites';

const CONTEXT_MENU_ID = 'translate-bubble-selection';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
  };
};

export default defineBackground(() => {
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

    return translateText(message.text, message.sourceLanguage, message.targetLanguage);
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

async function translateText(
  rawText: string,
  requestedSourceLanguage?: string,
  requestedTargetLanguage?: string,
): Promise<TranslationResponse> {
  const settings = await getSettings();
  const text = rawText.trim();
  if (!text) {
    return failure('empty-text', t('errorSelectText', undefined, settings.appLanguage));
  }

  const apiKey = settings.apiKey.trim();
  const sourceLanguage = requestedSourceLanguage ?? settings.sourceLanguage;
  const targetLanguage = requestedTargetLanguage ?? settings.targetLanguage;

  if (!apiKey) {
    return failure('missing-api-key', t('errorMissingApiKey', undefined, settings.appLanguage));
  }

  const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
  if (settings.cacheEnabled) {
    const cached = await getCachedTranslation(cacheKey);
    if (cached) {
      return {
        ok: true,
        translatedText: cached.translatedText,
        detectedSourceLanguage: cached.detectedSourceLanguage,
        targetLanguage: cached.targetLanguage,
        fromCache: true,
      };
    }
  }

  const params = new URLSearchParams({
    q: text,
    target: targetLanguage,
    format: 'text',
  });

  if (sourceLanguage !== 'auto') {
    params.set('source', sourceLanguage);
  }

  let response: Response;
  try {
    response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: params.toString(),
    });
  } catch {
    return failure('network', t('errorNetwork', undefined, settings.appLanguage));
  }

  const payload = (await response.json().catch(() => ({}))) as GoogleTranslateResponse;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return failure('auth', payload.error?.message ?? t('errorApiKeyRejected', undefined, settings.appLanguage));
    }

    if (response.status === 429) {
      return failure('quota', payload.error?.message ?? t('errorQuota', undefined, settings.appLanguage));
    }

    return failure('provider', payload.error?.message ?? t('errorGoogleProvider', undefined, settings.appLanguage));
  }

  const translation = payload.data?.translations?.[0];
  if (!translation?.translatedText) {
    return failure('provider', t('errorEmptyProviderResponse', undefined, settings.appLanguage));
  }

  const result = {
    ok: true as const,
    translatedText: decodeHtmlEntities(translation.translatedText),
    detectedSourceLanguage: translation.detectedSourceLanguage,
    targetLanguage,
    fromCache: false,
  };

  if (settings.cacheEnabled) {
    await setCachedTranslation(cacheKey, {
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      targetLanguage: result.targetLanguage,
    });
  }

  return result;
}

function failure(code: TranslationErrorCode, message: string): TranslationResponse {
  return {
    ok: false,
    error: { code, message },
  };
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity.toLowerCase()] ?? match;
  });
}
