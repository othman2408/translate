import { AlternativesButton, useTranslationAlternatives } from './TranslationAlternatives';
import { ALTERNATIVE_TEXT_LIMIT, makeAlternativeSelection } from '@/lib/translation-alternatives';
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
  useCallback, useId, type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, Link2, Unlink, X } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';
import { findTextMatches, linkedScrollTop, nextMatchIndex } from '@/lib/reader-tools';

type PanelId = 'original' | 'translation';
type Panel = { text: string; node: () => HTMLElement | null };
const PANEL_ORDER: PanelId[] = ['original', 'translation'];

export function useReaderToolsState() {
  const [query, setQueryValue] = useState('');
  const [linked, setLinked] = useState(true);
  const [index, setIndex] = useState(0);
  const [panels, setPanels] = useState<Partial<Record<PanelId, Panel>>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const expectedScroll = useRef(new WeakMap<HTMLElement, number>());
  const register = useCallback((id: PanelId, panel: Panel) => {
    setPanels((current) => ({ ...current, [id]: panel }));
    return () => setPanels((current) => {
      if (current[id] !== panel) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const matches = useMemo(() => PANEL_ORDER.flatMap((id) =>
    findTextMatches(panels[id]?.text ?? '', query).map((range, matchIndex) => ({ id, matchIndex, ...range }))), [panels, query]);
  const activeIndex = Math.min(index, Math.max(0, matches.length - 1));
  const textKey = PANEL_ORDER.map((id) => panels[id]?.text ?? '').join('\u0000');
  useEffect(() => setIndex(0), [textKey]);
  const alternatives = useTranslationAlternatives();

  function setQuery(value: string) {
    setIndex(0);
    setQueryValue(value);
  }
  function scrollTo(node: HTMLElement, top: number) {
    node.scrollTop = top;
    expectedScroll.current.set(node, node.scrollTop);
  }
  function onScroll(id: PanelId, source: HTMLElement) {
    if (panels[id]?.node() !== source) return;
    const expected = expectedScroll.current.get(source);
    if (expected !== undefined && Math.abs(source.scrollTop - expected) <= 1) return;
    expectedScroll.current.delete(source);
    if (!linked) return;
    const target = panels[id === 'original' ? 'translation' : 'original']?.node();
    if (!target || source.scrollHeight <= source.clientHeight) return;
    scrollTo(target, linkedScrollTop(source.scrollTop,
      source.scrollHeight - source.clientHeight, target.scrollHeight - target.clientHeight));
  }
  return {
    alternatives, query, setQuery, linked, setLinked, register, onScroll, scrollTo,
    active: matches[activeIndex], activeIndex, total: matches.length,
    next: (direction: number) => setIndex(nextMatchIndex(activeIndex, direction, matches.length)),
    searchRef,
  };
}

type ReaderTools = ReturnType<typeof useReaderToolsState>;
export const ReaderToolsContext = createContext<ReaderTools | null>(null);

export function ReaderToolsToolbar({ tools, appLanguage, editable }: { tools: ReaderTools; appLanguage: AppLanguage; editable: boolean }) {
  const hintId = useId();
  const label = (key: Parameters<typeof t>[0]) => t(key, undefined, appLanguage);
  return (
    <div className="reader-tools" role="search" aria-label={label('readerSearchLabel')}>
      <button type="button" className="icon-control" aria-pressed={tools.linked}
        aria-label={label('readerLinkedScroll')} title={label('readerLinkedScroll')}
        onClick={() => tools.setLinked(!tools.linked)}>
        {tools.linked ? <Link2 size={16} /> : <Unlink size={16} />}
      </button>
      <input ref={tools.searchRef} type="search" value={tools.query} maxLength={200}
        aria-describedby={tools.query && editable ? hintId : undefined}
        aria-label={label('readerSearchLabel')} placeholder={label('readerSearchLabel')}
        onChange={(event) => tools.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            tools.next(event.shiftKey ? -1 : 1);
          }
        }} />
      <span className="reader-tools__count" role="status" aria-live="polite">
        {tools.query ? tools.total ? t('readerMatchCount', [String(tools.activeIndex + 1), String(tools.total)], appLanguage) : label('readerNoMatches') : ''}
      </span>
      <button className="icon-control" type="button" disabled={!tools.total}
        aria-label={label('readerPreviousMatch')} title={label('readerPreviousMatch')} onClick={() => tools.next(-1)}><ArrowUp size={16} /></button>
      <button className="icon-control" type="button" disabled={!tools.total}
        aria-label={label('readerNextMatch')} title={label('readerNextMatch')} onClick={() => tools.next(1)}><ArrowDown size={16} /></button>
      {tools.query && <button className="icon-control" type="button" aria-label={label('readerClearSearch')}
        title={label('readerClearSearch')} onClick={() => { tools.setQuery(''); tools.searchRef.current?.focus(); }}><X size={16} /></button>}
      <AlternativesButton state={tools.alternatives} appLanguage={appLanguage} />
      {!tools.alternatives.selection && <span className="reader-tools__hint">{label('alternativesShortHint')}</span>}
      {tools.alternatives.selection && <span className="reader-tools__selection" dir="auto" title={tools.alternatives.selection.text}>
        {tools.alternatives.selection.text}
      </span>}
      {(tools.alternatives.selection?.text.length ?? 0) > ALTERNATIVE_TEXT_LIMIT && <span role="status" className="reader-tools__hint">{label('alternativesTooLong')}</span>}
      {tools.query && editable && <span className="reader-tools__hint" id={hintId}>{label('readerSearchEditHint')}</span>}
    </div>
  );
}

// Search renders a read-only view of the same text. The controlled editor's value
// stays in its owner, so leaving search restores editing without input events.
export function ReaderPanel({ id, text, children, direction, language, label, editable = false, selectedText, selectionStart }: {
  id: PanelId; text: string; children: ReactNode; direction?: string; language?: string; label: string; editable?: boolean; selectedText?: string; selectionStart?: number;
}) {
  const tools = useContext(ReaderToolsContext);
  const ref = useRef<HTMLDivElement>(null);
  const register = tools?.register;
  const setSelection = tools?.alternatives.setSelection;
  useEffect(() => { setSelection?.(undefined); }, [text, language, setSelection]);
  useEffect(() => {
    if (id !== 'translation' || selectedText === undefined || !setSelection) return;
    const start = selectionStart ?? text.indexOf(selectedText);
    setSelection(selectedText && start >= 0 ? makeAlternativeSelection(text, start, start + selectedText.length, language) : undefined);
  }, [id, selectedText, selectionStart, text, language, setSelection]);
  function captureSelection(event: { target: EventTarget }) {
    if (!setSelection || !ref.current) return;
    if (id !== 'translation') { setSelection(undefined); return; }
    const target = event.target;
    if (target instanceof Element && target.closest('.translation-token')) return;
    if (target instanceof HTMLTextAreaElement) {
      setSelection(makeAlternativeSelection(text, target.selectionStart, target.selectionEnd, language));
      return;
    }
    const root = ref.current.getRootNode() as Document | (ShadowRoot & { getSelection?: () => Selection | null });
    const selection = root.getSelection?.() ?? window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) { setSelection(undefined); return; }
    const range = selection.getRangeAt(0);
    if (!ref.current.contains(range.startContainer) || !ref.current.contains(range.endContainer)) { setSelection(undefined); return; }
    const selected = selection.toString();
    const prefix = range.cloneRange();
    prefix.selectNodeContents(ref.current);
    prefix.setEnd(range.startContainer, range.startOffset);
    const offset = prefix.toString().length;
    const start = text.slice(offset, offset + selected.length) === selected ? offset : text.indexOf(selected);
    setSelection(start >= 0 ? makeAlternativeSelection(text, start, start + selected.length, language) : undefined);
  }
  useEffect(() => {
    if (!register) return;
    return register(id, { text, node: () => ref.current?.querySelector('textarea') ?? ref.current });
  }, [register, id, text]);
  const ranges = findTextMatches(text, tools?.query ?? '');
  const activeIndex = tools?.active?.id === id ? tools.active.matchIndex : -1;
  const query = tools?.query ?? '';
  const scrollTo = useRef(tools?.scrollTo);
  scrollTo.current = tools?.scrollTo;
  useEffect(() => {
    if (!query || activeIndex < 0 || !ref.current) return;
    const node = ref.current;
    const mark = node.querySelector<HTMLElement>('[data-active="true"]');
    if (!mark) return;
    scrollTo.current?.(node, node.scrollTop + mark.getBoundingClientRect().top
      - node.getBoundingClientRect().top - node.clientHeight / 2 + mark.clientHeight / 2);
  }, [query, activeIndex, text]);

  if (!tools) return <>{children}</>;
  return (
    <div ref={ref} role="region" aria-label={label} tabIndex={query || !editable ? 0 : -1} className={`reader-panel${editable ? ' reader-panel--editable' : ''}`}
      onSelect={captureSelection} onPointerUp={captureSelection} onKeyUp={captureSelection}
      onScrollCapture={(event) => tools.onScroll(id, event.target as HTMLElement)}>
      {query ? <SearchText text={text} ranges={ranges} activeIndex={activeIndex} direction={direction} language={language} /> : children}
    </div>
  );
}

function SearchText({ text, ranges, activeIndex, direction, language }: {
  text: string; ranges: ReturnType<typeof findTextMatches>; activeIndex: number; direction?: string; language?: string;
}) {
  const nodes: ReactNode[] = [];
  let end = 0;
  ranges.forEach((range, index) => {
    nodes.push(text.slice(end, range.start));
    nodes.push(<mark key={range.start} data-active={index === activeIndex}>{text.slice(range.start, range.end)}</mark>);
    end = range.end;
  });
  nodes.push(text.slice(end));
  return <div className="reader-search-text" dir={direction} lang={language}>{nodes}</div>;
}
