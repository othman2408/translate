import { AiProviderFactory } from './ai/factory';
import { AiProviderError } from './ai/types';
import { t, type AppLanguage } from './i18n';
import type { ProviderTestCredentials, ProviderTestResponse } from './messages';
import { GoogleTranslationProvider } from './translation/google';
import { TranslationProviderError } from './translation/types';

// Explicit draft verification: bypass saved settings, caches, and history.
export async function testProviderConnection(credentials: ProviderTestCredentials, language: AppLanguage): Promise<ProviderTestResponse> {
  try {
    const config = { ...credentials, apiKey: credentials.apiKey.trim(), id: 'connection-test', name: 'Connection test' };
    const abortSignal = AbortSignal.timeout(30_000);
    if (config.type === 'google-v2') {
      await new GoogleTranslationProvider(config).translate({ text: 'Hello', sourceLanguage: 'en', targetLanguage: 'ar', abortSignal });
    } else {
      await new AiProviderFactory().createProvider({ ...config, model: config.model.trim() }).runTextAction({ action: 'explain', text: 'Hello', prompt: 'Reply with OK.', language: 'en' }, { abortSignal });
    }
    return { ok: true };
  } catch (error) {
    const known = error instanceof AiProviderError || error instanceof TranslationProviderError;
    return { ok: false, error: { code: known ? error.code : 'network', message: t(known ? error.messageKey : 'errorNetwork', undefined, language) } };
  }
}
