import type { ReactNode } from 'react';

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <span className="setting-row__copy">
        <strong className="setting-label">{label}</strong>
        {description && <small className="setting-description">{description}</small>}
      </span>
      <span className="setting-row__control">{children}</span>
    </div>
  );
}
