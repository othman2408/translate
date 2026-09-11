import { getSiteKey, isSiteDisabled } from '@/lib/sites';

import type { OverlayPosition } from './types';

export type PageSelection = {
  text: string;
  position: OverlayPosition;
  editable?: EditableSelection;
};

export type EditableSelection = {
  replace: (replacement: string) => UndoEdit | undefined;
};

export type UndoEdit = {
  undo: () => boolean;
};

export function readCurrentSelection(maxSelectionLength: number): PageSelection | null {
  const editableSelection = readEditableControlSelection(maxSelectionLength);
  if (editableSelection) {
    return editableSelection;
  }

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
    editable: createContentEditableSelection(range, text),
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
  const siteKey = getSiteKey(window.location.href);
  return siteKey !== null && !isSiteDisabled(siteKey, disabledHosts);
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

function readEditableControlSelection(maxSelectionLength: number): PageSelection | null {
  const element = document.activeElement;
  if (!(element instanceof HTMLTextAreaElement) && !isTextInput(element)) {
    return null;
  }

  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === null || end === null || start === end) {
    return null;
  }

  const selectedText = element.value.slice(start, end);
  const text = selectedText.trim().slice(0, maxSelectionLength);
  if (!text) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    text,
    position: { left: rect.right + 6, top: rect.bottom + 8 },
    editable: selectedText.length <= maxSelectionLength
      ? createTextControlSelection(element, start, end, selectedText)
      : undefined,
  };
}

function isTextInput(element: Element | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement
    && ['email', 'search', 'tel', 'text', 'url'].includes(element.type);
}

function createTextControlSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
  originalText: string,
): EditableSelection {
  return {
    replace(replacement) {
      if (!element.isConnected || element.value.slice(start, end) !== originalText) {
        return undefined;
      }

      if (!dispatchBeforeInput(element, replacement)) {
        return undefined;
      }

      const previousValue = element.value;
      element.setRangeText(replacement, start, end, 'end');
      const replacedValue = element.value;
      dispatchInput(element, replacement, 'insertReplacementText');
      element.focus({ preventScroll: true });

      return {
        undo() {
          if (!element.isConnected || element.value !== replacedValue) {
            return false;
          }

          element.value = previousValue;
          element.setSelectionRange(start, end);
          dispatchInput(element, originalText, 'historyUndo');
          element.focus({ preventScroll: true });
          return true;
        },
      };
    },
  };
}

function createContentEditableSelection(range: Range, originalText: string): EditableSelection | undefined {
  const root = getContentEditableRoot(range.commonAncestorContainer);
  if (!root || range.toString().trim() !== originalText) {
    return undefined;
  }

  const savedRange = range.cloneRange();
  return {
    replace(replacement) {
      if (!root.isConnected || savedRange.toString().trim() !== originalText) {
        return undefined;
      }

      if (!dispatchBeforeInput(root, replacement)) {
        return undefined;
      }

      const originalContents = savedRange.extractContents();
      const replacementNode = document.createTextNode(replacement);
      savedRange.insertNode(replacementNode);
      placeCaretAfter(replacementNode);
      dispatchInput(root, replacement, 'insertReplacementText');

      return {
        undo() {
          if (!replacementNode.isConnected || replacementNode.data !== replacement) {
            return false;
          }

          const firstOriginalNode = originalContents.firstChild;
          const lastOriginalNode = originalContents.lastChild;
          replacementNode.replaceWith(originalContents);
          if (firstOriginalNode && lastOriginalNode) {
            selectNodes(firstOriginalNode, lastOriginalNode);
          }
          dispatchInput(root, originalText, 'historyUndo');
          return true;
        },
      };
    },
  };
}

function getContentEditableRoot(node: Node): HTMLElement | undefined {
  const element = node instanceof Element ? node : node.parentElement;
  const root = element?.closest<HTMLElement>('[contenteditable]');
  return root?.isContentEditable ? root : undefined;
}

function dispatchBeforeInput(target: HTMLElement, data: string): boolean {
  return target.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    composed: true,
    data,
    inputType: 'insertReplacementText',
  }));
}

function dispatchInput(target: HTMLElement, data: string, inputType: string): void {
  target.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    composed: true,
    data,
    inputType,
  }));
}

function placeCaretAfter(node: Node): void {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function selectNodes(firstNode: Node, lastNode: Node): void {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartBefore(firstNode);
  range.setEndAfter(lastNode);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
