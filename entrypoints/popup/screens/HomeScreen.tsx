import { browser } from '#imports';
import { Switch } from '@base-ui/react';
import { Languages, PenLine, Settings2, Sparkles } from 'lucide-react';

import { t } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/settings';
import { LOCAL_FILES_SITE_KEY } from '@/lib/sites';

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
    currentSiteKey,
    isCurrentSiteEnabled,
    isLoadingSite,
    isFileAccessBlocked,
    isSiteSupported,
    updateCurrentSiteEnabled,
  } = useCurrentSiteToggle(
    settings.disabledHosts,
    (disabledHosts) => onUpdate('disabledHosts', disabledHosts),
  );
  const isLocalFiles = currentSiteKey === LOCAL_FILES_SITE_KEY;
  const siteLabel = isLocalFiles
    ? t('siteToggleLocalFiles') : currentSiteKey ?? t('siteToggleCurrentSite');
  const siteDescription = isSiteSupported ? siteLabel : t('siteToggleUnsupported');

  return (
    <section className="screen screen--home" aria-label={t('ariaTranslateSettings')}>
      <div className="home-brand" aria-label={t('appTitle')}>
        <img className="home-brand__logo" src="/icon/logo.svg" alt="" />
        <div className="home-status-strip" aria-label={t('groupBehavior')}>
          {isLoadingSite ? (
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
              aria-label={siteLabel}
              aria-describedby={isFileAccessBlocked ? 'file-access-note' : undefined}
              onCheckedChange={updateCurrentSiteEnabled}
              title={isFileAccessBlocked ? t('fileAccessRequired') : siteDescription}
            >
              {!isLocalFiles && <Languages size={14} aria-hidden="true" />}
              <span>{isLocalFiles ? siteLabel : t('translationTitle')}</span>
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

      {isFileAccessBlocked && (
        <p id="file-access-note" className="quiet-note" role="status">{t('fileAccessRequired')}</p>
      )}

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
