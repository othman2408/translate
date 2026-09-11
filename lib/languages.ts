import { t, type AppLanguage, type I18nKey } from './i18n';

export type LanguageOption = {
  code: string;
  name: string;
  nameKey: I18nKey;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'auto', name: 'Auto detect', nameKey: 'languageAuto' },
  { code: 'en', name: 'English', nameKey: 'languageEn' },
  { code: 'ar', name: 'Arabic', nameKey: 'languageAr' },
  { code: 'es', name: 'Spanish', nameKey: 'languageEs' },
  { code: 'fr', name: 'French', nameKey: 'languageFr' },
  { code: 'de', name: 'German', nameKey: 'languageDe' },
  { code: 'it', name: 'Italian', nameKey: 'languageIt' },
  { code: 'pt', name: 'Portuguese', nameKey: 'languagePt' },
  { code: 'ru', name: 'Russian', nameKey: 'languageRu' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nameKey: 'languageZhCn' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nameKey: 'languageZhTw' },
  { code: 'ja', name: 'Japanese', nameKey: 'languageJa' },
  { code: 'ko', name: 'Korean', nameKey: 'languageKo' },
  { code: 'hi', name: 'Hindi', nameKey: 'languageHi' },
  { code: 'tr', name: 'Turkish', nameKey: 'languageTr' },
  { code: 'nl', name: 'Dutch', nameKey: 'languageNl' },
  { code: 'sv', name: 'Swedish', nameKey: 'languageSv' },
  { code: 'pl', name: 'Polish', nameKey: 'languagePl' },
  { code: 'id', name: 'Indonesian', nameKey: 'languageId' },
  { code: 'ur', name: 'Urdu', nameKey: 'languageUr' },
];

export const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((language) => language.code !== 'auto');

export function resolvePreferredLanguage(locale: string): string {
  const normalized = locale.replaceAll('_', '-').toLowerCase();
  return TARGET_LANGUAGE_OPTIONS.find((option) => option.code.toLowerCase() === normalized)?.code
    ?? TARGET_LANGUAGE_OPTIONS.find((option) => option.code.toLowerCase() === normalized.split('-')[0])?.code
    ?? 'en';
}

export function localizeLanguageOptions(
  options: LanguageOption[],
  appLanguage?: AppLanguage,
): LanguageOption[] {
  return options.map((option) => ({
    ...option,
    name: t(option.nameKey, undefined, appLanguage),
  }));
}

export function getLanguageName(code: string, appLanguage?: AppLanguage): string {
  const language = LANGUAGE_OPTIONS.find((option) => option.code === code);
  return language ? t(language.nameKey, undefined, appLanguage) : code;
}
