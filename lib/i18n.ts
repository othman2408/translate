import { browser } from '#imports';

import arMessages from './locales/ar/messages.json';
import enMessages from './locales/en/messages.json';

export type I18nKey =
  | 'extName'
  | 'extDescription'
  | 'actionBack'
  | 'actionClearText'
  | 'actionClose'
  | 'actionCopyTranslation'
  | 'actionClearHistory'
  | 'actionClearCache'
  | 'actionCopyExplanation'
  | 'actionAddProvider'
  | 'actionAddAiProvider'
  | 'actionCancelProvider'
  | 'actionCopyHistoryItem'
  | 'actionOpenGithub'
  | 'actionCopyRewrite'
  | 'actionDeleteHistoryItem'
  | 'actionDeleteProvider'
  | 'actionEditProvider'
  | 'actionReset'
  | 'actionResizePopup'
  | 'actionSaveProvider'
  | 'actionSetDefaultProvider'
  | 'actionExplainText'
  | 'actionRewriteText'
  | 'aiEnabled'
  | 'aiEmptyDescription'
  | 'aiEmptyTitle'
  | 'aiHistoryEmptyDescription'
  | 'aiHistoryEmptyTitle'
  | 'aiLocalOnlyNote'
  | 'aiProviderDescription'
  | 'aiProviderDeepSeekDescription'
  | 'aiProviderDeepSeekName'
  | 'aiExplainPromptDescription'
  | 'aiProviderPromptDescription'
  | 'aboutAppTypeValue'
  | 'aboutDescription'
  | 'aboutDetails'
  | 'appTitle'
  | 'ariaSettingsGroups'
  | 'ariaTranslateSettings'
  | 'cacheTranslations'
  | 'cacheEmptyDescription'
  | 'cacheEmptyTitle'
  | 'cacheLegacyOriginalUnavailable'
  | 'closeOnOutsideClick'
  | 'contextMenuTranslateSelection'
  | 'dictionaryTitle'
  | 'errorApiKeyRejected'
  | 'errorBackgroundUnavailable'
  | 'errorAiDisabled'
  | 'errorAiEmptyResponse'
  | 'errorAiMissingApiKey'
  | 'errorAiNetwork'
  | 'errorAiProviderFailed'
  | 'errorAiProviderUnavailable'
  | 'errorEmptyProviderResponse'
  | 'errorGoogleProvider'
  | 'errorMissingApiKey'
  | 'errorNetwork'
  | 'errorProviderFailed'
  | 'errorProviderUnavailable'
  | 'errorQuota'
  | 'errorSelectText'
  | 'footerCached'
  | 'footerAiProviderWithLanguage'
  | 'footerLanguagePair'
  | 'footerToLanguage'
  | 'groupBehavior'
  | 'groupAiProvider'
  | 'groupAiExplain'
  | 'groupAiRewrite'
  | 'groupHistory'
  | 'groupInterface'
  | 'groupLanguages'
  | 'groupSelection'
  | 'groupSettings'
  | 'historyEmptyDescription'
  | 'historyEmptyTitle'
  | 'historyLimitDescription'
  | 'inputApiKey'
  | 'labelApiKey'
  | 'labelAppType'
  | 'labelDeveloper'
  | 'labelExtensionLanguage'
  | 'labelFrom'
  | 'labelHistoryLimit'
  | 'labelAiRewriteLanguage'
  | 'labelAiRewritePrompt'
  | 'labelAiExplainPrompt'
  | 'labelAiExplanationLanguage'
  | 'labelAiHistoryLimit'
  | 'labelAiModel'
  | 'labelAiProvider'
  | 'labelOriginal'
  | 'labelPopupStyle'
  | 'labelProviderName'
  | 'labelRepository'
  | 'labelTo'
  | 'labelTrigger'
  | 'labelVersion'
  | 'languageAr'
  | 'languageAuto'
  | 'languageDe'
  | 'languageEn'
  | 'languageEs'
  | 'languageFr'
  | 'languageHi'
  | 'languageId'
  | 'languageIt'
  | 'languageJa'
  | 'languageKo'
  | 'languageNl'
  | 'languagePl'
  | 'languagePt'
  | 'languageRu'
  | 'languageSv'
  | 'languageTr'
  | 'languageUr'
  | 'languageZhCn'
  | 'languageZhTw'
  | 'manualInputPlaceholder'
  | 'manualTranslationEmpty'
  | 'manualTranslationLabel'
  | 'manualTranslatorTitle'
  | 'manualTranslating'
  | 'noteSelectedTextOnly'
  | 'optionBubble'
  | 'optionClick'
  | 'optionDarkTheme'
  | 'optionDictionary'
  | 'optionLightTheme'
  | 'optionInstant'
  | 'optionSystemLanguage'
  | 'optionSystemTheme'
  | 'providerApiKeyDescription'
  | 'providerConfigured'
  | 'providerDefaultBadge'
  | 'providerEmptyDescription'
  | 'providerEmptyTitle'
  | 'providerGoogleDescription'
  | 'providerGoogleName'
  | 'providerLocalOnlyNote'
  | 'providerNotConfigured'
  | 'footerAiProvider'
  | 'labelExplanation'
  | 'labelRewritten'
  | 'explainTitle'
  | 'rewriteTitle'
  | 'explainingText'
  | 'rewritingText'
  | 'saved'
  | 'saveAiHistory'
  | 'saveHistory'
  | 'settingsScreenAria'
  | 'siteToggleCurrentSite'
  | 'siteToggleUnavailable'
  | 'siteToggleUnsupported'
  | 'labelTheme'
  | 'titleCache'
  | 'titleStorage'
  | 'titleTranslationHistory'
  | 'titleAbout'
  | 'titleAi'
  | 'titleAiBehavior'
  | 'titleAiHistory'
  | 'titleAiProviders'
  | 'titleInteraction'
  | 'titleExtension'
  | 'titleProvider'
  | 'titleSettings'
  | 'titleTranslation'
  | 'translationTitle'
  | 'translatingTo';

export type SupportedAppLanguage = 'en' | 'ar';
export type AppLanguage = 'auto' | SupportedAppLanguage;

type MessageCatalog = Record<I18nKey, { message: string }>;

const RTL_LANGUAGE_PATTERN = /^(ar|fa|he|iw|ur)(-|$)/i;
const FALLBACK_LANGUAGE: SupportedAppLanguage = 'en';
const MESSAGE_CATALOGS: Record<SupportedAppLanguage, MessageCatalog> = {
  ar: arMessages,
  en: enMessages,
};

let activeAppLanguage: AppLanguage = 'auto';

export const APP_LANGUAGE_OPTIONS: Array<{ value: AppLanguage; labelKey: I18nKey }> = [
  { value: 'auto', labelKey: 'optionSystemLanguage' },
  { value: 'en', labelKey: 'languageEn' },
  { value: 'ar', labelKey: 'languageAr' },
];

export function setActiveAppLanguage(language: AppLanguage): void {
  activeAppLanguage = language;
}

export function t(
  key: I18nKey,
  substitutions?: string | string[],
  language = activeAppLanguage,
): string {
  const message = getMessageCatalog(language)[key]?.message
    ?? getBrowserMessage(key, substitutions)
    ?? key;

  return applySubstitutions(message, substitutions);
}

export function getUiLanguage(language = activeAppLanguage): SupportedAppLanguage {
  if (language !== 'auto') {
    return language;
  }

  return resolveSupportedLanguage(getBrowserUiLanguage());
}

export function getUiDirection(language = getUiLanguage()): 'ltr' | 'rtl' {
  return RTL_LANGUAGE_PATTERN.test(language) ? 'rtl' : 'ltr';
}

export function getAppLanguageOptions(language = activeAppLanguage): Array<{ value: AppLanguage; label: string }> {
  return APP_LANGUAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey, undefined, language),
  }));
}

function getMessageCatalog(language: AppLanguage): MessageCatalog {
  return MESSAGE_CATALOGS[getUiLanguage(language)] ?? MESSAGE_CATALOGS[FALLBACK_LANGUAGE];
}

function resolveSupportedLanguage(language: string | undefined): SupportedAppLanguage {
  const normalizedLanguage = language?.toLowerCase() ?? '';

  if (normalizedLanguage === 'ar' || normalizedLanguage.startsWith('ar-')) {
    return 'ar';
  }

  return FALLBACK_LANGUAGE;
}

function getBrowserMessage(messageName: string, substitutions?: string | string[]): string | undefined {
  try {
    const getMessage = browser.i18n.getMessage as (
      messageName: string,
      substitutions?: string | string[],
    ) => string;
    return getMessage(messageName, substitutions) || undefined;
  } catch {
    return undefined;
  }
}

function getBrowserUiLanguage(): string | undefined {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return undefined;
  }
}

function applySubstitutions(message: string, substitutions?: string | string[]): string {
  if (!substitutions) {
    return message;
  }

  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  return values.reduce(
    (nextMessage, value, index) => nextMessage.replaceAll(`$${index + 1}`, value),
    message,
  );
}
