import { browser } from '#imports';
import { useState } from 'react';
import { KeyRound, Settings2 } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';

export function ProviderSetupPrompt({ ai, appLanguage }: { ai: boolean; appLanguage: AppLanguage }) {
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = (key: Parameters<typeof t>[0]) => t(key, undefined, appLanguage);
  async function openSettings() {
    setOpening(true);
    setFailed(false);
    try {
      const response = await browser.runtime.sendMessage({ type: 'OPEN_PROVIDER_SETTINGS', provider: ai ? 'ai' : 'translation' });
      if (!response?.ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setOpening(false);
    }
  }
  return <div className="provider-setup" role="status">
    <div className="provider-setup__icon"><KeyRound size={24} aria-hidden="true" /></div>
    <h2>{label(ai ? 'setupAiTitle' : 'setupTranslationTitle')}</h2>
    <p>{label(ai ? 'setupAiDescription' : 'setupTranslationDescription')}</p>
    <button type="button" disabled={opening} onClick={() => void openSettings()}>
      <Settings2 size={15} aria-hidden="true" />{label('setupOpenSettings')}
    </button>
    <small>{label('setupReturnHint')}</small>
    {failed && <p role="alert">{label('setupOpenFailed')}</p>}
  </div>;
}
