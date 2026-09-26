import { KeyRound } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';
import { ProviderSettingsButton } from './ProviderSettingsButton';

export function ProviderSetupPrompt({ ai, appLanguage, onRetry }: { ai: boolean; appLanguage: AppLanguage; onRetry?: () => void }) {
  const label = (key: Parameters<typeof t>[0]) => t(key, undefined, appLanguage);
  return <div className="provider-setup" role="status">
    <div className="provider-setup__icon"><KeyRound size={24} aria-hidden="true" /></div>
    <h2>{label(ai ? 'setupAiTitle' : 'setupTranslationTitle')}</h2>
    <p>{label(ai ? 'setupAiDescription' : 'setupTranslationDescription')}</p>
    <ProviderSettingsButton ai={ai} appLanguage={appLanguage} />
    {onRetry && <button className="provider-setup__secondary" type="button" onClick={onRetry}>{label('actionRetry')}</button>}
    <small>{label('setupReturnHint')}</small>
  </div>;
}
