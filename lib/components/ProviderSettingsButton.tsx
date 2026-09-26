import { browser } from '#imports';
import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';

export function ProviderSettingsButton({ ai, appLanguage }: { ai: boolean; appLanguage: AppLanguage }) {
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  async function open() {
    setOpening(true);
    setFailed(false);
    try {
      const result = await browser.runtime.sendMessage({ type: 'OPEN_PROVIDER_SETTINGS', provider: ai ? 'ai' : 'translation' });
      setFailed(result?.ok !== true);
    } catch { setFailed(true); }
    finally { setOpening(false); }
  }
  return <>
    <button type="button" disabled={opening} onClick={() => void open()}>
      <Settings2 size={15} aria-hidden="true" />{t('setupOpenSettings', undefined, appLanguage)}
    </button>
    {failed && <p role="alert">{t('setupOpenFailed', undefined, appLanguage)}</p>}
  </>;
}
