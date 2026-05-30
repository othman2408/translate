export function getHttpHost(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isHostDisabled(host: string, disabledHosts: string[]): boolean {
  return disabledHosts.includes(host.toLowerCase());
}
