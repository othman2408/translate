import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import type { ResultPopupSize } from '@/lib/settings';

import { clampFloatingPopupPosition, clampFloatingPopupSize } from './floating-geometry';
import type { OverlayPosition } from './types';

type FloatingPopupProps = {
  children: ReactNode;
  className: string;
  closeLabel: string;
  resizeLabel: string;
  dir: string;
  lang: string;
  position: OverlayPosition;
  size: ResultPopupSize;
  themeMode: string;
  title: ReactNode;
  onClose: () => void;
  onMove: (position: OverlayPosition) => void;
  onResize: (size: ResultPopupSize, position: OverlayPosition) => void;
};

type CleanupFn = () => void;

export function FloatingPopup({
  children,
  className,
  closeLabel,
  resizeLabel,
  dir,
  lang,
  position,
  size,
  themeMode,
  title,
  onClose,
  onMove,
  onResize,
}: FloatingPopupProps) {
  const cleanupRef = useRef<CleanupFn | undefined>(undefined);
  const style: CSSProperties = {
    transform: `translate3d(${position.left}px, ${position.top}px, 0)`,
    width: `${size.width}px`,
    height: `${size.height}px`,
  };

  useEffect(() => () => cleanupRef.current?.(), []);

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (isDragBlocked(event.target)) {
      return;
    }

    event.preventDefault();
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startPosition = position;

    startPointerInteraction(
      cleanupRef,
      (moveEvent) => {
        onMove(clampFloatingPopupPosition({
          left: startPosition.left + moveEvent.clientX - startClientX,
          top: startPosition.top + moveEvent.clientY - startClientY,
        }, size));
      },
    );
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startSize = size;
    const startPosition = position;

    startPointerInteraction(
      cleanupRef,
      (moveEvent) => {
        const nextSize = clampFloatingPopupSize({
          width: startSize.width + moveEvent.clientX - startClientX,
          height: startSize.height + moveEvent.clientY - startClientY,
        }, startPosition);
        const nextPosition = clampFloatingPopupPosition(startPosition, nextSize);
        onResize(nextSize, nextPosition);
      },
    );
  };

  return (
    <section
      className={className}
      data-theme-mode={themeMode}
      style={style}
      aria-live="polite"
      dir={dir}
      lang={lang}
    >
      <header className="translation-card__header" onPointerDown={startDrag}>
        <div className="translation-card__title">{title}</div>
        <button
          className="icon-control"
          type="button"
          title={closeLabel}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>
      {children}
      <button
        className="translation-card__resize-handle"
        type="button"
        aria-label={resizeLabel}
        onPointerDown={startResize}
      />
    </section>
  );
}

function startPointerInteraction(
  cleanupRef: MutableRefObject<CleanupFn | undefined>,
  onMove: (event: PointerEvent) => void,
): void {
  cleanupRef.current?.();

  const handleMove = (event: PointerEvent) => {
    event.preventDefault();
    onMove(event);
  };
  const stop = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    cleanupRef.current = undefined;
  };

  window.addEventListener('pointermove', handleMove, { passive: false });
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
  cleanupRef.current = stop;
}

function isDragBlocked(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && Boolean(target.closest('button, a, input, textarea, select, [data-no-drag]'));
}
