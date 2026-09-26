import { useEffect, useRef, useState } from 'react';

export function useCopyText(text: string) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    revision.current++;
    setStatus('idle');
    return () => {
      revision.current++;
      clearTimeout(timer.current);
    };
  }, [text]);
  async function copy() {
    const id = ++revision.current;
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      if (id !== revision.current) return;
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      if (id === revision.current) setStatus('failed');
    }
  }
  return { status, copy };
}
