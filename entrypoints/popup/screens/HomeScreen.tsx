import { browser } from '#imports';
import { Button } from '@base-ui/react';
import { ChevronRight } from 'lucide-react';

import { t } from '@/lib/i18n';

import { AppHeader } from '../components/AppHeader';
import type { NavItem, SaveState as SaveStateValue, Screen } from '../types';

export function HomeScreen({
  navItems,
  saveState,
  onNavigate,
}: {
  navItems: NavItem[];
  saveState: SaveStateValue;
  onNavigate: (screen: Screen) => void;
}) {
  const appVersion = browser.runtime.getManifest().version;

  return (
    <section className="screen screen--home" aria-label={t('ariaTranslateSettings')}>
      <AppHeader
        title={t('appTitle')}
        saveState={saveState}
      />

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
