import { browser } from '#imports';
import { useEffect, useState } from 'react';

import { getHttpHost, isHostDisabled } from '@/lib/sites';

export function useCurrentSiteToggle(
  disabledHosts: string[],
  onDisabledHostsChange: (disabledHosts: string[]) => void,
) {
  const [currentHost, setCurrentHost] = useState<string | null>(null);
  const [isLoadingHost, setIsLoadingHost] = useState(true);
  const isSiteSupported = !isLoadingHost && Boolean(currentHost);
  const isCurrentSiteEnabled = currentHost ? !isHostDisabled(currentHost, disabledHosts) : false;

  useEffect(() => {
    let active = true;

    void getActiveTabHost().then((host) => {
      if (active) {
        setCurrentHost(host);
        setIsLoadingHost(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function updateCurrentSiteEnabled(enabled: boolean): void {
    if (!currentHost) {
      return;
    }

    onDisabledHostsChange(
      enabled
        ? disabledHosts.filter((host) => host !== currentHost)
        : [...disabledHosts, currentHost],
    );
  }

  return {
    currentHost,
    isCurrentSiteEnabled,
    isLoadingHost,
    isSiteSupported,
    updateCurrentSiteEnabled,
  };
}

async function getActiveTabHost(): Promise<string | null> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.url) {
    return null;
  }

  return getHttpHost(activeTab.url);
}
