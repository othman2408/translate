import { Check } from 'lucide-react';

import { t } from '@/lib/i18n';

import type { SaveState as SaveStateValue } from '../types';

export function SaveState({ state }: { state: SaveStateValue }) {
  return (
    <span className="save-state" aria-live="polite">
      {state === 'saved' && (
        <>
          <Check size={14} />
          {t('saved')}
        </>
      )}
    </span>
  );
}
