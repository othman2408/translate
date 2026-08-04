import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Languages,
  LoaderCircle,
  PenLine,
  Replace,
  Sparkles,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { getUiDirection, getUiLanguage, t } from '@/lib/i18n';
import { getLanguageName } from '@/lib/languages';
import { MarkdownText } from '@/lib/markdown-text';
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
import { useTextToSpeech } from './speech';
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
  onReplace,
  onUndo,
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
  onReplace: () => void;
  onUndo: () => void;
}) {
  const style = {
    transform: `translate3d(${state.position.left}px, ${state.position.top}px, 0)`,
  };

  const isAiAction = isAiOverlayAction(state.action);
  const presentation = getOverlayPresentation(state);
  const uiLanguage = getUiLanguage(state.settings.appLanguage);
  const uiDirection = getUiDirection(uiLanguage);
  const originalLanguageCode = !isAiAction && state.translation?.ok && state.translation.detectedSourceLanguage
    ? state.translation.detectedSourceLanguage
    : state.settings.sourceLanguage;
  const originalDirection = getTextDirection(state.selectedText, originalLanguageCode);
  const originalLanguage = getTextLanguage(originalLanguageCode);
  const resultText = getOverlayResultText(state);
  const resultLanguageCode = presentation.resultLanguageCode;
  const resultDirection = getTextDirection(resultText, resultLanguageCode);
  const resultLanguage = getTextLanguage(resultLanguageCode);
  const originalParts = useMemo(
    () => tokenizeText(state.selectedText, originalLanguage ?? originalLanguageCode),
    [originalLanguage, originalLanguageCode, state.selectedText],
  );
  const resultParts = useMemo(
    () => tokenizeText(resultText, resultLanguage ?? resultLanguageCode),
    [resultLanguage, resultLanguageCode, resultText],
  );
  const errorText = getOverlayErrorText(state);
  const errorDirection = getTextDirection(errorText, 'en');
  const speech = useTextToSpeech();
  const showRewriteAction = state.settings.aiRewriteEnabled;
  const showExplainAction = state.settings.aiExplainEnabled;
  const showStreamingResult = state.isStreaming && Boolean(state.streamedText);

  useEffect(() => {
    if (state.status !== 'result') {
      speech.stop();
    }
  }, [speech.stop, state.status]);

  useEffect(() => {
    speech.stop();
  }, [speech.stop, state.action, state.selectedText, resultText]);

  if (state.status === 'hidden') {
    return null;
  }

  if (state.status === 'icon') {
    if (showRewriteAction || showExplainAction) {
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
          {showRewriteAction && (
            <button
              className="selection-action-button"
              type="button"
              title={t('actionRewriteText', undefined, state.settings.appLanguage)}
              aria-label={t('actionRewriteText', undefined, state.settings.appLanguage)}
              onClick={onRewrite}
            >
              <PenLine size={16} strokeWidth={2.3} />
            </button>
          )}
          {showExplainAction && (
            <button
              className="selection-action-button"
              type="button"
              title={t('actionExplainText', undefined, state.settings.appLanguage)}
              aria-label={t('actionExplainText', undefined, state.settings.appLanguage)}
              onClick={onExplain}
            >
              <Sparkles size={16} strokeWidth={2.3} />
            </button>
          )}
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
      allowReaderMode={state.status === 'result' && Boolean(resultText)}
      className={`translation-card translation-card--${state.status}`}
      closeLabel={t('actionClose', undefined, state.settings.appLanguage)}
      collapseReaderLabel={t('actionCloseReader', undefined, state.settings.appLanguage)}
      readerLabel={t('actionOpenReader', undefined, state.settings.appLanguage)}
      readerModeSize={state.settings.readerModeSize}
      resizeLabel={t('actionResizePopup', undefined, state.settings.appLanguage)}
      dir={uiDirection}
      lang={uiLanguage}
      position={state.position}
      size={state.popupSize}
      themeMode={state.settings.themeMode}
      title={(
        <>
          {presentation.icon}
          <span>{presentation.title}</span>
        </>
      )}
      onClose={onClose}
      onMove={onMove}
      onResize={onResize}
    >
      {state.status === 'loading' && !showStreamingResult && (
        <div className="translation-card__body translation-card__body--center">
          <div className="translation-card__status">
            <LoaderCircle className="spin" size={18} />
            <span dir={uiDirection} lang={uiLanguage}>
              {presentation.loadingText}
            </span>
          </div>
        </div>
      )}

      {(state.status === 'result' || showStreamingResult) && resultText && (
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
              readControl={speech.isSupported && !state.isStreaming ? (
                <ReadAloudButton
                  active={speech.activeTarget === 'original'}
                  label={t('actionReadOriginal', undefined, state.settings.appLanguage)}
                  stopLabel={t('actionStopReadingOriginal', undefined, state.settings.appLanguage)}
                  onClick={() => speech.toggle('original', state.selectedText, originalLanguage)}
                />
              ) : undefined}
              side="original"
              translationParts={resultParts}
              onRangeSelected={isAiAction ? undefined : onTokenRangeSelected}
            />

            <TokenTextBlock
              alignment={isAiAction ? undefined : state.alignment}
              className="translation-card__translation"
              direction={resultDirection}
              label={presentation.resultLabel}
              language={resultLanguage}
              markdown={isAiAction}
              originalParts={originalParts}
              parts={resultParts}
              rawText={resultText}
              readControl={speech.isSupported && !state.isStreaming ? (
                <ReadAloudButton
                  active={speech.activeTarget === 'result'}
                  label={t('actionReadResult', undefined, state.settings.appLanguage)}
                  stopLabel={t('actionStopReadingResult', undefined, state.settings.appLanguage)}
                  onClick={() => speech.toggle('result', resultText, resultLanguage)}
                />
              ) : undefined}
              side="translation"
              translationParts={resultParts}
              onRangeSelected={isAiAction ? undefined : onTokenRangeSelected}
            />
          </div>
          <footer className="translation-card__footer">
            <span className="translation-card__footer-meta" dir={uiDirection} lang={uiLanguage}>
              {state.isStreaming
                ? presentation.loadingText
                : isAiAction && state.ai?.ok
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
            <span className="translation-card__footer-actions">
              {state.canReplace && (
                <button
                  className="icon-control"
                  type="button"
                  title={t('actionReplaceSelection', undefined, state.settings.appLanguage)}
                  aria-label={t('actionReplaceSelection', undefined, state.settings.appLanguage)}
                  onClick={onReplace}
                >
                  <Replace size={16} />
                </button>
              )}
              {state.canUndo && (
                <button
                  className="icon-control"
                  type="button"
                  title={t('actionUndoReplacement', undefined, state.settings.appLanguage)}
                  aria-label={t('actionUndoReplacement', undefined, state.settings.appLanguage)}
                  onClick={onUndo}
                >
                  <Undo2 size={16} />
                </button>
              )}
              {!state.isStreaming && (
                <button
                  className="icon-control"
                  type="button"
                  title={presentation.copyLabel}
                  aria-label={presentation.copyLabel}
                  onClick={onCopy}
                >
                  {state.copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </span>
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
    return state.streamedText ?? (state.ai?.ok ? state.ai.resultText : '');
  }

  return state.translation?.ok ? state.translation.translatedText : '';
}

export function isAiOverlayAction(action: OverlayAction): action is 'rewrite' | 'explain' {
  return action === 'rewrite' || action === 'explain';
}

function getOverlayPresentation(state: OverlayState): {
  copyLabel: string;
  icon: ReactNode;
  loadingText: string;
  resultLabel: string;
  resultLanguageCode: string | undefined;
  title: string;
} {
  const appLanguage = state.settings.appLanguage;

  if (state.action === 'explain') {
    return {
      copyLabel: t('actionCopyExplanation', undefined, appLanguage),
      icon: <Sparkles size={16} />,
      loadingText: t('explainingText', undefined, appLanguage),
      resultLabel: t('labelExplanation', undefined, appLanguage),
      resultLanguageCode: state.ai?.ok ? state.ai.language : state.settings.aiExplanationLanguage,
      title: t('explainTitle', undefined, appLanguage),
    };
  }

  if (state.action === 'rewrite') {
    return {
      copyLabel: t('actionCopyRewrite', undefined, appLanguage),
      icon: <PenLine size={16} />,
      loadingText: t('rewritingText', undefined, appLanguage),
      resultLabel: t('labelRewritten', undefined, appLanguage),
      resultLanguageCode: state.ai?.ok ? state.ai.language : state.settings.aiRewriteLanguage,
      title: t('rewriteTitle', undefined, appLanguage),
    };
  }

  const isDictionary = state.settings.popupMode === 'dictionary';
  return {
    copyLabel: t('actionCopyTranslation', undefined, appLanguage),
    icon: isDictionary ? <BookOpen size={16} /> : <Languages size={16} />,
    loadingText: t(
      'translatingTo',
      getLanguageName(state.settings.targetLanguage, appLanguage),
      appLanguage,
    ),
    resultLabel: t('manualTranslationLabel', undefined, appLanguage),
    resultLanguageCode: state.translation?.ok
      ? state.translation.targetLanguage
      : state.settings.targetLanguage,
    title: t(isDictionary ? 'dictionaryTitle' : 'translationTitle', undefined, appLanguage),
  };
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
  markdown = false,
  originalParts,
  parts,
  rawText,
  readControl,
  side,
  translationParts,
  onRangeSelected,
}: {
  alignment?: AlignmentState;
  className: string;
  direction: ReturnType<typeof getTextDirection>;
  label: string;
  language?: string;
  markdown?: boolean;
  originalParts: TokenPart[];
  parts: TokenPart[];
  rawText?: string;
  readControl?: ReactNode;
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
      <div className="translation-card__text-block-header">
        <span className="translation-card__text-label">{label}</span>
        {readControl}
      </div>
      {markdown ? (
        <MarkdownText
          className="translation-card__markdown"
          dir={direction}
          lang={language}
          style={{ textAlign: getTextAlign(direction) }}
          text={rawText ?? parts.map((part) => part.text).join('')}
        />
      ) : (
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
      )}
    </div>
  );
}

function ReadAloudButton({
  active,
  label,
  stopLabel,
  onClick,
}: {
  active: boolean;
  label: string;
  stopLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      className="text-to-speech-button"
      type="button"
      title={active ? stopLabel : label}
      aria-label={active ? stopLabel : label}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {active ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </button>
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
