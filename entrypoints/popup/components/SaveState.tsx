import { Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { t } from '@/lib/i18n';

import type { SaveState as SaveStateValue } from '../types';

export function SaveState({ state }: { state: SaveStateValue }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className="save-state" aria-live="polite">
      <AnimatePresence initial={false}>
        {state === 'saved' && (
          <motion.span
            className="save-state__content"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.98 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.25, 1, 0.5, 1] }
            }
          >
            <Check size={14} />
            {t('saved')}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
