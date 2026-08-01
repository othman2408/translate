import { KeyRound, Languages } from 'lucide-react';

import { t } from '@/lib/i18n';

import { AppHeader } from '../components/AppHeader';
import { NavigationList } from '../components/NavigationList';
import type { NavItem, SaveState, Screen } from '../types';

export function TranslationHubScreen({
  saveState,
  onBack,
  onNavigate,
}: {
  saveState: SaveState;
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  const navItems: NavItem[] = [
    {
      screen: 'translation-languages',
      title: t('titleLanguages'),
      icon: <Languages size={17} />,
    },
    {
      screen: 'translation-providers',
      title: t('titleTranslationProviders'),
      icon: <KeyRound size={17} />,
    },
  ];

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', t('titleTranslation'))}>
      <AppHeader title={t('titleTranslation')} saveState={saveState} onBack={onBack} />
      <NavigationList items={navItems} onNavigate={onNavigate} />
    </section>
  );
}
