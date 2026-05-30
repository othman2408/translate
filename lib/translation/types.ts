import type { I18nKey } from '@/lib/i18n';
import type { TranslationErrorCode } from '@/lib/messages';
import type { ProviderType } from '@/lib/settings';

export type TranslationProviderRequest = {
  text: string;
  sourceLanguage: 'auto' | string;
  targetLanguage: string;
};

export type TranslationProviderResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  fromCache?: boolean;
};

export type TranslationProviderErrorOptions = {
  code: TranslationErrorCode;
  messageKey: I18nKey;
  providerMessage?: string;
};

export class TranslationProviderError extends Error {
  readonly code: TranslationErrorCode;
  readonly messageKey: I18nKey;
  readonly providerMessage?: string;

  constructor(options: TranslationProviderErrorOptions) {
    super(options.providerMessage ?? options.messageKey);
    this.name = 'TranslationProviderError';
    this.code = options.code;
    this.messageKey = options.messageKey;
    this.providerMessage = options.providerMessage;
  }
}

export interface ITranslationProvider {
  readonly providerType: ProviderType;
  readonly providerName: string;
  readonly supportedLanguages: readonly string[];

  translate(request: TranslationProviderRequest): Promise<TranslationProviderResult>;
}
