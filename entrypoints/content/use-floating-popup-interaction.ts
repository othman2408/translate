import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { ResultPopupSize } from '@/lib/settings';

import {
  clampFloatingPopupPosition,
  fitFloatingPopupGeometry,
  resizeFloatingPopupGeometry,
  type PopupGeometry,
  type ResizeEdges,
} from './floating-geometry';
import type { OverlayPosition } from './types';

type PointerInteraction = {
  pointerId: number;
  kind: 'drag' | 'resize';
  startClientX: number;
  startClientY: number;
  startGeometry: PopupGeometry;
  edges?: ResizeEdges;
};

export function useFloatingPopupInteraction({
  position,
  size,
  onMove,
  onResize,
}: {
  position: OverlayPosition;
  size: ResultPopupSize;
  onMove: (position: OverlayPosition) => void;
  onResize: (size: ResultPopupSize, position: OverlayPosition) => void;
}) {
  const [geometry, setGeometry] = useState<PopupGeometry>(() => fitFloatingPopupGeometry(position, size));
  const popupRef = useRef<HTMLElement>(null);
  const geometryRef = useRef(geometry);
  const interactionRef = useRef<PointerInteraction | undefined>(undefined);
  const pendingGeometryRef = useRef<PopupGeometry | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    applyGeometry(fitFloatingPopupGeometry(position, size));
  }, [position.left, position.top, size.height, size.width]);

  useEffect(() => () => {
    if (animationFrameRef.current !== undefined) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  function applyGeometry(nextGeometry: PopupGeometry): void {
    geometryRef.current = nextGeometry;
    setGeometry(nextGeometry);
  }

  function queueGeometry(nextGeometry: PopupGeometry): void {
    pendingGeometryRef.current = nextGeometry;
    if (animationFrameRef.current !== undefined) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = undefined;
      const pendingGeometry = pendingGeometryRef.current;
      pendingGeometryRef.current = undefined;
      if (pendingGeometry) {
        applyGeometry(pendingGeometry);
      }
    });
  }

  function startInteraction(
    event: ReactPointerEvent<HTMLElement>,
    kind: PointerInteraction['kind'],
    edges?: ResizeEdges,
  ): void {
    const popup = popupRef.current;
    if (!popup || !event.isPrimary || event.button !== 0 || interactionRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    popup.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGeometry: geometryRef.current,
      edges,
    };
  }

  function updateInteraction(event: ReactPointerEvent<HTMLElement>): void {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - interaction.startClientX;
    const deltaY = event.clientY - interaction.startClientY;
    queueGeometry(interaction.kind === 'drag'
      ? {
        position: clampFloatingPopupPosition({
          left: interaction.startGeometry.position.left + deltaX,
          top: interaction.startGeometry.position.top + deltaY,
        }, interaction.startGeometry.size),
        size: interaction.startGeometry.size,
      }
      : resizeFloatingPopupGeometry(
        interaction.startGeometry,
        deltaX,
        deltaY,
        interaction.edges ?? {},
      ));
  }

  function finishInteraction(event: ReactPointerEvent<HTMLElement>): void {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    if (animationFrameRef.current !== undefined) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    const finalGeometry = pendingGeometryRef.current ?? geometryRef.current;
    pendingGeometryRef.current = undefined;
    applyGeometry(finalGeometry);
    interactionRef.current = undefined;

    if (popupRef.current?.hasPointerCapture(event.pointerId)) {
      popupRef.current.releasePointerCapture(event.pointerId);
    }

    if (interaction.kind === 'drag') {
      onMove(finalGeometry.position);
    } else {
      onResize(finalGeometry.size, finalGeometry.position);
    }
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLElement>): void {
    const step = event.shiftKey ? 40 : 10;
    const deltaX = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    const deltaY = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
    if (!deltaX && !deltaY) {
      return;
    }

    event.preventDefault();
    const nextGeometry = resizeFloatingPopupGeometry(
      geometryRef.current,
      deltaX,
      deltaY,
      { right: true, bottom: true },
    );
    applyGeometry(nextGeometry);
    onResize(nextGeometry.size, nextGeometry.position);
  }

  return {
    geometry,
    popupRef,
    finishInteraction,
    resizeWithKeyboard,
    startDrag: (event: ReactPointerEvent<HTMLElement>) => startInteraction(event, 'drag'),
    startResize: (event: ReactPointerEvent<HTMLElement>, edges: ResizeEdges) => (
      startInteraction(event, 'resize', edges)
    ),
    updateInteraction,
  };
}
