export const LOCAL_FILES_SITE_KEY = 'file://';

export function getSiteKey(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'file:') return LOCAL_FILES_SITE_KEY;
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isSiteDisabled(siteKey: string, disabledHosts: string[]): boolean {
  return disabledHosts.includes(siteKey.toLowerCase());
}
