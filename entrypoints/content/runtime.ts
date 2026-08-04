import { browser } from '#imports';

import {
  AI_ACTION_STREAM_PORT,
  type AiActionResponse,
  type AiActionStreamEvent,
  type RunAiActionMessage,
  type RuntimeMessage,
} from '@/lib/messages';

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

export function streamRuntimeAiAction(
  message: RunAiActionMessage,
  isActive: boolean,
  onTextDelta: (textDelta: string) => void,
  onInvalidated: OnInvalidated,
): {
  result: Promise<RuntimeSendResult<AiActionResponse>>;
  cancel: () => void;
} {
  let port: ReturnType<typeof browser.runtime.connect> | undefined;
  let settled = false;
  let resolveResult: (result: RuntimeSendResult<AiActionResponse>) => void = () => undefined;
  const result = new Promise<RuntimeSendResult<AiActionResponse>>((resolve) => {
    resolveResult = resolve;
  });

  const finish = (nextResult: RuntimeSendResult<AiActionResponse>) => {
    if (settled) {
      return;
    }

    settled = true;
    resolveResult(nextResult);
  };

  if (!isActive) {
    finish({ ok: false, invalidated: true });
    return { result, cancel: () => undefined };
  }

  try {
    port = browser.runtime.connect({ name: AI_ACTION_STREAM_PORT });
    port.onMessage.addListener((event: AiActionStreamEvent) => {
      if (event.type === 'AI_ACTION_DELTA') {
        onTextDelta(event.textDelta);
        return;
      }

      finish({ ok: true, value: event.response });
      port?.disconnect();
    });
    port.onDisconnect.addListener(() => {
      if (!settled) {
        finish({ ok: false, invalidated: false });
      }
    });
    port.postMessage(message);
  } catch (error) {
    const invalidated = isExtensionContextInvalidatedError(error);
    if (invalidated) {
      onInvalidated();
    }
    finish({ ok: false, invalidated });
  }

  return {
    result,
    cancel: () => {
      if (!settled) {
        finish({ ok: false, invalidated: false });
      }
      port?.disconnect();
    },
  };
}
