import { Switch } from '@base-ui/react';

export function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-row__copy">
        <strong className="setting-label">{label}</strong>
        {description && <small className="setting-description">{description}</small>}
      </span>
      <Switch.Root
        className="switch"
        checked={checked}
        aria-label={label}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
    </div>
  );
}
