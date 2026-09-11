import { browser } from '#imports';
import { useEffect, useState } from 'react';

import { getSiteKey, isSiteDisabled, LOCAL_FILES_SITE_KEY } from '@/lib/sites';

export function useCurrentSiteToggle(
  disabledHosts: string[],
  onDisabledHostsChange: (disabledHosts: string[]) => void,
) {
  const [site, setSite] = useState<{ key: string | null; fileAccessBlocked: boolean } | null>(null);
  const currentSiteKey = site?.key ?? null;
  const isLoadingSite = site === null;
  const isFileAccessBlocked = site?.fileAccessBlocked ?? false;
  const isSiteSupported = Boolean(currentSiteKey) && !isFileAccessBlocked;
  const isCurrentSiteEnabled = currentSiteKey !== null && isSiteSupported
    && !isSiteDisabled(currentSiteKey, disabledHosts);

  useEffect(() => {
    let active = true;

    void getActiveTabSite().then((resolvedSite) => {
      if (active) {
        setSite(resolvedSite);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function updateCurrentSiteEnabled(enabled: boolean): void {
    if (!currentSiteKey || !isSiteSupported) {
      return;
    }

    onDisabledHostsChange(
      enabled
        ? disabledHosts.filter((key) => key !== currentSiteKey)
        : [...new Set([...disabledHosts, currentSiteKey])],
    );
  }

  return {
    currentSiteKey,
    isCurrentSiteEnabled,
    isLoadingSite,
    isFileAccessBlocked,
    isSiteSupported,
    updateCurrentSiteEnabled,
  };
}

async function getActiveTabSite() {
  let key: string | null = null;
  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    key = getSiteKey(activeTab?.url);
    const fileAccessBlocked = key === LOCAL_FILES_SITE_KEY
      && !await browser.extension.isAllowedFileSchemeAccess();
    return { key, fileAccessBlocked };
  } catch {
    return { key, fileAccessBlocked: key === LOCAL_FILES_SITE_KEY };
  }
}
