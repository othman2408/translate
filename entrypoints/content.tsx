import { browser, createShadowRootUi, defineContentScript } from '#imports';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Languages,
  LoaderCircle,
  X,
} from 'lucide-react';

import { getLanguageName } from '@/lib/languages';
import {
  isRuntimeMessage,
  type ShowContextTranslationMessage,
  type TranslateTextMessage,
  type TranslationResponse,
} from '@/lib/messages';
import { DEFAULT_SETTINGS, getSettings, settingsItem, type ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';
import { getUiDirection, getUiLanguage, t } from '@/lib/i18n';

type OverlayStatus = 'hidden' | 'icon' | 'loading' | 'result' | 'error';

type OverlayPosition = {
  left: number;
  top: number;
};

type OverlayState = {
  status: OverlayStatus;
  position: OverlayPosition;
  selectedText: string;
  translation?: TranslationResponse;
  copied: boolean;
  settings: ExtensionSettings;
};

const HIDDEN_POSITION: OverlayPosition = { left: -9999, top: -9999 };
const MAX_SELECTION_LENGTH = 5000;
const ICON_SIZE = 38;

let settings: ExtensionSettings = DEFAULT_SETTINGS;
let reactRoot: Root | undefined;
let latestRequestId = 0;
let lastInstantKey = '';
let lastPointerPosition: OverlayPosition = { left: Math.round(window.innerWidth / 2), top: 120 };
let suppressSelectionHandlingUntil = 0;
let shadowHostElement: HTMLElement | undefined;
let overlayState: OverlayState = {
  status: 'hidden',
  position: HIDDEN_POSITION,
  selectedText: '',
  copied: false,
  settings,
};

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  async main(ctx) {
    settings = await getSettings();
    overlayState = { ...overlayState, settings };

    const unwatchSettings = settingsItem.watch((nextSettings) => {
      settings = { ...DEFAULT_SETTINGS, ...nextSettings };
      updateOverlay({ settings });
    });
    ctx.onInvalidated(unwatchSettings);

    const ui = await createShadowRootUi(ctx, {
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

    ctx.addEventListener(document, 'pointermove', (event) => {
      lastPointerPosition = clampPosition({ left: event.clientX, top: event.clientY + 12 }, 360, 220);
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
      if (!isRuntimeMessage(message) || message.type !== 'SHOW_CONTEXT_TRANSLATION') {
        return;
      }

      void showFromContextMenu(message);
    };

    browser.runtime.onMessage.addListener(messageListener);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(messageListener));
  },
});

function handleSelectionChanged(): void {
  if (Date.now() < suppressSelectionHandlingUntil) {
    return;
  }

  const selection = readCurrentSelection();

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
    position: clampPosition(selection.position, ICON_SIZE, ICON_SIZE),
    selectedText: selection.text,
    translation: undefined,
    copied: false,
  });
}

async function showFromContextMenu(message: ShowContextTranslationMessage): Promise<void> {
  const text = message.text.trim().slice(0, MAX_SELECTION_LENGTH);
  if (!text) {
    return;
  }

  const selection = readCurrentSelection();
  await requestTranslation(text, selection?.position ?? lastPointerPosition);
}

async function requestTranslation(text = overlayState.selectedText, position = overlayState.position): Promise<void> {
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
  updateOverlay({
    status: 'loading',
    position: clampPosition(position, 360, 220),
    selectedText: normalizedText,
    translation: undefined,
    copied: false,
  });

  const message: TranslateTextMessage = {
    type: 'TRANSLATE_TEXT',
    text: normalizedText,
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
  };

  let response: TranslationResponse;
  try {
    response = await browser.runtime.sendMessage(message);
  } catch {
    response = {
      ok: false,
      error: {
        code: 'network',
        message: t('errorBackgroundUnavailable'),
      },
    };
  }

  if (requestId !== latestRequestId) {
    return;
  }

  updateOverlay({
    status: response.ok ? 'result' : 'error',
    translation: response,
  });
}

function readCurrentSelection(): { text: string; position: OverlayPosition } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const text = selection.toString().trim().slice(0, MAX_SELECTION_LENGTH);
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

function clampPosition(position: OverlayPosition, width: number, height: number): OverlayPosition {
  const margin = 12;
  return {
    left: Math.min(Math.max(position.left, margin), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(position.top, margin), Math.max(margin, window.innerHeight - height - margin)),
  };
}

function updateOverlay(nextState: Partial<OverlayState>): void {
  overlayState = { ...overlayState, ...nextState };
  renderOverlay();
}

function hideOverlay(): void {
  latestRequestId += 1;
  updateOverlay({
    status: 'hidden',
    position: HIDDEN_POSITION,
    selectedText: '',
    translation: undefined,
    copied: false,
  });
}

function renderOverlay(): void {
  reactRoot?.render(
    <TranslateOverlay
      state={overlayState}
      onTranslate={() => {
        suppressSelectionHandling();
        void requestTranslation();
      }}
      onClose={() => {
        suppressSelectionHandling();
        hideOverlay();
      }}
      onCopy={() => {
        suppressSelectionHandling();
        void copyTranslation();
      }}
    />,
  );
}

async function copyTranslation(): Promise<void> {
  if (!overlayState.translation?.ok) {
    return;
  }

  try {
    await navigator.clipboard.writeText(overlayState.translation.translatedText);
    updateOverlay({ copied: true });
    window.setTimeout(() => updateOverlay({ copied: false }), 1200);
  } catch {
    updateOverlay({ copied: false });
  }
}

function TranslateOverlay({
  state,
  onTranslate,
  onClose,
  onCopy,
}: {
  state: OverlayState;
  onTranslate: () => void;
  onClose: () => void;
  onCopy: () => void;
}) {
  if (state.status === 'hidden') {
    return null;
  }

  const style = {
    transform: `translate3d(${state.position.left}px, ${state.position.top}px, 0)`,
  };

  if (state.status === 'icon') {
    return (
      <button
        className="translate-icon-button"
        style={style}
        type="button"
        title={t('translationTitle')}
        onClick={onTranslate}
      >
        <Languages size={18} strokeWidth={2.3} />
      </button>
    );
  }

  const isDictionary = state.settings.popupMode === 'dictionary';
  const title = isDictionary ? t('dictionaryTitle') : t('translationTitle');
  const response = state.translation;
  const uiLanguage = getUiLanguage();
  const uiDirection = getUiDirection(uiLanguage);
  const originalDirection = getTextDirection(state.selectedText, state.settings.sourceLanguage);
  const originalLanguage = getTextLanguage(state.settings.sourceLanguage);
  const resultText = response?.ok ? response.translatedText : '';
  const resultDirection = getTextDirection(resultText, response?.ok ? response.targetLanguage : state.settings.targetLanguage);
  const resultLanguage = getTextLanguage(response?.ok ? response.targetLanguage : state.settings.targetLanguage);
  const errorText = response && !response.ok ? response.error.message : '';
  const errorDirection = getTextDirection(errorText, 'en');

  return (
    <section
      className={`translation-card translation-card--${state.status}`}
      style={style}
      aria-live="polite"
      dir={uiDirection}
      lang={uiLanguage}
    >
      <header className="translation-card__header">
        <div className="translation-card__title">
          {isDictionary ? <BookOpen size={16} /> : <Languages size={16} />}
          <span>{title}</span>
        </div>
        <button className="icon-control" type="button" title={t('actionClose')} onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      {isDictionary && (
        <div className="translation-card__original">
          <span>{t('labelOriginal')}</span>
          <p
            dir={originalDirection}
            lang={originalLanguage}
            style={{ textAlign: getTextAlign(originalDirection) }}
          >
            {state.selectedText}
          </p>
        </div>
      )}

      {state.status === 'loading' && (
        <div className="translation-card__status">
          <LoaderCircle className="spin" size={18} />
          <span dir={uiDirection} lang={uiLanguage}>
            {t('translatingTo', getLanguageName(state.settings.targetLanguage))}
          </span>
        </div>
      )}

      {state.status === 'result' && response?.ok && (
        <>
          <p
            className="translation-card__result"
            dir={resultDirection}
            lang={resultLanguage}
            style={{ textAlign: getTextAlign(resultDirection) }}
          >
            {response.translatedText}
          </p>
          <footer className="translation-card__footer">
            <span dir={uiDirection} lang={uiLanguage}>
              {response.detectedSourceLanguage
                ? t('footerLanguagePair', [
                  getLanguageName(response.detectedSourceLanguage),
                  getLanguageName(response.targetLanguage),
                ])
                : t('footerToLanguage', getLanguageName(response.targetLanguage))}
              {response.fromCache ? ` - ${t('footerCached')}` : ''}
            </span>
            <button className="icon-control" type="button" title={t('actionCopyTranslation')} onClick={onCopy}>
              {state.copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </footer>
        </>
      )}

      {state.status === 'error' && response && !response.ok && (
        <div className="translation-card__error">
          <AlertCircle size={18} />
          <p dir={errorDirection} lang="en" style={{ textAlign: getTextAlign(errorDirection) }}>
            {response.error.message}
          </p>
        </div>
      )}
    </section>
  );
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

const overlayCss = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
  }

  .translate-icon-button,
  .translation-card {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2147483647;
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    color: #172033;
  }

  .translate-icon-button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(21, 35, 58, 0.12);
    border-radius: 999px;
    background: #ffffff;
    color: #176bdf;
    box-shadow: 0 12px 30px rgba(17, 24, 39, 0.24);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .translate-icon-button:hover {
    box-shadow: 0 14px 36px rgba(17, 24, 39, 0.28);
    color: #0f55c6;
  }

  .translation-card {
    width: min(360px, calc(100vw - 24px));
    max-height: min(440px, calc(100vh - 24px));
    overflow: hidden;
    border: 1px solid rgba(21, 35, 58, 0.12);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 18px 50px rgba(17, 24, 39, 0.28);
  }

  .translation-card__header,
  .translation-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .translation-card__header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid rgba(21, 35, 58, 0.08);
  }

  .translation-card__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    color: #176bdf;
  }

  .icon-control {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #4b5565;
    cursor: pointer;
  }

  .icon-control:hover {
    background: #eef4ff;
    color: #176bdf;
  }

  .translation-card__status,
  .translation-card__error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    font-size: 13px;
    line-height: 1.45;
  }

  .translation-card__result {
    margin: 0;
    padding: 16px;
    max-height: 260px;
    overflow: auto;
    font-size: 15px;
    line-height: 1.55;
    white-space: pre-wrap;
    unicode-bidi: plaintext;
  }

  .translation-card__original {
    margin: 12px 12px 0;
    padding: 10px;
    border-radius: 8px;
    background: #f5f7fb;
    color: #334155;
  }

  .translation-card__original span,
  .translation-card__footer {
    font-size: 11px;
    color: #64748b;
  }

  .translation-card__original p {
    margin: 4px 0 0;
    max-height: 96px;
    overflow: auto;
    font-size: 13px;
    line-height: 1.45;
    color: #172033;
    white-space: pre-wrap;
    unicode-bidi: plaintext;
  }

  .translation-card__footer {
    padding: 8px 12px 12px;
  }

  .translation-card__error {
    color: #a13b14;
  }

  .translation-card__error p {
    margin: 0;
    unicode-bidi: plaintext;
  }

  .spin {
    animation: translate-bubble-spin 800ms linear infinite;
  }

  @keyframes translate-bubble-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
