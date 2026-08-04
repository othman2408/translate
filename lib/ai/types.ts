import type { I18nKey } from '@/lib/i18n';
import type { AiActionErrorCode, AiActionType } from '@/lib/messages';
import type { AiProviderType } from '@/lib/settings';

export type AiTextActionProviderRequest = {
  action: AiActionType;
  text: string;
  prompt: string;
  language?: string;
};

export type AiTextActionProviderResult = {
  resultText: string;
  model: string;
};

export type AiTextActionRunOptions = {
  abortSignal?: AbortSignal;
  onTextDelta?: (textDelta: string) => void;
};

export type AiProviderErrorOptions = {
  code: AiActionErrorCode;
  messageKey: I18nKey;
  providerMessage?: string;
};

export class AiProviderError extends Error {
  readonly code: AiActionErrorCode;
  readonly messageKey: I18nKey;
  readonly providerMessage?: string;

  constructor(options: AiProviderErrorOptions) {
    super(options.providerMessage ?? options.messageKey);
    this.name = 'AiProviderError';
    this.code = options.code;
    this.messageKey = options.messageKey;
    this.providerMessage = options.providerMessage;
  }
}

export interface IAiProvider {
  readonly providerType: AiProviderType;
  readonly providerName: string;

  runTextAction(
    request: AiTextActionProviderRequest,
    options?: AiTextActionRunOptions,
  ): Promise<AiTextActionProviderResult>;
}
