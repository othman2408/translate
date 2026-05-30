import { browser, createShadowRootUi, defineContentScript } from '#imports';
import type { Root } from 'react-dom/client';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
import { isHostDisabled } from '@/lib/sites';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';
import { getUiDirection, getUiLanguage, t } from '@/lib/i18n';

type OverlayStatus = 'hidden' | 'icon' | 'loading' | 'result' | 'error';
type TextSide = 'original' | 'translation';

type TokenPart = {
  partIndex: number;
  text: string;
  isWordLike: boolean;
  wordIndex?: number;
};

type TokenRange = {
  startPartIndex: number;
  endPartIndex: number;
};

type AlignmentState = {
  selectedSide: TextSide;
  selectedRange: TokenRange;
  matchedRange?: TokenRange;
  status: 'idle' | 'loading' | 'no-match';
};

type OverlayPosition = {
  left: number;
  top: number;
};

type OverlayState = {
  status: OverlayStatus;
  position: OverlayPosition;
  selectedText: string;
  translation?: TranslationResponse;
  alignment?: AlignmentState;
  copied: boolean;
  settings: ExtensionSettings;
};

const HIDDEN_POSITION: OverlayPosition = { left: -9999, top: -9999 };
const MAX_SELECTION_LENGTH = 5000;
const MAX_ALIGNMENT_WORDS = 12;
const MAX_ALIGNMENT_CHARACTERS = 160;
const DEFAULT_MIN_ALIGNMENT_SIMILARITY = 0.46;
const ICON_SIZE = 38;
const POPUP_WIDTH = 360;
const POPUP_MAX_HEIGHT = 440;

let settings: ExtensionSettings = DEFAULT_SETTINGS;
let reactRoot: Root | undefined;
let latestRequestId = 0;
let latestAlignmentRequestId = 0;
let lastInstantKey = '';
let lastPointerPosition: OverlayPosition = { left: Math.round(window.innerWidth / 2), top: 120 };
let suppressSelectionHandlingUntil = 0;
let shadowHostElement: HTMLElement | undefined;
let overlayState: OverlayState = {
  status: 'hidden',
  position: HIDDEN_POSITION,
  selectedText: '',
  alignment: undefined,
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

      if (!isCurrentSiteEnabled()) {
        hideOverlay();
      }
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

  if (hideWhenSiteDisabled()) {
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
  if (!isCurrentSiteEnabled()) {
    return;
  }

  const text = message.text.trim().slice(0, MAX_SELECTION_LENGTH);
  if (!text) {
    return;
  }

  const selection = readCurrentSelection();
  await requestTranslation(text, selection?.position ?? lastPointerPosition);
}

async function requestTranslation(text = overlayState.selectedText, position = overlayState.position): Promise<void> {
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
    position: clampPopupPosition(position),
    selectedText: normalizedText,
    translation: undefined,
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
  try {
    response = await browser.runtime.sendMessage(message);
  } catch {
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
    alignment: undefined,
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

function clampPopupPosition(position: OverlayPosition): OverlayPosition {
  return clampPosition(position, POPUP_WIDTH, Math.min(POPUP_MAX_HEIGHT, window.innerHeight - 24));
}

function isCurrentSiteEnabled(): boolean {
  return !isHostDisabled(window.location.hostname, settings.disabledHosts);
}

function hideWhenSiteDisabled(): boolean {
  if (isCurrentSiteEnabled()) {
    return false;
  }

  hideOverlay();
  return true;
}

function updateOverlay(nextState: Partial<OverlayState>): void {
  overlayState = { ...overlayState, ...nextState };
  renderOverlay();
}

function hideOverlay(): void {
  latestRequestId += 1;
  latestAlignmentRequestId += 1;
  updateOverlay({
    status: 'hidden',
    position: HIDDEN_POSITION,
    selectedText: '',
    translation: undefined,
    alignment: undefined,
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
      onTokenRangeSelected={(side, range, originalParts, translationParts) => {
        suppressSelectionHandling();
        void alignTokenRange(side, range, originalParts, translationParts);
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
  onTokenRangeSelected,
  onCopy,
}: {
  state: OverlayState;
  onTranslate: () => void;
  onClose: () => void;
  onTokenRangeSelected: (
    side: TextSide,
    range: TokenRange,
    originalParts: TokenPart[],
    translationParts: TokenPart[],
  ) => void;
  onCopy: () => void;
}) {
  const style = {
    transform: `translate3d(${state.position.left}px, ${state.position.top}px, 0)`,
  };

  const isDictionary = state.settings.popupMode === 'dictionary';
  const title = isDictionary
    ? t('dictionaryTitle', undefined, state.settings.appLanguage)
    : t('translationTitle', undefined, state.settings.appLanguage);
  const response = state.translation;
  const uiLanguage = getUiLanguage(state.settings.appLanguage);
  const uiDirection = getUiDirection(uiLanguage);
  const originalDirection = getTextDirection(state.selectedText, state.settings.sourceLanguage);
  const originalLanguage = getTextLanguage(state.settings.sourceLanguage);
  const resultText = response?.ok ? response.translatedText : '';
  const resultDirection = getTextDirection(resultText, response?.ok ? response.targetLanguage : state.settings.targetLanguage);
  const resultLanguage = getTextLanguage(response?.ok ? response.targetLanguage : state.settings.targetLanguage);
  const originalParts = useMemo(
    () => tokenizeText(state.selectedText, originalLanguage ?? state.settings.sourceLanguage),
    [originalLanguage, state.selectedText, state.settings.sourceLanguage],
  );
  const translationParts = useMemo(
    () => tokenizeText(resultText, resultLanguage ?? state.settings.targetLanguage),
    [resultLanguage, resultText, state.settings.targetLanguage],
  );
  const errorText = response && !response.ok ? response.error.message : '';
  const errorDirection = getTextDirection(errorText, 'en');

  if (state.status === 'hidden') {
    return null;
  }

  if (state.status === 'icon') {
    return (
      <button
        className="translate-icon-button"
        data-theme-mode={state.settings.themeMode}
        style={style}
        type="button"
        title={t('translationTitle', undefined, state.settings.appLanguage)}
        onClick={onTranslate}
      >
        <Languages size={18} strokeWidth={2.3} />
      </button>
    );
  }

  return (
    <section
      className={`translation-card translation-card--${state.status}`}
      data-theme-mode={state.settings.themeMode}
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
        <button
          className="icon-control"
          type="button"
          title={t('actionClose', undefined, state.settings.appLanguage)}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      {state.status === 'loading' && (
        <div className="translation-card__status">
          <LoaderCircle className="spin" size={18} />
          <span dir={uiDirection} lang={uiLanguage}>
            {t(
              'translatingTo',
              getLanguageName(state.settings.targetLanguage, state.settings.appLanguage),
              state.settings.appLanguage,
            )}
          </span>
        </div>
      )}

      {state.status === 'result' && response?.ok && (
        <>
          <TokenTextBlock
            alignment={state.alignment}
            className="translation-card__original"
            direction={originalDirection}
            label={t('labelOriginal', undefined, state.settings.appLanguage)}
            language={originalLanguage}
            originalParts={originalParts}
            parts={originalParts}
            side="original"
            translationParts={translationParts}
            onRangeSelected={onTokenRangeSelected}
          />

          <TokenTextBlock
            alignment={state.alignment}
            className="translation-card__translation"
            direction={resultDirection}
            label={t('titleTranslation', undefined, state.settings.appLanguage)}
            language={resultLanguage}
            originalParts={originalParts}
            parts={translationParts}
            side="translation"
            translationParts={translationParts}
            onRangeSelected={onTokenRangeSelected}
          />
          <footer className="translation-card__footer">
            <span dir={uiDirection} lang={uiLanguage}>
              {response.detectedSourceLanguage
                ? t('footerLanguagePair', [
                  getLanguageName(response.detectedSourceLanguage, state.settings.appLanguage),
                  getLanguageName(response.targetLanguage, state.settings.appLanguage),
                ], state.settings.appLanguage)
                : t(
                  'footerToLanguage',
                  getLanguageName(response.targetLanguage, state.settings.appLanguage),
                  state.settings.appLanguage,
                )}
              {response.fromCache ? ` - ${t('footerCached', undefined, state.settings.appLanguage)}` : ''}
            </span>
            <button
              className="icon-control"
              type="button"
              title={t('actionCopyTranslation', undefined, state.settings.appLanguage)}
              onClick={onCopy}
            >
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

function TokenTextBlock({
  alignment,
  className,
  direction,
  label,
  language,
  originalParts,
  parts,
  side,
  translationParts,
  onRangeSelected,
}: {
  alignment?: AlignmentState;
  className: string;
  direction: ReturnType<typeof getTextDirection>;
  label: string;
  language?: string;
  originalParts: TokenPart[];
  parts: TokenPart[];
  side: TextSide;
  translationParts: TokenPart[];
  onRangeSelected: (
    side: TextSide,
    range: TokenRange,
    originalParts: TokenPart[],
    translationParts: TokenPart[],
  ) => void;
}) {
  const [dragRange, setDragRange] = useState<TokenRange | undefined>();
  const selectedRange = getSideRange(alignment, side, 'selected');
  const matchedRange = getSideRange(alignment, side, 'matched');

  return (
    <div className={`${className} translation-card__text-block`}>
      <span className="translation-card__text-label">{label}</span>
      <p dir={direction} lang={language} style={{ textAlign: getTextAlign(direction) }}>
        {parts.map((part) => renderTokenPart({
          dragRange,
          matchedRange,
          onRangeSelected,
          originalParts,
          part,
          selectedRange,
          setDragRange,
          side,
          translationParts,
        }))}
      </p>
    </div>
  );
}

function renderTokenPart({
  dragRange,
  matchedRange,
  onRangeSelected,
  originalParts,
  part,
  selectedRange,
  setDragRange,
  side,
  translationParts,
}: {
  dragRange?: TokenRange;
  matchedRange?: TokenRange;
  onRangeSelected: (
    side: TextSide,
    range: TokenRange,
    originalParts: TokenPart[],
    translationParts: TokenPart[],
  ) => void;
  originalParts: TokenPart[];
  part: TokenPart;
  selectedRange?: TokenRange;
  setDragRange: Dispatch<SetStateAction<TokenRange | undefined>>;
  side: TextSide;
  translationParts: TokenPart[];
}) {
  if (!part.isWordLike) {
    return <span key={part.partIndex}>{part.text}</span>;
  }

  const ownRange = { startPartIndex: part.partIndex, endPartIndex: part.partIndex };
  const isSelected = isPartInRange(part, selectedRange);
  const isMatched = isPartInRange(part, matchedRange);
  const isPreview = isPartInRange(part, dragRange);
  const className = [
    'translation-token',
    isSelected ? 'translation-token--selected' : '',
    isMatched ? 'translation-token--matched' : '',
    isPreview && !isRangeEqual(dragRange, selectedRange) ? 'translation-token--preview' : '',
  ].filter(Boolean).join(' ');

  const selectRange = (range: TokenRange) => {
    setDragRange(undefined);
    onRangeSelected(side, normalizeRange(range), originalParts, translationParts);
  };

  return (
    <span
      key={part.partIndex}
      className={className}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        selectRange(ownRange);
      }}
      onPointerCancel={() => setDragRange(undefined)}
      onPointerDown={(event) => {
        event.preventDefault();
        setDragRange(ownRange);
      }}
      onPointerEnter={() => {
        setDragRange((currentRange) => currentRange
          ? normalizeRange({ ...currentRange, endPartIndex: part.partIndex })
          : currentRange);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        selectRange(dragRange ?? ownRange);
      }}
    >
      {part.text}
    </span>
  );
}

function normalizeRange(range: TokenRange): TokenRange {
  return range.startPartIndex <= range.endPartIndex
    ? range
    : { startPartIndex: range.endPartIndex, endPartIndex: range.startPartIndex };
}

function isRangeEqual(first?: TokenRange, second?: TokenRange): boolean {
  return Boolean(
    first &&
    second &&
    first.startPartIndex === second.startPartIndex &&
    first.endPartIndex === second.endPartIndex,
  );
}

function isPartInRange(part: TokenPart, range?: TokenRange): boolean {
  if (!range) {
    return false;
  }

  const normalizedRange = normalizeRange(range);
  return part.partIndex >= normalizedRange.startPartIndex && part.partIndex <= normalizedRange.endPartIndex;
}

function getSideRange(
  alignment: AlignmentState | undefined,
  side: TextSide,
  rangeType: 'selected' | 'matched',
): TokenRange | undefined {
  if (!alignment) {
    return undefined;
  }

  if (rangeType === 'selected') {
    return alignment.selectedSide === side ? alignment.selectedRange : undefined;
  }

  return alignment.selectedSide !== side ? alignment.matchedRange : undefined;
}

function getWordCount(parts: TokenPart[], range: TokenRange): number {
  return parts.filter((part) => part.isWordLike && isPartInRange(part, range)).length;
}

function getRangeText(parts: TokenPart[], range: TokenRange): string {
  const normalizedRange = normalizeRange(range);
  return parts
    .filter((part) => part.partIndex >= normalizedRange.startPartIndex && part.partIndex <= normalizedRange.endPartIndex)
    .map((part) => part.text)
    .join('');
}

function tokenizeText(text: string, language?: string): TokenPart[] {
  if (!text) {
    return [];
  }

  if ('Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(
      language && language !== 'auto' ? language : undefined,
      { granularity: 'word' },
    );
    let wordIndex = 0;

    return Array.from(segmenter.segment(text)).map((segment, index) => {
      const isWordLike = Boolean(segment.isWordLike);
      const part: TokenPart = {
        partIndex: index,
        text: segment.segment,
        isWordLike,
      };

      if (isWordLike) {
        part.wordIndex = wordIndex;
        wordIndex += 1;
      }

      return part;
    });
  }

  let wordIndex = 0;
  const segments = text.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) ?? [text];
  return segments.map((segment, index) => {
    const isWordLike = /[\p{L}\p{N}]/u.test(segment);
    const part: TokenPart = {
      partIndex: index,
      text: segment,
      isWordLike,
    };

    if (isWordLike) {
      part.wordIndex = wordIndex;
      wordIndex += 1;
    }

    return part;
  });
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
    : getResolvedSourceLanguage(currentTranslation);
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

  try {
    const response = await browser.runtime.sendMessage(message) as TranslationResponse;
    return response.ok ? response.translatedText : undefined;
  } catch {
    return undefined;
  }
}

function getResolvedSourceLanguage(response: TranslationResponse | undefined): string | undefined {
  if (!response?.ok) {
    return undefined;
  }

  if (response.detectedSourceLanguage) {
    return response.detectedSourceLanguage;
  }

  return settings.sourceLanguage === 'auto' ? undefined : settings.sourceLanguage;
}

function findBestTokenRange(
  queries: string[] | string,
  targetParts: TokenPart[],
  expectedCenterRatio?: number,
): TokenRange | undefined {
  const normalizedQueries = Array.from(new Set(
    (Array.isArray(queries) ? queries : [queries])
      .map((query) => normalizeAlignmentText(query))
      .filter(Boolean),
  ));

  if (normalizedQueries.length === 0) {
    return undefined;
  }

  const wordParts = getWordParts(targetParts);
  if (wordParts.length === 0) {
    return undefined;
  }

  let bestRange: TokenRange | undefined;
  let bestScore = 0;

  normalizedQueries.forEach((normalizedQuery) => {
    const queryWordCount = getNormalizedWords(normalizedQuery).length || 1;
    const minWords = queryWordCount <= 2 ? 1 : Math.max(1, Math.floor(queryWordCount * 0.45));
    const maxWords = Math.min(wordParts.length, Math.max(5, Math.ceil(queryWordCount * 2.8) + 2));

    for (let length = minWords; length <= maxWords; length += 1) {
      for (let start = 0; start <= wordParts.length - length; start += 1) {
        const range = getPartRangeFromWordRange(wordParts, start, start + length - 1);
        const normalizedCandidate = normalizeAlignmentText(getRangeText(targetParts, range));

        if (!normalizedCandidate) {
          continue;
        }

        const baseScore = scoreAlignmentCandidate(normalizedQuery, normalizedCandidate);
        const positionScore = expectedCenterRatio === undefined
          ? 1
          : scorePositionProximity(getWordRangeCenterRatio(start, start + length - 1, wordParts.length), expectedCenterRatio);
        const score = baseScore * (0.92 + (positionScore * 0.08));

        if (score > bestScore) {
          bestScore = score;
          bestRange = range;
        }
      }
    }
  });

  return bestRange && bestScore >= getMinimumAlignmentScore(normalizedQueries) ? bestRange : undefined;
}

function normalizeAlignmentText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreAlignmentCandidate(normalizedQuery: string, normalizedCandidate: string): number {
  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }

  const lengthRatio = getLengthRatio(normalizedQuery, normalizedCandidate);
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.88 + (lengthRatio * 0.1);
  }

  if (normalizedQuery.includes(normalizedCandidate)) {
    return 0.8 + (lengthRatio * 0.12);
  }

  const characterScore = diceCoefficient(normalizedQuery, normalizedCandidate);
  const tokenScore = tokenOverlapScore(normalizedQuery, normalizedCandidate);
  return Math.max(characterScore, tokenScore) * (0.82 + (lengthRatio * 0.18));
}

function getMinimumAlignmentScore(normalizedQueries: string[]): number {
  const longestQueryLength = Math.max(...normalizedQueries.map((query) => query.replace(/\s+/g, '').length));

  if (longestQueryLength <= 3) {
    return 0.78;
  }

  if (longestQueryLength <= 8) {
    return 0.58;
  }

  return DEFAULT_MIN_ALIGNMENT_SIMILARITY;
}

function getLengthRatio(first: string, second: string): number {
  const firstLength = first.replace(/\s+/g, '').length;
  const secondLength = second.replace(/\s+/g, '').length;

  if (firstLength === 0 || secondLength === 0) {
    return 0;
  }

  return Math.min(firstLength, secondLength) / Math.max(firstLength, secondLength);
}

function getNormalizedWords(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

function tokenOverlapScore(first: string, second: string): number {
  const firstWords = new Set(getNormalizedWords(first));
  const secondWords = new Set(getNormalizedWords(second));
  if (firstWords.size === 0 || secondWords.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  firstWords.forEach((word) => {
    if (secondWords.has(word)) {
      intersectionSize += 1;
    }
  });

  return (2 * intersectionSize) / (firstWords.size + secondWords.size);
}

function getRangeWordCenterRatio(parts: TokenPart[], range: TokenRange): number | undefined {
  const selectedWordIndexes = parts
    .filter((part) => part.isWordLike && isPartInRange(part, range) && part.wordIndex !== undefined)
    .map((part) => part.wordIndex as number);
  const wordParts = getWordParts(parts);

  if (selectedWordIndexes.length === 0 || wordParts.length === 0) {
    return undefined;
  }

  const firstWordIndex = selectedWordIndexes[0];
  const lastWordIndex = selectedWordIndexes[selectedWordIndexes.length - 1];
  return getWordRangeCenterRatio(firstWordIndex, lastWordIndex, wordParts.length);
}

function getWordRangeCenterRatio(startWordIndex: number, endWordIndex: number, wordCount: number): number {
  if (wordCount <= 1) {
    return 0.5;
  }

  return ((startWordIndex + endWordIndex) / 2) / (wordCount - 1);
}

function scorePositionProximity(candidateCenterRatio: number, expectedCenterRatio: number): number {
  return Math.max(0, 1 - Math.abs(candidateCenterRatio - expectedCenterRatio));
}

function getWordParts(parts: TokenPart[]): TokenPart[] {
  return parts.filter((part) => part.isWordLike);
}

function getPartRangeFromWordRange(wordParts: TokenPart[], startWordIndex: number, endWordIndex: number): TokenRange {
  return {
    startPartIndex: wordParts[startWordIndex].partIndex,
    endPartIndex: wordParts[endWordIndex].partIndex,
  };
}

function getBigrams(text: string): Map<string, number> {
  const compactText = text.replace(/\s+/g, '');
  if (compactText.length <= 1) {
    return new Map(compactText ? [[compactText, 1]] : []);
  }

  const bigrams = new Map<string, number>();
  for (let index = 0; index < compactText.length - 1; index += 1) {
    const bigram = compactText.slice(index, index + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  return bigrams;
}

function diceCoefficient(first: string, second: string): number {
  if (first === second) {
    return 1;
  }

  const firstBigrams = getBigrams(first);
  const secondBigrams = getBigrams(second);
  if (firstBigrams.size === 0 || secondBigrams.size === 0) {
    return 0;
  }

  let firstTotal = 0;
  let secondTotal = 0;
  let intersectionTotal = 0;

  firstBigrams.forEach((count, bigram) => {
    firstTotal += count;
    intersectionTotal += Math.min(count, secondBigrams.get(bigram) ?? 0);
  });
  secondBigrams.forEach((count) => {
    secondTotal += count;
  });

  return (2 * intersectionTotal) / (firstTotal + secondTotal);
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
    --translate-text: #172033;
    --translate-muted: #64748b;
    --translate-secondary: #334155;
    --translate-surface: #ffffff;
    --translate-soft-surface: #f5f7fb;
    --translate-hover: #eef4ff;
    --translate-blue: #176bdf;
    --translate-blue-hover: #0f55c6;
    --translate-error: #a13b14;
    --translate-border: rgba(21, 35, 58, 0.12);
    --translate-border-soft: rgba(21, 35, 58, 0.08);
    --translate-scrollbar-thumb: rgba(60, 60, 67, 0.28);
    --translate-scrollbar-thumb-hover: rgba(60, 60, 67, 0.42);
    --translate-shadow-icon: 0 12px 30px rgba(17, 24, 39, 0.24);
    --translate-shadow-icon-hover: 0 14px 36px rgba(17, 24, 39, 0.28);
    --translate-shadow-card: 0 18px 50px rgba(17, 24, 39, 0.28);
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2147483647;
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    color: var(--translate-text);
  }

  .translate-icon-button[data-theme-mode="dark"],
  .translation-card[data-theme-mode="dark"] {
    --translate-text: #f5f7fb;
    --translate-muted: #a8b3c4;
    --translate-secondary: #cbd5e1;
    --translate-surface: #242426;
    --translate-soft-surface: #303034;
    --translate-hover: rgba(10, 132, 255, 0.16);
    --translate-blue: #0a84ff;
    --translate-blue-hover: #64aaff;
    --translate-error: #ffb4a2;
    --translate-border: rgba(235, 235, 245, 0.16);
    --translate-border-soft: rgba(235, 235, 245, 0.1);
    --translate-scrollbar-thumb: rgba(235, 235, 245, 0.28);
    --translate-scrollbar-thumb-hover: rgba(235, 235, 245, 0.42);
    --translate-shadow-icon: 0 12px 30px rgba(0, 0, 0, 0.42);
    --translate-shadow-icon-hover: 0 14px 36px rgba(0, 0, 0, 0.5);
    --translate-shadow-card: 0 18px 50px rgba(0, 0, 0, 0.46);
  }

  @media (prefers-color-scheme: dark) {
    .translate-icon-button[data-theme-mode="system"],
    .translation-card[data-theme-mode="system"] {
      --translate-text: #f5f7fb;
      --translate-muted: #a8b3c4;
      --translate-secondary: #cbd5e1;
      --translate-surface: #242426;
      --translate-soft-surface: #303034;
      --translate-hover: rgba(10, 132, 255, 0.16);
      --translate-blue: #0a84ff;
      --translate-blue-hover: #64aaff;
      --translate-error: #ffb4a2;
      --translate-border: rgba(235, 235, 245, 0.16);
      --translate-border-soft: rgba(235, 235, 245, 0.1);
      --translate-scrollbar-thumb: rgba(235, 235, 245, 0.28);
      --translate-scrollbar-thumb-hover: rgba(235, 235, 245, 0.42);
      --translate-shadow-icon: 0 12px 30px rgba(0, 0, 0, 0.42);
      --translate-shadow-icon-hover: 0 14px 36px rgba(0, 0, 0, 0.5);
      --translate-shadow-card: 0 18px 50px rgba(0, 0, 0, 0.46);
    }
  }

  .translate-icon-button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid var(--translate-border);
    border-radius: 999px;
    background: var(--translate-surface);
    color: var(--translate-blue);
    box-shadow: var(--translate-shadow-icon);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .translate-icon-button:hover {
    box-shadow: var(--translate-shadow-icon-hover);
    color: var(--translate-blue-hover);
  }

  .translation-card {
    width: min(360px, calc(100vw - 24px));
    max-height: min(440px, calc(100vh - 24px));
    overflow: hidden;
    border: 1px solid var(--translate-border);
    border-radius: 8px;
    background: var(--translate-surface);
    box-shadow: var(--translate-shadow-card);
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
    border-bottom: 1px solid var(--translate-border-soft);
  }

  .translation-card__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--translate-blue);
  }

  .icon-control {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--translate-muted);
    cursor: pointer;
  }

  .icon-control:hover {
    background: var(--translate-hover);
    color: var(--translate-blue);
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

  .translation-card__text-block {
    margin: 12px 12px 0;
    padding: 10px;
    border-radius: 8px;
    background: var(--translate-soft-surface);
    color: var(--translate-secondary);
  }

  .translation-card__translation {
    margin-top: 8px;
    padding: 8px 10px 0;
    background: transparent;
  }

  .translation-card__text-label,
  .translation-card__footer {
    font-size: 11px;
    color: var(--translate-muted);
  }

  .translation-card__text-block p {
    margin: 4px 0 0;
    max-height: 82px;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--translate-scrollbar-thumb) transparent;
    font-size: 13px;
    line-height: 1.45;
    color: var(--translate-text);
    white-space: pre-wrap;
    unicode-bidi: plaintext;
    user-select: none;
  }

  .translation-card__translation p {
    max-height: 150px;
    font-size: 15px;
    line-height: 1.55;
  }

  .translation-card__text-block p::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .translation-card__text-block p::-webkit-scrollbar-track {
    background: transparent;
  }

  .translation-card__text-block p::-webkit-scrollbar-thumb {
    min-height: 32px;
    border: 3px solid transparent;
    border-radius: 999px;
    background-color: var(--translate-scrollbar-thumb);
    background-clip: content-box;
  }

  .translation-card__text-block p::-webkit-scrollbar-thumb:hover {
    background-color: var(--translate-scrollbar-thumb-hover);
  }

  .translation-token {
    border-radius: 4px;
    cursor: pointer;
    padding: 0 1px;
    transition: background-color 120ms ease, color 120ms ease, outline-color 120ms ease;
  }

  .translation-token--selected {
    background: rgba(10, 132, 255, 0.2);
    color: var(--translate-text);
  }

  .translation-token--matched {
    background: rgba(52, 199, 89, 0.2);
    color: var(--translate-text);
  }

  .translation-token--preview {
    outline: 1px solid var(--translate-blue);
    background: var(--translate-hover);
  }

  .translation-token:focus-visible {
    outline: 2px solid var(--translate-blue);
    outline-offset: 1px;
  }

  .translation-card__footer {
    padding: 8px 12px 12px;
  }

  .translation-card__error {
    color: var(--translate-error);
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
