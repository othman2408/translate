import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Languages,
  LoaderCircle,
  PenLine,
  Sparkles,
} from 'lucide-react';

import { getUiDirection, getUiLanguage, t } from '@/lib/i18n';
import { getLanguageName } from '@/lib/languages';
import type { AiActionResponse } from '@/lib/messages';
import type { ExtensionSettings } from '@/lib/settings';
import { getTextAlign, getTextDirection, getTextLanguage } from '@/lib/text-direction';

import {
  getSideRange,
  isPartInRange,
  isRangeEqual,
  normalizeRange,
  tokenizeText,
} from './alignment';
import { FloatingPopup } from './FloatingPopup';
import type {
  AlignmentState,
  OverlayAction,
  OverlayPosition,
  OverlayState,
  TextSide,
  TokenPart,
  TokenRange,
} from './types';

export function TranslateOverlay({
  state,
  onTranslate,
  onRewrite,
  onExplain,
  onClose,
  onMove,
  onResize,
  onTokenRangeSelected,
  onCopy,
}: {
  state: OverlayState;
  onTranslate: () => void;
  onRewrite: () => void;
  onExplain: () => void;
  onClose: () => void;
  onMove: (position: OverlayPosition) => void;
  onResize: (size: OverlayState['popupSize'], position: OverlayPosition) => void;
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

  const isRewrite = state.action === 'rewrite';
  const isExplain = state.action === 'explain';
  const isAiAction = isAiOverlayAction(state.action);
  const isDictionary = state.settings.popupMode === 'dictionary';
  const title = isExplain
    ? t('explainTitle', undefined, state.settings.appLanguage)
    : isRewrite
    ? t('rewriteTitle', undefined, state.settings.appLanguage)
    : isDictionary
    ? t('dictionaryTitle', undefined, state.settings.appLanguage)
    : t('translationTitle', undefined, state.settings.appLanguage);
  const uiLanguage = getUiLanguage(state.settings.appLanguage);
  const uiDirection = getUiDirection(uiLanguage);
  const originalDirection = getTextDirection(state.selectedText, state.settings.sourceLanguage);
  const originalLanguage = getTextLanguage(state.settings.sourceLanguage);
  const resultText = getOverlayResultText(state);
  const resultLanguageCode = isExplain
    ? state.ai?.ok ? state.ai.language : state.settings.aiExplanationLanguage
    : isRewrite
    ? state.ai?.ok ? state.ai.language : state.settings.aiRewriteLanguage
    : state.translation?.ok ? state.translation.targetLanguage : state.settings.targetLanguage;
  const resultDirection = getTextDirection(resultText, resultLanguageCode);
  const resultLanguage = getTextLanguage(resultLanguageCode);
  const originalParts = useMemo(
    () => tokenizeText(state.selectedText, originalLanguage ?? state.settings.sourceLanguage),
    [originalLanguage, state.selectedText, state.settings.sourceLanguage],
  );
  const resultParts = useMemo(
    () => tokenizeText(resultText, resultLanguage ?? resultLanguageCode),
    [resultLanguage, resultLanguageCode, resultText],
  );
  const errorText = getOverlayErrorText(state);
  const errorDirection = getTextDirection(errorText, 'en');

  if (state.status === 'hidden') {
    return null;
  }

  if (state.status === 'icon') {
    if (state.settings.aiEnabled) {
      return (
        <div
          className="selection-action-bubble"
          data-theme-mode={state.settings.themeMode}
          style={style}
        >
          <button
            className="selection-action-button"
            type="button"
            title={t('translationTitle', undefined, state.settings.appLanguage)}
            aria-label={t('translationTitle', undefined, state.settings.appLanguage)}
            onClick={onTranslate}
          >
            <Languages size={17} strokeWidth={2.3} />
          </button>
          <button
            className="selection-action-button"
            type="button"
            title={t('actionRewriteText', undefined, state.settings.appLanguage)}
            aria-label={t('actionRewriteText', undefined, state.settings.appLanguage)}
            onClick={onRewrite}
          >
            <PenLine size={16} strokeWidth={2.3} />
          </button>
          <button
            className="selection-action-button"
            type="button"
            title={t('actionExplainText', undefined, state.settings.appLanguage)}
            aria-label={t('actionExplainText', undefined, state.settings.appLanguage)}
            onClick={onExplain}
          >
            <Sparkles size={16} strokeWidth={2.3} />
          </button>
        </div>
      );
    }

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
    <FloatingPopup
      className={`translation-card translation-card--${state.status}`}
      closeLabel={t('actionClose', undefined, state.settings.appLanguage)}
      resizeLabel={t('actionResizePopup', undefined, state.settings.appLanguage)}
      dir={uiDirection}
      lang={uiLanguage}
      position={state.position}
      size={state.popupSize}
      themeMode={state.settings.themeMode}
      title={(
        <>
          {isExplain
            ? <Sparkles size={16} />
            : isRewrite ? <PenLine size={16} /> : isDictionary ? <BookOpen size={16} /> : <Languages size={16} />}
          <span>{title}</span>
        </>
      )}
      onClose={onClose}
      onMove={onMove}
      onResize={onResize}
    >
      {state.status === 'loading' && (
        <div className="translation-card__body translation-card__body--center">
          <div className="translation-card__status">
            <LoaderCircle className="spin" size={18} />
            <span dir={uiDirection} lang={uiLanguage}>
              {isExplain ? t('explainingText', undefined, state.settings.appLanguage) : isRewrite ? t('rewritingText', undefined, state.settings.appLanguage) : t(
                'translatingTo',
                getLanguageName(state.settings.targetLanguage, state.settings.appLanguage),
                state.settings.appLanguage,
              )}
            </span>
          </div>
        </div>
      )}

      {state.status === 'result' && resultText && (
        <>
          <div className="translation-card__body translation-card__body--result">
            <TokenTextBlock
              alignment={isAiAction ? undefined : state.alignment}
              className="translation-card__original"
              direction={originalDirection}
              label={t('labelOriginal', undefined, state.settings.appLanguage)}
              language={originalLanguage}
              originalParts={originalParts}
              parts={originalParts}
              side="original"
              translationParts={resultParts}
              onRangeSelected={isAiAction ? undefined : onTokenRangeSelected}
            />

            <TokenTextBlock
              alignment={isAiAction ? undefined : state.alignment}
              className="translation-card__translation"
              direction={resultDirection}
              label={isExplain
                ? t('labelExplanation', undefined, state.settings.appLanguage)
                : isRewrite
                ? t('labelRewritten', undefined, state.settings.appLanguage)
                : t('titleTranslation', undefined, state.settings.appLanguage)}
              language={resultLanguage}
              originalParts={originalParts}
              parts={resultParts}
              side="translation"
              translationParts={resultParts}
              onRangeSelected={isAiAction ? undefined : onTokenRangeSelected}
            />
          </div>
          <footer className="translation-card__footer">
            <span dir={uiDirection} lang={uiLanguage}>
              {isAiAction && state.ai?.ok
                ? getAiFooterText(state.ai, state.settings)
                : state.translation?.ok && state.translation.detectedSourceLanguage
                ? t('footerLanguagePair', [
                  getLanguageName(state.translation.detectedSourceLanguage, state.settings.appLanguage),
                  getLanguageName(state.translation.targetLanguage, state.settings.appLanguage),
                ], state.settings.appLanguage)
                : state.translation?.ok ? t(
                  'footerToLanguage',
                  getLanguageName(state.translation.targetLanguage, state.settings.appLanguage),
                  state.settings.appLanguage,
                ) : ''}
              {!isAiAction && state.translation?.ok && state.translation.fromCache
                ? ` - ${t('footerCached', undefined, state.settings.appLanguage)}`
                : ''}
              {isAiAction && state.ai?.ok && state.ai.fromCache
                ? ` - ${t('footerCached', undefined, state.settings.appLanguage)}`
                : ''}
            </span>
            <button
              className="icon-control"
              type="button"
              title={t(isExplain ? 'actionCopyExplanation' : isRewrite ? 'actionCopyRewrite' : 'actionCopyTranslation', undefined, state.settings.appLanguage)}
              onClick={onCopy}
            >
              {state.copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </footer>
        </>
      )}

      {state.status === 'error' && errorText && (
        <div className="translation-card__body translation-card__body--center">
          <div className="translation-card__error">
            <AlertCircle size={18} />
            <p dir={errorDirection} lang="en" style={{ textAlign: getTextAlign(errorDirection) }}>
              {errorText}
            </p>
          </div>
        </div>
      )}
    </FloatingPopup>
  );
}

export function getOverlayResultText(state: OverlayState): string {
  if (isAiOverlayAction(state.action)) {
    return state.ai?.ok ? state.ai.resultText : '';
  }

  return state.translation?.ok ? state.translation.translatedText : '';
}

export function isAiOverlayAction(action: OverlayAction): action is 'rewrite' | 'explain' {
  return action === 'rewrite' || action === 'explain';
}

function getOverlayErrorText(state: OverlayState): string {
  if (isAiOverlayAction(state.action)) {
    return state.ai && !state.ai.ok ? state.ai.error.message : '';
  }

  return state.translation && !state.translation.ok ? state.translation.error.message : '';
}

function getAiFooterText(response: Extract<AiActionResponse, { ok: true }>, settings: ExtensionSettings): string {
  const providerText = t('footerAiProvider', [response.providerName, response.model], settings.appLanguage);
  if (!response.language) {
    return providerText;
  }

  return t(
    'footerAiProviderWithLanguage',
    [response.providerName, response.model, getLanguageName(response.language, settings.appLanguage)],
    settings.appLanguage,
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
  onRangeSelected?: (
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
  onRangeSelected?: (
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

  if (!onRangeSelected) {
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
