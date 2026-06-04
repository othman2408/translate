import { Database, History, Sparkles } from 'lucide-react';

import { t } from '@/lib/i18n';

import { AppHeader } from '../components/AppHeader';
import { NavigationList } from '../components/NavigationList';
import type { NavItem, SaveState, Screen } from '../types';

export function StorageHubScreen({
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
      screen: 'cache',
      title: t('titleCache'),
      icon: <Database size={17} />,
    },
    {
      screen: 'history',
      title: t('titleTranslationHistory'),
      icon: <History size={17} />,
    },
    {
      screen: 'ai-history',
      title: t('titleAiHistory'),
      icon: <Sparkles size={17} />,
    },
  ];

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', t('titleStorage'))}>
      <AppHeader title={t('titleStorage')} saveState={saveState} onBack={onBack} />
      <NavigationList items={navItems} onNavigate={onNavigate} />
    </section>
  );
}
