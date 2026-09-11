import { expect, test } from 'bun:test';
import en from '../lib/locales/en/messages.json';
import ar from '../lib/locales/ar/messages.json';
import browserEn from '../public/_locales/en/messages.json';
import browserAr from '../public/_locales/ar/messages.json';

test('Arabic and English UI catalogs expose identical nonempty messages', () => {
  expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  for (const catalog of [en, ar]) {
    for (const entry of Object.values(catalog)) {
      expect(typeof entry.message).toBe('string');
      expect(entry.message.trim().length).toBeGreaterThan(0);
    }
  }
});

test('browser catalogs contain only manifest messages and match the UI catalogs', () => {
  const keys = ['extName', 'extDescription', 'commandTranslateSelection', 'commandRewriteSelection', 'commandExplainSelection'];
  for (const [browserCatalog, uiCatalog] of [[browserEn, en], [browserAr, ar]]) {
    expect(Object.keys(browserCatalog).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(browserCatalog[key]).toEqual(uiCatalog[key]);
  }
});
