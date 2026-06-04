import {
  RESULT_POPUP_SIZE_LIMITS,
  type ResultPopupSize,
} from '@/lib/settings';

import type { OverlayPosition } from './types';

const SAFE_MARGIN = 12;

export function clampFloatingPopupPosition(position: OverlayPosition, size: ResultPopupSize): OverlayPosition {
  return {
    left: clamp(position.left, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerWidth - size.width - SAFE_MARGIN)),
    top: clamp(position.top, SAFE_MARGIN, Math.max(SAFE_MARGIN, window.innerHeight - size.height - SAFE_MARGIN)),
  };
}

export function clampFloatingPopupSize(size: ResultPopupSize, position: OverlayPosition): ResultPopupSize {
  const maxWidth = Math.max(
    RESULT_POPUP_SIZE_LIMITS.minWidth,
    window.innerWidth - position.left - SAFE_MARGIN,
  );
  const maxHeight = Math.max(
    RESULT_POPUP_SIZE_LIMITS.minHeight,
    window.innerHeight - position.top - SAFE_MARGIN,
  );

  return {
    width: Math.round(clamp(size.width, RESULT_POPUP_SIZE_LIMITS.minWidth, maxWidth)),
    height: Math.round(clamp(size.height, RESULT_POPUP_SIZE_LIMITS.minHeight, maxHeight)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
