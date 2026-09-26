import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Maximize2, Minimize2, MoveDiagonal2, X } from 'lucide-react';

import type { ReaderLayout, ReaderModeSize, ResultPopupSize } from '@/lib/settings';

import { ReaderFrame } from '@/lib/components/ReaderFrame';
import { ReaderLayoutControl } from '@/lib/components/ReaderLayoutControl';
import { t, type AppLanguage } from '@/lib/i18n';

import type { ResizeEdges } from './floating-geometry';
import type { OverlayPosition } from './types';
import { useFloatingPopupInteraction } from './use-floating-popup-interaction';

type FloatingPopupProps = {
  children: ReactNode;
  className: string;
  closeLabel: string;
  collapseReaderLabel: string;
  dir: string;
  lang: string;
  position: OverlayPosition;
  readerLabel: string;
  readerModeSize: ReaderModeSize;
  readerLayout: ReaderLayout;
  appLanguage: AppLanguage;
  resizeLabel: string;
  size: ResultPopupSize;
  themeMode: string;
  title: ReactNode;
  allowReaderMode: boolean;
  readerRequestId?: number;
  onClose: () => void;
  onMove: (position: OverlayPosition) => void;
  onResize: (size: ResultPopupSize, position: OverlayPosition) => void;
};

type ResizeHandle = {
  name: string;
  edges: ResizeEdges;
  primary?: boolean;
};

const RESIZE_HANDLES: ResizeHandle[] = [
  { name: 'top', edges: { top: true } },
  { name: 'right', edges: { right: true } },
  { name: 'bottom', edges: { bottom: true } },
  { name: 'left', edges: { left: true } },
  { name: 'top-right', edges: { top: true, right: true } },
  { name: 'bottom-right', edges: { bottom: true, right: true }, primary: true },
  { name: 'bottom-left', edges: { bottom: true, left: true } },
  { name: 'top-left', edges: { top: true, left: true } },
];

export function FloatingPopup({
  children,
  className,
  closeLabel,
  collapseReaderLabel,
  dir,
  lang,
  position,
  readerLabel,
  readerModeSize,
  readerLayout,
  appLanguage,
  resizeLabel,
  size,
  themeMode,
  title,
  allowReaderMode,
  readerRequestId,
  onClose,
  onMove,
  onResize,
}: FloatingPopupProps) {
  const [readerMode, setReaderMode] = useState(readerRequestId !== undefined);
  useEffect(() => { if (readerRequestId !== undefined) setReaderMode(true); }, [readerRequestId]);
  const [layout, setLayout] = useState(readerLayout);
  useEffect(() => setLayout(readerLayout), [readerLayout]);
  const interaction = useFloatingPopupInteraction({ position, size, onMove, onResize });

  useEffect(() => {
    if (!allowReaderMode) {
      setReaderMode(false);
    }
  }, [allowReaderMode]);

  const cardHeader = (
      <header
        className="translation-card__header"
        onPointerDown={(event) => {
          if (!readerMode && !isInteractiveTarget(event.target)) {
            interaction.startDrag(event);
          }
        }}
        onDoubleClick={(event) => {
          if (allowReaderMode && !isInteractiveTarget(event.target)) {
            setReaderMode((current) => !current);
          }
        }}
      >
        <div className="translation-card__title">{title}</div>
        <div className="translation-card__header-actions">
          {readerMode && <ReaderLayoutControl value={layout} onChange={setLayout} appLanguage={appLanguage} />}
          {allowReaderMode && (
            <button
              className="icon-control"
              type="button"
              title={readerMode ? collapseReaderLabel : readerLabel}
              aria-label={readerMode ? collapseReaderLabel : readerLabel}
              onClick={() => setReaderMode((current) => !current)}
            >
              {readerMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button
            className="icon-control"
            type="button"
            title={closeLabel}
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </header>
  );
  const cardContent = <>{cardHeader}{children}</>;

  if (readerMode) {
    return (
      <ReaderFrame
        header={cardHeader}
        appLanguage={appLanguage}
        className={className}
        size={readerModeSize}
        layout={layout}
        themeMode={themeMode}
        dir={dir}
        lang={lang}
        label={t('actionOpenReader', undefined, appLanguage)}
        onDismiss={() => setReaderMode(false)}
      >
        {children}
      </ReaderFrame>
    );
  }

  const style: CSSProperties = {
    transform: `translate3d(${interaction.geometry.position.left}px, ${interaction.geometry.position.top}px, 0)`,
    width: interaction.geometry.size.width,
    height: interaction.geometry.size.height,
  };

  return (
    <div className="translation-popup-layer">
      <section
        ref={interaction.popupRef}
        className={className}
        data-theme-mode={themeMode}
        style={style}
        aria-live="polite"
        dir={dir}
        lang={lang}
        onPointerMove={interaction.updateInteraction}
        onPointerUp={interaction.finishInteraction}
        onPointerCancel={interaction.finishInteraction}
        onLostPointerCapture={interaction.finishInteraction}
      >
        {cardContent}
        {RESIZE_HANDLES.map((handle) => (
          <span
            key={handle.name}
            className={`translation-card__resize-zone translation-card__resize-zone--${handle.name}`}
            data-no-drag
            role={handle.primary ? 'separator' : undefined}
            aria-hidden={handle.primary ? undefined : true}
            aria-label={handle.primary ? resizeLabel : undefined}
            tabIndex={handle.primary ? 0 : -1}
            onKeyDown={handle.primary ? interaction.resizeWithKeyboard : undefined}
            onPointerDown={(event) => interaction.startResize(event, handle.edges)}
          >
            {handle.primary && <MoveDiagonal2 size={16} aria-hidden />}
          </span>
        ))}
      </section>
    </div>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && Boolean(target.closest('button, a, input, textarea, select, [data-no-drag]'));
}
