export type TextDirection = 'ltr' | 'rtl';

const RTL_LANGUAGE_PREFIXES = ['ar', 'fa', 'he', 'iw', 'ps', 'ur', 'yi'];
const RTL_CHARACTER_PATTERN =
  /[\u0591-\u07FF\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const LTR_CHARACTER_PATTERN = /[A-Za-z\u00C0-\u02AF\u0370-\u052F]/;

export function getTextDirection(text: string, fallbackLanguage?: string): TextDirection {
  for (const character of text) {
    if (RTL_CHARACTER_PATTERN.test(character)) {
      return 'rtl';
    }

    if (LTR_CHARACTER_PATTERN.test(character)) {
      return 'ltr';
    }
  }

  return isRtlLanguage(fallbackLanguage) ? 'rtl' : 'ltr';
}

export function getTextLanguage(language?: string): string | undefined {
  if (!language || language === 'auto') {
    return undefined;
  }

  return language;
}

export function getTextAlign(direction: TextDirection): 'left' | 'right' {
  return direction === 'rtl' ? 'right' : 'left';
}

export function isRtlLanguage(language?: string): boolean {
  if (!language || language === 'auto') {
    return false;
  }

  const normalizedLanguage = language.toLowerCase();
  return RTL_LANGUAGE_PREFIXES.some(
    (prefix) => normalizedLanguage === prefix || normalizedLanguage.startsWith(`${prefix}-`),
  );
}
