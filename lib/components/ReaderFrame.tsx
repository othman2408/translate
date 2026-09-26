import { TranslationAlternatives } from './TranslationAlternatives';
import { useEffect, useRef, type ReactNode } from 'react';
import { ReaderToolsContext, ReaderToolsToolbar, useReaderToolsState } from './ReaderTools';
import type { AppLanguage } from '@/lib/i18n';
import type { ReaderModeSize, ReaderLayout } from '@/lib/settings';

// Text direction is owned by each panel; surrounding reader controls follow
// the app language.
export function ReaderFrame({ children, header, appLanguage, className = '', size, layout, themeMode, dir, lang, label, onDismiss, modal = true }: {
  children: ReactNode;
  header: ReactNode;
  appLanguage: AppLanguage;
  className?: string;
  size: ReaderModeSize;
  layout: ReaderLayout;
  themeMode: string;
  dir: string;
  lang: string;
  label: string;
  onDismiss?: () => void;
  modal?: boolean;
}) {
  const tools = useReaderToolsState();
  const ref = useRef<HTMLElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  return (
    <ReaderToolsContext.Provider value={tools}>
    <div
      className={`translation-reader-layer${modal ? '' : ' translation-reader-layer--page'}`}
      data-reader-size={size}
      data-theme-mode={themeMode}
      onPointerDown={(event) => {
        if (modal && event.target === event.currentTarget) dismissRef.current?.();
      }}
    >
      <section
        ref={ref}
        className={`translation-card translation-card--reader ${className}`}
        data-theme-mode={themeMode}
        data-reader-layout={layout}
        role={modal ? 'dialog' : 'region'}
        aria-modal={modal || undefined}
        aria-label={label}
        tabIndex={-1}
        dir={dir}
        lang={lang}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            event.stopPropagation();
            tools.searchRef.current?.focus();
            tools.searchRef.current?.select();
          }
          if (event.key === 'Escape' && tools.alternatives.open) {
            event.preventDefault();
            event.stopPropagation();
            tools.alternatives.dismiss();
            ref.current?.querySelector<HTMLButtonElement>('.reader-alternatives__action')?.focus();
            return;
          }
          if (event.key === 'Escape' && tools.query) {
            event.preventDefault();
            event.stopPropagation();
            tools.setQuery('');
            tools.searchRef.current?.focus();
            return;
          }
          if (!modal) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            dismissRef.current?.();
          }
          if (event.key === 'Tab') {
            const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []);
            const first = items[0];
            const last = items.at(-1);
            const active = ref.current?.getRootNode() as Document | ShadowRoot | undefined;
            if (!first) event.preventDefault();
            else if (event.shiftKey && (active?.activeElement === first || active?.activeElement === ref.current)) {
              event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && active?.activeElement === last) {
              event.preventDefault(); first.focus();
            }
          }
        }}
      >
        {header}
        <ReaderToolsToolbar tools={tools} appLanguage={appLanguage} editable={!modal} />
        {children}
        <TranslationAlternatives state={tools.alternatives} appLanguage={appLanguage} />
      </section>
    </div>
    </ReaderToolsContext.Provider>
  );
}
