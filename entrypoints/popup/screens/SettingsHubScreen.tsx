import { t } from '@/lib/i18n';

import { AppHeader } from '../components/AppHeader';
import { NavigationList } from '../components/NavigationList';
import type { NavItem, SaveState, Screen } from '../types';

export function SettingsHubScreen({
  navItems,
  saveState,
  onBack,
  onNavigate,
}: {
  navItems: NavItem[];
  saveState: SaveState;
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', t('titleSettings'))}>
      <AppHeader title={t('titleSettings')} saveState={saveState} onBack={onBack} />
      <NavigationList items={navItems} onNavigate={onNavigate} />
    </section>
  );
}
