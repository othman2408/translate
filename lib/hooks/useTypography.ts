import { storage } from '#imports';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TYPOGRAPHY, normalizeTypography, type Typography } from '../typography';

const typographyItem = storage.defineItem<Typography>('local:typography', { fallback: DEFAULT_TYPOGRAPHY });

export function useTypography() {
  const [value, setValue] = useState(DEFAULT_TYPOGRAPHY);
  const [failed, setFailed] = useState(false);
  const revision = useRef(0);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    const initialRevision = revision.current;
    void typographyItem.getValue().then((saved) => {
      if (active && revision.current === initialRevision) setValue(normalizeTypography(saved));
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; revision.current++; };
  }, []);

  function update(next: Typography) {
    const normalized = normalizeTypography(next);
    const current = ++revision.current;
    setValue(normalized);
    setFailed(false);
    // Serialize rapid changes so the latest choice is also the last saved value.
    writes.current = writes.current.then(() => typographyItem.setValue(normalized)).catch(() => {
      if (current === revision.current) setFailed(true);
    });
  }
  return { value, update, failed };
}
