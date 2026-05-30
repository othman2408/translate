import { Button } from '@base-ui/react';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { t } from '@/lib/i18n';

import { SaveState } from './SaveState';
import type { SaveState as SaveStateValue } from '../types';

export function AppHeader({
  title,
  icon,
  saveState,
  onBack,
}: {
  title: string;
  icon?: ReactNode;
  saveState: SaveStateValue;
  onBack?: () => void;
}) {
  return (
    <header className="app-header">
      {onBack && (
        <Button className="back-icon-button" type="button" aria-label={t('actionBack')} onClick={onBack}>
          <ChevronLeft size={20} />
        </Button>
      )}
      <div className="app-header__lockup">
        {icon && (
          <div className="app-header__mark" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="app-header__copy">
          <h1>{title}</h1>
        </div>
      </div>
      <SaveState state={saveState} />
    </header>
  );
}
