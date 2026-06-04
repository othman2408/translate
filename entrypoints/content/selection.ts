import { isHostDisabled } from '@/lib/sites';

import type { OverlayPosition } from './types';

export type PageSelection = {
  text: string;
  position: OverlayPosition;
};

export function readCurrentSelection(maxSelectionLength: number): PageSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const text = selection.toString().trim().slice(0, maxSelectionLength);
  if (!text) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = getRangeRect(range);
  if (!rect) {
    return null;
  }

  return {
    text,
    position: { left: rect.right + 6, top: rect.bottom + 8 },
  };
}

export function clampPosition(position: OverlayPosition, width: number, height: number): OverlayPosition {
  const margin = 12;
  return {
    left: Math.min(Math.max(position.left, margin), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(position.top, margin), Math.max(margin, window.innerHeight - height - margin)),
  };
}

export function isCurrentSiteEnabled(disabledHosts: string[]): boolean {
  return !isHostDisabled(window.location.hostname, disabledHosts);
}

function getRangeRect(range: Range): DOMRect | null {
  const clientRects = Array.from(range.getClientRects()).filter(
    (clientRect) => clientRect.width > 0 || clientRect.height > 0,
  );
  const lastClientRect = clientRects.at(-1);
  if (lastClientRect) {
    return lastClientRect;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  return null;
}
