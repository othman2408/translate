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
import {
  normalizeSettings,
  normalizeResultPopupSize,
  settingsItem,
  type ExtensionSettings,
  type ResultPopupSize,
} from '@/lib/settings';

import {
  findBestTokenRange,
  getRangeText,
  getRangeWordCenterRatio,
  getResolvedSourceLanguage,
  getWordCount,
  normalizeRange,
} from './alignment';
import { clampFloatingPopupPosition, fitFloatingPopupGeometry } from './floating-geometry';
import { getOverlayResultText, TranslateOverlay } from './Overlay';
import {
  addRuntimeMessageListener,
  isExtensionContextInvalidatedError,
  removeRuntimeMessageListener,
  sendRuntimeMessage,
} from './runtime';
import {
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
const ACTION_BUTTON_WIDTH = 36;
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
  let popupSizeSaveTimer: number | undefined;
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
    popupSize: settings.resultPopupSize,
    settings,
  };

  async function start(): Promise<void> {
    contentScriptActive = true;
    ctx.onInvalidated(markContentScriptInactive);

    if (!(await mountOverlayUi())) {
      return;
    }

    ctx.addEventListener(document, 'pointermove', (event) => {
      lastPointerPosition = clampFloatingPopupPosition(
        { left: event.clientX, top: event.clientY + 12 },
        overlayState.popupSize,
      );
    });

    ctx.addEventListener(document, 'mouseup', () => {
      ctx.setTimeout(handleSelectionChanged, 25);
    });

    ctx.addEventListener(document, 'keyup', () => {
      ctx.setTimeout(handleSelectionChanged, 25);
    });

    ctx.addEventListener(window, 'focus', () => {
      void refreshSettingsSafely();
    });

    ctx.addEventListener(document, 'pointerdown', (event) => {
      handleOutsidePointerDown(event);
    }, true);

    ctx.addEventListener(window, 'scroll', () => {
      if (overlayState.status === 'icon') {
        hideOverlay();
      }
    });

    ctx.addEventListener(window, 'resize', () => {
      if (!isDismissibleStatus(overlayState.status)) {
        return;
      }

      updateOverlay(fitFloatingPopupGeometry(overlayState.position, overlayState.popupSize));
    });

    const messageListener = (
      message: unknown,
      _sender: unknown,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (!contentScriptActive) {
        return;
      }

      if (!isRuntimeMessage(message)) {
        return;
      }

      if (message.type === 'GET_SELECTED_TEXT') {
        const selection = readCurrentSelection(MAX_SELECTION_LENGTH);
        sendResponse(selection ? { ok: true, text: selection.text } : { ok: false });
        return;
      }

      if (message.type === 'SHOW_CONTEXT_TRANSLATION') {
        void showFromContextMenu(message);
      }
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

  async function refreshSettingsSafely(): Promise<void> {
    try {
      applySettings(normalizeSettings(await settingsItem.getValue()));
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        markContentScriptInactive();
      }
    }
  }

  function applySettings(nextSettings: ExtensionSettings): void {
    if (!contentScriptActive) {
      return;
    }

    settings = nextSettings;

    const nextOverlayState: Partial<OverlayState> = {
      settings,
      popupSize: settings.resultPopupSize,
    };

    if (overlayState.status === 'icon') {
      const nextControlWidth = getSelectionControlWidth(settings);
      nextOverlayState.position = clampPosition(
        overlayState.position,
        nextControlWidth,
        nextControlWidth === ICON_SIZE ? ICON_SIZE : ACTION_BUBBLE_HEIGHT,
      );
    }

    updateOverlay(nextOverlayState);

    if (!isCurrentSiteEnabled(settings.disabledHosts)) {
      hideOverlay();
    }
  }

  function markContentScriptInactive(): void {
    contentScriptActive = false;
    latestRequestId += 1;
    latestAlignmentRequestId += 1;
    clearPopupSizeSaveTimer();

    try {
      reactRoot?.unmount();
      shadowHostElement?.remove();
    } catch {
      // Old content scripts can be left behind during extension reloads.
    }

    reactRoot = undefined;
    shadowHostElement = undefined;
  }

  async function handleSelectionChanged(): Promise<void> {
    if (!contentScriptActive) {
      return;
    }

    await refreshSettingsSafely();
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
        getSelectionControlWidth(settings),
        getSelectionControlWidth(settings) === ICON_SIZE ? ICON_SIZE : ACTION_BUBBLE_HEIGHT,
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

    await refreshSettingsSafely();
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
    const popupGeometry = fitFloatingPopupGeometry(position, overlayState.popupSize);
    updateOverlay({
      status: 'loading',
      action: 'translate',
      position: popupGeometry.position,
      popupSize: popupGeometry.size,
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
    const popupGeometry = fitFloatingPopupGeometry(position, overlayState.popupSize);
    updateOverlay({
      status: 'loading',
      action,
      position: popupGeometry.position,
      popupSize: popupGeometry.size,
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
      onMove: (position) => {
        suppressSelectionHandling();
        updateOverlay(fitFloatingPopupGeometry(position, overlayState.popupSize));
      },
      onResize: (popupSize, position) => {
        suppressSelectionHandling();
        updateOverlay({ popupSize, position });
        schedulePopupSizeSave(popupSize);
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

  function schedulePopupSizeSave(popupSize: ResultPopupSize): void {
    if (!contentScriptActive) {
      return;
    }

    if (popupSizeSaveTimer) {
      window.clearTimeout(popupSizeSaveTimer);
    }

    popupSizeSaveTimer = window.setTimeout(() => {
      popupSizeSaveTimer = undefined;
      void savePopupSize(popupSize);
    }, 350);
  }

  async function savePopupSize(popupSize: ResultPopupSize): Promise<void> {
    if (!contentScriptActive) {
      return;
    }

    try {
      const currentSettings = await settingsItem.getValue();
      await settingsItem.setValue({
        ...currentSettings,
        resultPopupSize: normalizeResultPopupSize(popupSize),
      });
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        markContentScriptInactive();
      }
    }
  }

  function clearPopupSizeSaveTimer(): void {
    if (!popupSizeSaveTimer) {
      return;
    }

    window.clearTimeout(popupSizeSaveTimer);
    popupSizeSaveTimer = undefined;
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

function getSelectionControlWidth(settings: ExtensionSettings): number {
  if (!settings.aiRewriteEnabled && !settings.aiExplainEnabled) {
    return ICON_SIZE;
  }

  const buttonCount = 1
    + (settings.aiRewriteEnabled ? 1 : 0)
    + (settings.aiExplainEnabled ? 1 : 0);

  return buttonCount * ACTION_BUTTON_WIDTH;
}
