import { createShadowRootUi } from '#imports';
import type { ContentScriptContext } from '#imports';
import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { t } from '@/lib/i18n';
import {
  isRuntimeMessage,
  type AiActionResponse,
  type AiActionType,
  type RunAiActionMessage,
  type ShowContextTranslationMessage,
  type TranslateTextMessage,
  type TranslationResponse,
} from '@/lib/messages';
import { DEFAULT_SETTINGS, settingsItem, type ExtensionSettings } from '@/lib/settings';

import {
  findBestTokenRange,
  getRangeText,
  getRangeWordCenterRatio,
  getResolvedSourceLanguage,
  getWordCount,
  normalizeRange,
} from './alignment';
import { getOverlayResultText, TranslateOverlay } from './Overlay';
import {
  addRuntimeMessageListener,
  isExtensionContextInvalidatedError,
  removeRuntimeMessageListener,
  sendRuntimeMessage,
} from './runtime';
import {
  clampPopupPosition,
  clampPosition,
  isCurrentSiteEnabled,
  readCurrentSelection,
} from './selection';
import { overlayCss } from './styles';
import type {
  AlignmentState,
  OverlayPosition,
  OverlayState,
  OverlayStatus,
  TextSide,
  TokenPart,
  TokenRange,
} from './types';

const HIDDEN_POSITION: OverlayPosition = { left: -9999, top: -9999 };
const MAX_SELECTION_LENGTH = 5000;
const MAX_ALIGNMENT_WORDS = 12;
const MAX_ALIGNMENT_CHARACTERS = 160;
const ICON_SIZE = 38;
const ACTION_BUBBLE_WIDTH = 110;
const ACTION_BUBBLE_HEIGHT = 36;

export type ContentOverlayController = {
  start: () => Promise<void>;
};

export function createContentOverlayController(
  ctx: ContentScriptContext,
  initialSettings: ExtensionSettings,
): ContentOverlayController {
  let settings: ExtensionSettings = initialSettings;
  let reactRoot: Root | undefined;
  let latestRequestId = 0;
  let latestAlignmentRequestId = 0;
  let lastInstantKey = '';
  let lastPointerPosition: OverlayPosition = { left: Math.round(window.innerWidth / 2), top: 120 };
  let suppressSelectionHandlingUntil = 0;
  let shadowHostElement: HTMLElement | undefined;
  let contentScriptActive = true;
  let overlayState: OverlayState = {
    status: 'hidden',
    action: 'translate',
    position: HIDDEN_POSITION,
    selectedText: '',
    alignment: undefined,
    copied: false,
    settings,
  };

  async function start(): Promise<void> {
    contentScriptActive = true;
    ctx.onInvalidated(markContentScriptInactive);

    if (!(await mountOverlayUi())) {
      return;
    }

    const unwatchSettings = watchSettingsSafely();
    if (unwatchSettings) {
      ctx.onInvalidated(unwatchSettings);
    }

    ctx.addEventListener(document, 'pointermove', (event) => {
      lastPointerPosition = clampPopupPosition({ left: event.clientX, top: event.clientY + 12 });
    });

    ctx.addEventListener(document, 'mouseup', () => {
      ctx.setTimeout(handleSelectionChanged, 25);
    });

    ctx.addEventListener(document, 'keyup', () => {
      ctx.setTimeout(handleSelectionChanged, 25);
    });

    ctx.addEventListener(document, 'pointerdown', (event) => {
      handleOutsidePointerDown(event);
    }, true);

    ctx.addEventListener(window, 'scroll', () => {
      if (overlayState.status === 'icon') {
        hideOverlay();
      }
    });

    const messageListener = (message: unknown) => {
      if (!contentScriptActive) {
        return;
      }

      if (!isRuntimeMessage(message) || message.type !== 'SHOW_CONTEXT_TRANSLATION') {
        return;
      }

      void showFromContextMenu(message);
    };

    if (addRuntimeMessageListener(messageListener, markContentScriptInactive)) {
      ctx.onInvalidated(() => removeRuntimeMessageListener(messageListener));
    }
  }

  async function mountOverlayUi(): Promise<boolean> {
    try {
      const ui = await createShadowRootUi<Root>(ctx, {
        name: 'translate-bubble-overlay',
        position: 'overlay',
        anchor: 'body',
        zIndex: 2147483647,
        isolateEvents: true,
        css: overlayCss,
        onMount: (container) => {
          shadowHostElement = container.getRootNode() instanceof ShadowRoot
            ? (container.getRootNode() as ShadowRoot).host as HTMLElement
            : undefined;
          reactRoot = createRoot(container);
          renderOverlay();
          return reactRoot;
        },
        onRemove: (root) => {
          root?.unmount();
          reactRoot = undefined;
          shadowHostElement = undefined;
        },
      });

      ui.mount();
      return true;
    } catch {
      return false;
    }
  }

  function watchSettingsSafely(): (() => void) | undefined {
    try {
      return settingsItem.watch((nextSettings) => {
        if (!contentScriptActive) {
          return;
        }

        settings = { ...DEFAULT_SETTINGS, ...nextSettings };
        updateOverlay({ settings });

        if (!isCurrentSiteEnabled(settings.disabledHosts)) {
          hideOverlay();
        }
      });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        markContentScriptInactive();
      }
      return undefined;
    }
  }

  function markContentScriptInactive(): void {
    contentScriptActive = false;
    latestRequestId += 1;
    latestAlignmentRequestId += 1;

    try {
      reactRoot?.unmount();
      shadowHostElement?.remove();
    } catch {
      // Old content scripts can be left behind during extension reloads.
    }

    reactRoot = undefined;
    shadowHostElement = undefined;
  }

  function handleSelectionChanged(): void {
    if (!contentScriptActive) {
      return;
    }

    if (Date.now() < suppressSelectionHandlingUntil) {
      return;
    }

    if (hideWhenSiteDisabled()) {
      return;
    }

    const selection = readCurrentSelection(MAX_SELECTION_LENGTH);

    if (!selection) {
      if (overlayState.status === 'icon') {
        hideOverlay();
      }
      return;
    }

    lastInstantKey = `${selection.text}:${settings.sourceLanguage}:${settings.targetLanguage}`;

    if (settings.triggerMode === 'instant') {
      void requestTranslation(selection.text, selection.position);
      return;
    }

    updateOverlay({
      status: 'icon',
      position: clampPosition(
        selection.position,
        settings.aiEnabled ? ACTION_BUBBLE_WIDTH : ICON_SIZE,
        settings.aiEnabled ? ACTION_BUBBLE_HEIGHT : ICON_SIZE,
      ),
      action: 'translate',
      selectedText: selection.text,
      translation: undefined,
      ai: undefined,
      alignment: undefined,
      copied: false,
    });
  }

  async function showFromContextMenu(message: ShowContextTranslationMessage): Promise<void> {
    if (!contentScriptActive) {
      return;
    }

    if (!isCurrentSiteEnabled(settings.disabledHosts)) {
      return;
    }

    const text = message.text.trim().slice(0, MAX_SELECTION_LENGTH);
    if (!text) {
      return;
    }

    const selection = readCurrentSelection(MAX_SELECTION_LENGTH);
    await requestTranslation(text, selection?.position ?? lastPointerPosition);
  }

  async function requestTranslation(
    text = overlayState.selectedText,
    position = overlayState.position,
  ): Promise<void> {
    if (!contentScriptActive) {
      return;
    }

    if (hideWhenSiteDisabled()) {
      return;
    }

    const normalizedText = text.trim().slice(0, MAX_SELECTION_LENGTH);
    if (!normalizedText) {
      return;
    }

    const requestKey = `${normalizedText}:${settings.sourceLanguage}:${settings.targetLanguage}`;
    if (settings.triggerMode === 'instant' && overlayState.status === 'loading' && requestKey === lastInstantKey) {
      return;
    }
    lastInstantKey = requestKey;

    const requestId = ++latestRequestId;
    latestAlignmentRequestId += 1;
    updateOverlay({
      status: 'loading',
      action: 'translate',
      position: clampPopupPosition(position),
      selectedText: normalizedText,
      translation: undefined,
      ai: undefined,
      alignment: undefined,
      copied: false,
    });

    const message: TranslateTextMessage = {
      type: 'TRANSLATE_TEXT',
      text: normalizedText,
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage,
      recordHistory: true,
    };

    let response: TranslationResponse;
    const sendResult = await sendMessage<TranslationResponse>(message);
    if (sendResult.ok) {
      response = sendResult.value;
    } else if (sendResult.invalidated) {
      return;
    } else {
      response = {
        ok: false,
        error: {
          code: 'network',
          message: t('errorBackgroundUnavailable', undefined, settings.appLanguage),
        },
      };
    }

    if (requestId !== latestRequestId) {
      return;
    }

    updateOverlay({
      status: response.ok ? 'result' : 'error',
      translation: response,
      ai: undefined,
      alignment: undefined,
    });
  }

  async function requestAiAction(
    action: AiActionType,
    text = overlayState.selectedText,
    position = overlayState.position,
  ): Promise<void> {
    if (!contentScriptActive) {
      return;
    }

    if (hideWhenSiteDisabled()) {
      return;
    }

    const normalizedText = text.trim().slice(0, MAX_SELECTION_LENGTH);
    if (!normalizedText) {
      return;
    }

    const requestId = ++latestRequestId;
    latestAlignmentRequestId += 1;
    updateOverlay({
      status: 'loading',
      action,
      position: clampPopupPosition(position),
      selectedText: normalizedText,
      translation: undefined,
      ai: undefined,
      alignment: undefined,
      copied: false,
    });

    const message: RunAiActionMessage = {
      type: 'RUN_AI_ACTION',
      action,
      text: normalizedText,
      language: action === 'rewrite' ? settings.aiRewriteLanguage : settings.aiExplanationLanguage,
      recordHistory: true,
    };

    let response: AiActionResponse;
    const sendResult = await sendMessage<AiActionResponse>(message);
    if (sendResult.ok) {
      response = sendResult.value;
    } else if (sendResult.invalidated) {
      return;
    } else {
      response = {
        ok: false,
        error: {
          code: 'network',
          message: t('errorBackgroundUnavailable', undefined, settings.appLanguage),
        },
      };
    }

    if (requestId !== latestRequestId) {
      return;
    }

    updateOverlay({
      status: response.ok ? 'result' : 'error',
      translation: undefined,
      ai: response,
      alignment: undefined,
    });
  }

  function hideWhenSiteDisabled(): boolean {
    if (isCurrentSiteEnabled(settings.disabledHosts)) {
      return false;
    }

    hideOverlay();
    return true;
  }

  function updateOverlay(nextState: Partial<OverlayState>): void {
    if (!contentScriptActive) {
      return;
    }

    overlayState = { ...overlayState, ...nextState };
    renderOverlay();
  }

  function hideOverlay(): void {
    latestRequestId += 1;
    latestAlignmentRequestId += 1;
    updateOverlay({
      status: 'hidden',
      action: 'translate',
      position: HIDDEN_POSITION,
      selectedText: '',
      translation: undefined,
      ai: undefined,
      alignment: undefined,
      copied: false,
    });
  }

  function renderOverlay(): void {
    if (!contentScriptActive) {
      return;
    }

    reactRoot?.render(createElement(TranslateOverlay, {
      state: overlayState,
      onTranslate: () => {
        suppressSelectionHandling();
        void requestTranslation();
      },
      onRewrite: () => {
        suppressSelectionHandling();
        void requestAiAction('rewrite');
      },
      onExplain: () => {
        suppressSelectionHandling();
        void requestAiAction('explain');
      },
      onClose: () => {
        suppressSelectionHandling();
        hideOverlay();
      },
      onTokenRangeSelected: (side, range, originalParts, translationParts) => {
        suppressSelectionHandling();
        void alignTokenRange(side, range, originalParts, translationParts);
      },
      onCopy: () => {
        suppressSelectionHandling();
        void copyResult();
      },
    }));
  }

  async function copyResult(): Promise<void> {
    const text = getOverlayResultText(overlayState);
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      updateOverlay({ copied: true });
      window.setTimeout(() => updateOverlay({ copied: false }), 1200);
    } catch {
      updateOverlay({ copied: false });
    }
  }

  async function alignTokenRange(
    side: TextSide,
    rawRange: TokenRange,
    originalParts: TokenPart[],
    translationParts: TokenPart[],
  ): Promise<void> {
    if (!overlayState.translation?.ok) {
      return;
    }

    const sourceParts = side === 'original' ? originalParts : translationParts;
    const targetParts = side === 'original' ? translationParts : originalParts;
    const range = normalizeRange(rawRange);
    const phrase = getRangeText(sourceParts, range).trim();
    const selectedAlignment: AlignmentState = {
      selectedSide: side,
      selectedRange: range,
      status: 'loading',
    };

    if (
      !phrase ||
      getWordCount(sourceParts, range) > MAX_ALIGNMENT_WORDS ||
      phrase.length > MAX_ALIGNMENT_CHARACTERS
    ) {
      updateOverlay({ alignment: { ...selectedAlignment, status: 'no-match' } });
      return;
    }

    updateOverlay({ alignment: selectedAlignment });

    const requestId = ++latestAlignmentRequestId;
    const translatedPhrase = await translateAlignmentPhrase(side, phrase);
    if (requestId !== latestAlignmentRequestId || !overlayState.translation?.ok) {
      return;
    }

    if (!translatedPhrase) {
      updateOverlay({ alignment: { ...selectedAlignment, status: 'no-match' } });
      return;
    }

    const matchedRange = findBestTokenRange(
      [translatedPhrase, phrase],
      targetParts,
      getRangeWordCenterRatio(sourceParts, range),
    );
    updateOverlay({
      alignment: {
        ...selectedAlignment,
        matchedRange,
        status: matchedRange ? 'idle' : 'no-match',
      },
    });
  }

  async function translateAlignmentPhrase(side: TextSide, phrase: string): Promise<string | undefined> {
    const currentTranslation = overlayState.translation;
    if (!currentTranslation?.ok) {
      return undefined;
    }

    const targetLanguage = side === 'original'
      ? currentTranslation.targetLanguage
      : getResolvedSourceLanguage(currentTranslation, settings.sourceLanguage);
    const sourceLanguage = side === 'original'
      ? settings.sourceLanguage
      : currentTranslation.targetLanguage;

    if (!targetLanguage) {
      return undefined;
    }

    const message: TranslateTextMessage = {
      type: 'TRANSLATE_TEXT',
      text: phrase,
      sourceLanguage,
      targetLanguage,
      recordHistory: false,
    };

    const sendResult = await sendMessage<TranslationResponse>(message);
    if (sendResult.ok) {
      const response = sendResult.value;
      return response.ok ? response.translatedText : undefined;
    }

    return undefined;
  }

  function handleOutsidePointerDown(event: Event): void {
    if (isOverlayEvent(event)) {
      suppressSelectionHandling();
      return;
    }

    if (!settings.closeOnOutsideClick || !isDismissibleStatus(overlayState.status)) {
      return;
    }

    hideOverlay();
  }

  function suppressSelectionHandling(): void {
    suppressSelectionHandlingUntil = Date.now() + 350;
  }

  function isOverlayEvent(event: Event): boolean {
    if (!shadowHostElement) {
      return false;
    }

    const path = event.composedPath();
    if (path.includes(shadowHostElement)) {
      return true;
    }

    const target = event.target;
    return target instanceof Node && shadowHostElement.contains(target);
  }

  function isDismissibleStatus(status: OverlayStatus): boolean {
    return status === 'loading' || status === 'result' || status === 'error';
  }

  function sendMessage<TResponse>(message: TranslateTextMessage | RunAiActionMessage) {
    return sendRuntimeMessage<TResponse>(message, contentScriptActive, markContentScriptInactive);
  }

  return { start };
}
