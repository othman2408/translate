import { browser } from '#imports';
import { Switch } from '@base-ui/react';
import { Settings2 } from 'lucide-react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';

import { ManualTranslator } from '../components/ManualTranslator';
import { NavigationList } from '../components/NavigationList';
import { useCurrentSiteToggle } from '../hooks/useCurrentSiteToggle';
import type { Screen, SettingUpdateHandler } from '../types';

export function HomeScreen({
  settings,
  onNavigate,
  onUpdate,
}: {
  settings: ExtensionSettings;
  onNavigate: (screen: Screen) => void;
  onUpdate: SettingUpdateHandler;
}) {
  const appVersion = browser.runtime.getManifest().version;
  const {
    currentHost,
    isCurrentSiteEnabled,
    isLoadingHost,
    isSiteSupported,
    updateCurrentSiteEnabled,
  } = useCurrentSiteToggle(
    settings.disabledHosts,
    (disabledHosts) => onUpdate('disabledHosts', disabledHosts),
  );

  return (
    <section className="screen screen--home" aria-label={t('ariaTranslateSettings')}>
      <div className="home-brand" aria-label={t('appTitle')}>
        <img className="home-brand__logo" src="/icon/logo.svg" alt="" />
      </div>

      <ManualTranslator settings={settings} onUpdate={onUpdate} />

      <div className="site-switch-card">
        <span className="site-switch-card__copy">
          <strong>{isSiteSupported ? currentHost : t('siteToggleUnavailable')}</strong>
          <small>{isLoadingHost || isSiteSupported ? t('siteToggleCurrentSite') : t('siteToggleUnsupported')}</small>
        </span>
        {isLoadingHost ? (
          <span className="site-switch site-switch--loading" aria-hidden="true" />
        ) : (
          <Switch.Root
            className="site-switch"
            checked={isCurrentSiteEnabled}
            disabled={!isSiteSupported}
            aria-label={isSiteSupported ? currentHost ?? t('siteToggleCurrentSite') : t('siteToggleUnsupported')}
            onCheckedChange={updateCurrentSiteEnabled}
          >
            <Switch.Thumb className="site-switch__thumb" />
          </Switch.Root>
        )}
      </div>

      <NavigationList
        items={[{
          screen: 'settings',
          title: t('titleSettings'),
          icon: <Settings2 size={17} />,
        }]}
        onNavigate={onNavigate}
      />

      <p className="app-version">v{appVersion}</p>
    </section>
  );
}
