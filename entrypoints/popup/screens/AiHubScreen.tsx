import { KeyRound, PenLine, Settings2, ShieldCheck, Sparkles } from 'lucide-react';

import { t } from '@/lib/i18n';

import { AppHeader } from '../components/AppHeader';
import { NavigationList } from '../components/NavigationList';
import type { NavItem, SaveState, Screen } from '../types';

export function AiHubScreen({
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
      screen: 'ai-behavior',
      title: t('titleAiBehavior'),
      icon: <Settings2 size={17} />,
    },
    {
      screen: 'ai-rewrite',
      title: t('rewriteTitle'),
      icon: <PenLine size={17} />,
    },
    {
      screen: 'ai-explain',
      title: t('explainTitle'),
      icon: <Sparkles size={17} />,
    },
    {
      screen: 'ai-providers',
      title: t('titleAiProviders'),
      icon: <KeyRound size={17} />,
    },
  ];

  return (
    <section className="screen screen--settings" aria-label={t('settingsScreenAria', t('titleAi'))}>
      <AppHeader title={t('titleAi')} saveState={saveState} onBack={onBack} />
      <div className="provider-global-note provider-global-note--top">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{t('aiLocalOnlyNote')}</span>
      </div>
      <NavigationList items={navItems} onNavigate={onNavigate} />
    </section>
  );
}
