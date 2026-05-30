export type LanguageOption = {
  code: string;
  name: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'auto', name: 'Auto detect' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ur', name: 'Urdu' },
];

export const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((language) => language.code !== 'auto');

export function getLanguageName(code: string): string {
  return LANGUAGE_OPTIONS.find((language) => language.code === code)?.name ?? code;
}
