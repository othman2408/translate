import { expect, test } from 'bun:test';
import { getSiteKey, isSiteDisabled, LOCAL_FILES_SITE_KEY } from '../lib/sites';

test('web site keys preserve existing lowercase hostname preferences', () => {
  expect(getSiteKey('https://EXAMPLE.com:8443/some/path?q=1')).toBe('example.com');
  expect(getSiteKey('http://Example.com/other')).toBe('example.com');
  expect(isSiteDisabled(getSiteKey('https://EXAMPLE.com'), ['example.com'])).toBe(true);
  expect(isSiteDisabled('other.example.com', ['example.com'])).toBe(false);
});

test('all local files share a key without retaining paths or filenames', () => {
  for (const url of [
    'file:///C:/Users/Test/local page.html',
    'file:///C:/Users/Test/local%20page.html',
    'file:///C:/Users/Test/صفحة محلية.html',
    'file:///home/test/page.html#section',
    'file://server/shared/page.html',
  ]) {
    expect(getSiteKey(url)).toBe(LOCAL_FILES_SITE_KEY);
    expect(isSiteDisabled(getSiteKey(url), ['file://'])).toBe(true);
    expect(isSiteDisabled(getSiteKey(url), ['example.com'])).toBe(false);
  }
  expect(isSiteDisabled('example.com', ['file://'])).toBe(false);
  expect(isSiteDisabled(LOCAL_FILES_SITE_KEY, [])).toBe(false);
});

test('unsupported schemes and invalid URLs have no site key', () => {
  for (const url of [undefined, '', 'invalid', 'chrome://extensions', 'edge://settings',
    'about:blank', 'moz-extension://abc/page.html', 'chrome-extension://abc/page.html',
    'data:text/html,hello', 'blob:https://example.com/id', 'ftp://example.com/file']) {
    expect(getSiteKey(url)).toBeNull();
  }
});
