import { Button } from '@base-ui/react';
import { ChevronRight } from 'lucide-react';

import { t } from '@/lib/i18n';

import type { NavItem, Screen } from '../types';

export function NavigationList({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <section className="grouped-list" aria-label={t('ariaSettingsGroups')}>
      {items.map((item) => (
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
  );
}
