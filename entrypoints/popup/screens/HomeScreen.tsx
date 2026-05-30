import { browser } from '#imports';
import { Button, Switch } from '@base-ui/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';
import { getHttpHost, isHostDisabled } from '@/lib/sites';

import type { NavItem, Screen, SettingUpdateHandler } from '../types';

export function HomeScreen({
  navItems,
  settings,
  onNavigate,
  onUpdate,
}: {
  navItems: NavItem[];
  settings: ExtensionSettings;
  onNavigate: (screen: Screen) => void;
  onUpdate: SettingUpdateHandler;
}) {
  const appVersion = browser.runtime.getManifest().version;
  const [currentHost, setCurrentHost] = useState<string | null>(null);
  const [isLoadingHost, setIsLoadingHost] = useState(true);
  const isSiteSupported = !isLoadingHost && Boolean(currentHost);
  const isCurrentSiteEnabled = currentHost ? !isHostDisabled(currentHost, settings.disabledHosts) : false;

  useEffect(() => {
    let active = true;

    void getActiveTabHost().then((host) => {
      if (active) {
        setCurrentHost(host);
        setIsLoadingHost(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function updateCurrentSiteEnabled(enabled: boolean): void {
    if (!currentHost) {
      return;
    }

    const disabledHosts = enabled
      ? settings.disabledHosts.filter((host) => host !== currentHost)
      : [...settings.disabledHosts, currentHost];

    onUpdate('disabledHosts', disabledHosts);
  }

  return (
    <section className="screen screen--home" aria-label={t('ariaTranslateSettings')}>
      <div className="home-brand" aria-label={t('appTitle')}>
        <img className="home-brand__logo" src="/icon/logo.svg" alt="" />
      </div>

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

      <section className="grouped-list" aria-label={t('ariaSettingsGroups')}>
        {navItems.map((item) => (
          <Button
            key={item.screen}
            className="nav-row"
            type="button"
            onClick={() => onNavigate(item.screen)}
          >
            <span className="nav-row__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-row__copy">
              <strong>{item.title}</strong>
            </span>
            <ChevronRight className="nav-row__chevron" size={16} aria-hidden="true" />
          </Button>
        ))}
      </section>

      <p className="app-version">v{appVersion}</p>
    </section>
  );
}

async function getActiveTabHost(): Promise<string | null> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.url) {
    return null;
  }

  return getHttpHost(activeTab.url);
}
