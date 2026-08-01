import { t, type AppLanguage, type I18nKey } from './i18n';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; labelKey: I18nKey }> = [
  { value: 'system', labelKey: 'optionSystemTheme' },
  { value: 'light', labelKey: 'optionLightTheme' },
  { value: 'dark', labelKey: 'optionDarkTheme' },
];

export function getThemeModeOptions(appLanguage?: AppLanguage): Array<{ value: ThemeMode; label: string }> {
  return THEME_MODE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey, undefined, appLanguage),
  }));
}
