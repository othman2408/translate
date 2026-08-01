import { browser } from '#imports';
import { Switch } from '@base-ui/react';
import { Languages, PenLine, Settings2, Sparkles } from 'lucide-react';

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
        <div className="home-status-strip" aria-label={t('groupBehavior')}>
          {isLoadingHost ? (
            <span className="home-status-toggle home-status-toggle--loading" aria-hidden="true">
              <Languages size={14} />
              <span>{t('translationTitle')}</span>
              <span className="home-status-toggle__dot" />
            </span>
          ) : (
            <Switch.Root
              className="home-status-toggle"
              data-kind="translation"
              checked={isCurrentSiteEnabled}
              disabled={!isSiteSupported}
              aria-label={isSiteSupported ? currentHost ?? t('siteToggleCurrentSite') : t('siteToggleUnsupported')}
              onCheckedChange={updateCurrentSiteEnabled}
              title={isSiteSupported ? currentHost ?? t('siteToggleCurrentSite') : t('siteToggleUnsupported')}
            >
              <Languages size={14} aria-hidden="true" />
              <span>{t('translationTitle')}</span>
              <span className="home-status-toggle__dot" />
            </Switch.Root>
          )}

          <Switch.Root
            className="home-status-toggle"
            data-kind="ai"
            checked={settings.aiRewriteEnabled}
            aria-label={t('aiRewriteEnabled')}
            onCheckedChange={(checked) => onUpdate('aiRewriteEnabled', checked)}
            title={t('aiRewriteEnabled')}
          >
            <PenLine size={14} aria-hidden="true" />
            <span>{t('rewriteTitle')}</span>
            <span className="home-status-toggle__dot" />
          </Switch.Root>

          <Switch.Root
            className="home-status-toggle"
            data-kind="ai"
            checked={settings.aiExplainEnabled}
            aria-label={t('aiExplainEnabled')}
            onCheckedChange={(checked) => onUpdate('aiExplainEnabled', checked)}
            title={t('aiExplainEnabled')}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>{t('explainTitle')}</span>
            <span className="home-status-toggle__dot" />
          </Switch.Root>
        </div>
      </div>

      <ManualTranslator settings={settings} onUpdate={onUpdate} />

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
