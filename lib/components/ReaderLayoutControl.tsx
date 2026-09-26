import { Columns2, Rows2 } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';
import type { ReaderLayout } from '@/lib/settings';

export function ReaderLayoutControl({ value, onChange, appLanguage }: {
  value: ReaderLayout;
  onChange: (value: ReaderLayout) => void;
  appLanguage: AppLanguage;
}) {
  return (
    <div className="reader-layout-control" role="group" aria-label={t('labelReaderLayout', undefined, appLanguage)}>
      {(['stacked', 'columns'] as const).map((layout) => (
        <button
          key={layout}
          type="button"
          className="icon-control"
          aria-pressed={value === layout}
          aria-label={t(layout === 'stacked' ? 'optionReaderStacked' : 'optionReaderColumns', undefined, appLanguage)}
          title={t(layout === 'stacked' ? 'optionReaderStacked' : 'optionReaderColumns', undefined, appLanguage)}
          onClick={() => onChange(layout)}
        >
          {layout === 'stacked' ? <Rows2 size={16} /> : <Columns2 size={16} />}
        </button>
      ))}
    </div>
  );
}
