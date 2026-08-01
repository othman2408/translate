import {
  RESULT_POPUP_SIZE_LIMITS,
  type ResultPopupSize,
} from '@/lib/settings';

import type { OverlayPosition } from './types';

export type PopupGeometry = {
  position: OverlayPosition;
  size: ResultPopupSize;
};

export type ResizeEdges = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
};

const SAFE_MARGIN = 12;

export function fitFloatingPopupGeometry(
  position: OverlayPosition,
  size: ResultPopupSize,
): PopupGeometry {
  const fittedSize = fitFloatingPopupSize(size);
  return {
    position: clampFloatingPopupPosition(position, fittedSize),
    size: fittedSize,
  };
}

export function clampFloatingPopupPosition(
  position: OverlayPosition,
  size: ResultPopupSize,
): OverlayPosition {
  return {
    left: Math.round(clamp(position.left, SAFE_MARGIN, window.innerWidth - size.width - SAFE_MARGIN)),
    top: Math.round(clamp(position.top, SAFE_MARGIN, window.innerHeight - size.height - SAFE_MARGIN)),
  };
}

export function resizeFloatingPopupGeometry(
  start: PopupGeometry,
  deltaX: number,
  deltaY: number,
  edges: ResizeEdges,
): PopupGeometry {
  const viewportRight = Math.max(SAFE_MARGIN, window.innerWidth - SAFE_MARGIN);
  const viewportBottom = Math.max(SAFE_MARGIN, window.innerHeight - SAFE_MARGIN);
  const availableWidth = viewportRight - SAFE_MARGIN;
  const availableHeight = viewportBottom - SAFE_MARGIN;
  const minWidth = Math.min(RESULT_POPUP_SIZE_LIMITS.minWidth, availableWidth);
  const minHeight = Math.min(RESULT_POPUP_SIZE_LIMITS.minHeight, availableHeight);
  const maxWidth = availableWidth;
  const maxHeight = availableHeight;

  let left = start.position.left;
  let top = start.position.top;
  let right = left + start.size.width;
  let bottom = top + start.size.height;

  if (edges.left) {
    left = clamp(start.position.left + deltaX, Math.max(SAFE_MARGIN, right - maxWidth), right - minWidth);
  } else if (edges.right) {
    right = clamp(right + deltaX, left + minWidth, Math.min(viewportRight, left + maxWidth));
  }

  if (edges.top) {
    top = clamp(start.position.top + deltaY, Math.max(SAFE_MARGIN, bottom - maxHeight), bottom - minHeight);
  } else if (edges.bottom) {
    bottom = clamp(bottom + deltaY, top + minHeight, Math.min(viewportBottom, top + maxHeight));
  }

  return {
    position: { left: Math.round(left), top: Math.round(top) },
    size: { width: Math.round(right - left), height: Math.round(bottom - top) },
  };
}

function fitFloatingPopupSize(size: ResultPopupSize): ResultPopupSize {
  const maxWidth = Math.max(1, window.innerWidth - SAFE_MARGIN * 2);
  const maxHeight = Math.max(1, window.innerHeight - SAFE_MARGIN * 2);
  const minWidth = Math.min(RESULT_POPUP_SIZE_LIMITS.minWidth, maxWidth);
  const minHeight = Math.min(RESULT_POPUP_SIZE_LIMITS.minHeight, maxHeight);

  return {
    width: Math.round(clamp(size.width, minWidth, maxWidth)),
    height: Math.round(clamp(size.height, minHeight, maxHeight)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
