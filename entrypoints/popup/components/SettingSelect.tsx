import { Field, Select } from '@base-ui/react';
import { Check, ChevronDown } from 'lucide-react';

export type SettingSelectOption = {
  label: string;
  value: string;
};

export function SettingSelect({
  label,
  description,
  value,
  options,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: SettingSelectOption[];
  onValueChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Field.Root className="setting-row">
      <span className="setting-row__copy">
        <Field.Label className="setting-label">{label}</Field.Label>
        {description && (
          <Field.Description className="setting-description">{description}</Field.Description>
        )}
      </span>
      <Select.Root<string>
        value={value}
        items={options}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') {
            onValueChange(nextValue);
          }
        }}
      >
        <Select.Trigger className="select-trigger" aria-label={label}>
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
    </Field.Root>
  );
}
