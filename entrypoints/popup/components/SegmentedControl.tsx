import { Button } from '@base-ui/react';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  const id = useId();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="segmented-control" role="radiogroup">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Button
            key={option.value}
            className="segmented-control__button"
            data-active={isActive}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
          >
            {isActive && (
              <motion.span
                className="segmented-control__thumb"
                layoutId={`${id}-segmented-thumb`}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }
                }
              />
            )}
            <span className="segmented-control__label">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
