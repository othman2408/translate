import { ProviderSettingsButton } from './ProviderSettingsButton';
import { browser } from '#imports';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { t, type AppLanguage } from '@/lib/i18n';
import type { TranslationAlternativesResponse } from '@/lib/messages';
import { ALTERNATIVE_TEXT_LIMIT, type AlternativeSelection } from '@/lib/translation-alternatives';

export function useTranslationAlternatives() {
  const [selection, setSelectionValue] = useState<AlternativeSelection>();
  const [response, setResponse] = useState<TranslationAlternativesResponse>();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const revision = useRef(0);
  const current = useRef<AlternativeSelection | undefined>(undefined);
  const setSelection = useCallback((next?: AlternativeSelection) => {
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    current.current = next;
    revision.current++;
    setSelectionValue(next);
    setResponse(undefined);
    setLoading(false);
    setOpen(false);
  }, []);
  useEffect(() => () => { revision.current++; }, []);
  const dismiss = () => { revision.current++; setOpen(false); setLoading(false); triggerRef.current?.focus({ preventScroll: true }); };
  async function request(appLanguage: AppLanguage) {
    if (!selection || selection.text.length > ALTERNATIVE_TEXT_LIMIT || loading) return;
    const id = ++revision.current;
    setOpen(true);
    setLoading(true);
    setResponse(undefined);
    try {
      const result: TranslationAlternativesResponse = await browser.runtime.sendMessage({ type: 'TRANSLATION_ALTERNATIVES', ...selection });
      if (id === revision.current) setResponse(result ?? { ok: false, error: { code: 'unknown', message: t('errorAiProviderFailed', undefined, appLanguage) } });
    } catch {
      if (id === revision.current) setResponse({ ok: false, error: { code: 'network', message: t('errorAiProviderFailed', undefined, appLanguage) } });
    } finally {
      if (id === revision.current) setLoading(false);
    }
  }
  return { triggerRef, selection, setSelection, response, loading, open, dismiss, request };
}

type AlternativesState = ReturnType<typeof useTranslationAlternatives>;
export function AlternativesButton({ state, appLanguage }: { state: AlternativesState; appLanguage: AppLanguage }) {
  const tooLong = (state.selection?.text.length ?? 0) > ALTERNATIVE_TEXT_LIMIT;
  const hint = t(tooLong ? 'alternativesTooLong' : 'alternativesShortHint', undefined, appLanguage);
  return <button ref={state.triggerRef} type="button" className="reader-alternatives__action" disabled={!state.selection || tooLong || state.loading}
    title={hint} aria-expanded={state.open} onClick={() => void state.request(appLanguage)}>
    {t('alternativesShow', undefined, appLanguage)}
  </button>;
}

export function TranslationAlternatives({ state, appLanguage }: { state: AlternativesState; appLanguage: AppLanguage }) {
  const [copyStatus, setCopyStatus] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setCopyStatus(''); }, [state.response]);
  useEffect(() => { if (state.open) closeRef.current?.focus({ preventScroll: true }); }, [state.open]);
  if (!state.open) return null;
  const label = (key: Parameters<typeof t>[0]) => t(key, undefined, appLanguage);
  return <section className="reader-alternatives" aria-label={label('alternativesTitle')} aria-busy={state.loading}>
    <div className="reader-alternatives__header">
      <strong>{label('alternativesTitle')}</strong>
      <button ref={closeRef} type="button" className="icon-control" aria-label={label('alternativesClose')} onClick={state.dismiss}><X size={16} /></button>
    </div>
    <p className="reader-alternatives__selection" dir="auto">{state.selection?.text}</p>
    {state.loading && <p role="status">{label('alternativesLoading')}</p>}
    {state.response && !state.response.ok && <div className="translation-error-actions">
      <p role="alert">{state.response.error.message}</p>
      {(state.response.error.code === 'missing-api-key' || state.response.error.code === 'auth') && <ProviderSettingsButton ai appLanguage={appLanguage} />}
      <button type="button" onClick={() => void state.request(appLanguage)}>{label('actionRetry')}</button>
    </div>}
    {state.response?.ok && <>
      <ul>{state.response.alternatives.map((alternative) => <li key={alternative.text}>
        <div className="reader-alternatives__header">
          <strong dir="auto" lang={state.selection?.language}>{alternative.text}</strong>
          <button type="button" className="icon-control" aria-label={`${label('actionCopyText')}: ${alternative.text}`}
            onClick={() => { void navigator.clipboard.writeText(alternative.text).then(() => setCopyStatus(label('alternativesCopied'))).catch(() => setCopyStatus(label('alternativesCopyFailed'))); }}><Copy size={14} /></button>
        </div>
        <p>{alternative.explanation}</p>
      </li>)}</ul>
      <small>{state.response.providerName} · {state.response.model}</small>
    </>}
    <span role="status">{copyStatus}</span>
  </section>;
}
