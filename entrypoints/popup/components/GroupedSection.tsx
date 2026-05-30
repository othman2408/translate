import type { ReactNode } from 'react';

export function GroupedSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-label={label}>
      <h2>{label}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}
