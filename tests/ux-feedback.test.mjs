import { test, expect } from 'bun:test';
import { navigateToken } from '../lib/token-navigation';
import { insertLimitedText, TEXT_INPUT_MAX_LENGTH } from '../lib/text-limits';
import { isRuntimeMessage } from '../lib/messages';

test('reader navigation skips separators, clamps edges and respects RTL', () => {
  const words = [0, 2, 5];
  expect(navigateToken(words, 0, 'ArrowRight', false)).toBe(2);
  expect(navigateToken(words, 2, 'ArrowLeft', true)).toBe(5);
  expect(navigateToken(words, 0, 'ArrowRight', true)).toBe(0);
  expect(navigateToken(words, 5, 'End', false)).toBe(5);
  expect(navigateToken(words, 5, 'Home', true)).toBe(0);
  expect(navigateToken(words, 2, 'Tab', false)).toBeUndefined();
  expect(navigateToken([], 0, 'Home', false)).toBeUndefined();
});
test('paste replaces selection and reports only actual overflow after normalizing newlines', () => {
  expect(insertLimitedText('abc', 1, 2, 'X\r\nY')).toEqual({ text: 'aX\nYc', truncated: false });
  const full = 'a'.repeat(TEXT_INPUT_MAX_LENGTH);
  expect(insertLimitedText(full, 0, 0, 'x')).toEqual({ text: full, truncated: true });
  expect(insertLimitedText(full, 0, 2, 'xyz')).toEqual({ text: 'xy' + full.slice(2), truncated: true });
  expect(insertLimitedText(full, 0, 2, 'xy').truncated).toBe(false);
});
test('connection tests require valid draft credentials and AI model', () => {
  const message = credentials => ({ type: 'TEST_PROVIDER_CONNECTION', credentials });
  expect(isRuntimeMessage(message({ type: 'google-v2', apiKey: 'draft' }))).toBe(true);
  expect(isRuntimeMessage(message({ type: 'kimi', apiKey: 'draft', model: 'model' }))).toBe(true);
  for (const credentials of [null, { type: 'unknown', apiKey: 'draft' }, { type: 'google-v2', apiKey: ' ' }, { type: 'kimi', apiKey: 'draft' }]) {
    expect(isRuntimeMessage(message(credentials))).toBe(false);
  }
});
