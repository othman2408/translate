import { Field, Select } from '@base-ui/react';
import { Check, ChevronDown } from 'lucide-react';

import { getLanguageName, type LanguageOption } from '@/lib/languages';

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
  options: LanguageOption[];
  onValueChange: (value: string) => void;
}) {
  const items = options.map((option) => ({ label: option.name, value: option.code }));

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
        items={items}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') {
            onValueChange(nextValue);
          }
        }}
      >
        <Select.Trigger className="select-trigger" aria-label={label}>
          <Select.Value>{(selectedValue) => getLanguageName(selectedValue ?? value)}</Select.Value>
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
                    key={option.code}
                    className="select-item"
                    value={option.code}
                    label={option.name}
                  >
                    <Select.ItemText>{option.name}</Select.ItemText>
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
