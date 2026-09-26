import { browser } from '#imports';
import { useEffect, useRef, useState } from 'react';

import { t, type AppLanguage } from '../i18n';
import type { ProviderTestCredentials, ProviderTestResponse } from '../messages';

export function ProviderConnectionTest({ credentials, appLanguage }: {
  credentials: ProviderTestCredentials;
  appLanguage?: AppLanguage;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ProviderTestResponse>();
  const revision = useRef(0);
  const model = credentials.type === 'google-v2' ? '' : credentials.model;
  const canTest = Boolean(credentials.apiKey.trim())
    && (credentials.type === 'google-v2' || Boolean(model.trim()));

  useEffect(() => {
    revision.current++;
    setTesting(false);
    setResult(undefined);
    return () => { revision.current++; };
  }, [credentials.type, credentials.apiKey, model]);

  async function test() {
    if (testing || !canTest) return;
    const current = ++revision.current;
    const failure: ProviderTestResponse = {
      ok: false,
      error: { code: 'network', message: t('errorNetwork', undefined, appLanguage) },
    };
    setTesting(true);
    setResult(undefined);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'TEST_PROVIDER_CONNECTION', credentials,
      }) as ProviderTestResponse | undefined;
      if (current === revision.current) setResult(response ?? failure);
    } catch {
      if (current === revision.current) setResult(failure);
    } finally {
      if (current === revision.current) setTesting(false);
    }
  }

  return (
    <div className="provider-connection">
      <button
        type="button"
        className="provider-action-button"
        disabled={testing || !canTest}
        onClick={() => void test()}
      >
        {t(testing ? 'providerTesting' : 'providerTest', undefined, appLanguage)}
      </button>
      <small>{t('providerTestHint', undefined, appLanguage)}</small>
      {result && (
        <p role={result.ok ? 'status' : 'alert'}>
          {result.ok ? t('providerTestSuccess', undefined, appLanguage) : result.error.message}
        </p>
      )}
    </div>
  );
}
