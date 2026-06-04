import { Select } from '@base-ui/react';
import { Check, ChevronDown } from 'lucide-react';

type ProviderSelectOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export function ProviderSelect<TValue extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: TValue;
  options: readonly ProviderSelectOption<TValue>[];
  onValueChange: (value: TValue) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <span className="provider-select-field">
      <span className="setting-label">{label}</span>
      <Select.Root<TValue>
        value={value}
        items={options}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') {
            onValueChange(nextValue as TValue);
          }
        }}
      >
        <Select.Trigger className="select-trigger select-trigger--full" aria-label={label}>
          <Select.Value>
            {(selectedValue) => (
              options.find((option) => option.value === selectedValue)?.label
              ?? selectedOption?.label
              ?? value
            )}
          </Select.Value>
          <Select.Icon className="select-trigger__icon">
            <ChevronDown size={14} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className="select-positioner"
            sideOffset={6}
            alignItemWithTrigger={false}
          >
            <Select.Popup className="select-popup">
              <Select.List className="select-list">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    className="select-item"
                    value={option.value}
                    label={option.label}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="select-item__indicator">
                      <Check size={13} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </span>
  );
}
