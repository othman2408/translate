import { browser } from '#imports';

import arMessages from './locales/ar/messages.json';
import enMessages from './locales/en/messages.json';

export type I18nKey = keyof typeof enMessages;

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

const APP_LANGUAGE_OPTIONS: Array<{ value: AppLanguage; labelKey: I18nKey }> = [
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
    ?? MESSAGE_CATALOGS[FALLBACK_LANGUAGE][key]?.message
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
