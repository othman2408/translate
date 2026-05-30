import { Button } from '@base-ui/react';

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="segmented-control" role="radiogroup">
      {options.map((option) => (
        <Button
          key={option.value}
          className="segmented-control__button"
          data-active={option.value === value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
