import { browser } from '#imports';

import type { RuntimeMessage } from '@/lib/messages';

import type { RuntimeSendResult } from './types';

type OnInvalidated = () => void;
type RuntimeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => unknown;

export function addRuntimeMessageListener(
  messageListener: RuntimeMessageListener,
  onInvalidated: OnInvalidated,
): boolean {
  try {
    browser.runtime.onMessage.addListener(messageListener);
    return true;
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      onInvalidated();
    }
    return false;
  }
}

export function removeRuntimeMessageListener(messageListener: RuntimeMessageListener): void {
  try {
    browser.runtime.onMessage.removeListener(messageListener);
  } catch {
    // Existing pages can outlive the extension context after a local reload.
  }
}

export async function sendRuntimeMessage<TResponse>(
  message: RuntimeMessage,
  isActive: boolean,
  onInvalidated: OnInvalidated,
): Promise<RuntimeSendResult<TResponse>> {
  if (!isActive) {
    return { ok: false, invalidated: true };
  }

  try {
    return {
      ok: true,
      value: await browser.runtime.sendMessage(message) as TResponse,
    };
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      onInvalidated();
      return { ok: false, invalidated: true };
    }

    return { ok: false, invalidated: false };
  }
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('extension context invalidated');
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message).toLowerCase().includes('extension context invalidated');
  }

  return String(error).toLowerCase().includes('extension context invalidated');
}
