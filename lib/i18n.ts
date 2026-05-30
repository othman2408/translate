import { browser } from '#imports';

export type I18nKey =
  | 'extName'
  | 'extDescription'
  | 'actionBack'
  | 'actionClose'
  | 'actionCopyTranslation'
  | 'actionReset'
  | 'appTitle'
  | 'ariaSettingsGroups'
  | 'ariaTranslateSettings'
  | 'cacheTranslations'
  | 'closeOnOutsideClick'
  | 'contextMenuTranslateSelection'
  | 'dictionaryTitle'
  | 'errorApiKeyRejected'
  | 'errorBackgroundUnavailable'
  | 'errorEmptyProviderResponse'
  | 'errorGoogleProvider'
  | 'errorMissingApiKey'
  | 'errorNetwork'
  | 'errorQuota'
  | 'errorSelectText'
  | 'footerCached'
  | 'footerLanguagePair'
  | 'footerToLanguage'
  | 'groupBehavior'
  | 'groupGoogleCloud'
  | 'groupLanguages'
  | 'groupSelection'
  | 'groupSettings'
  | 'infoLocalOnlyStorage'
  | 'inputApiKey'
  | 'labelApiKey'
  | 'labelFrom'
  | 'labelOriginal'
  | 'labelPopupStyle'
  | 'labelTo'
  | 'labelTrigger'
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
  | 'noteSelectedTextOnly'
  | 'optionBubble'
  | 'optionClick'
  | 'optionDictionary'
  | 'optionInstant'
  | 'providerDescription'
  | 'saved'
  | 'settingsScreenAria'
  | 'titleInteraction'
  | 'titleProvider'
  | 'titleTranslation'
  | 'translationTitle'
  | 'translatingTo';

const RTL_LANGUAGE_PATTERN = /^(ar|fa|he|iw|ur)(-|$)/i;

export function t(key: I18nKey, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

export function getUiLanguage(): string {
  return browser.i18n.getUILanguage() || 'en';
}

export function getUiDirection(language = getUiLanguage()): 'ltr' | 'rtl' {
  return RTL_LANGUAGE_PATTERN.test(language) ? 'rtl' : 'ltr';
}
