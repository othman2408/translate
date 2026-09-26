import { expect, test } from 'bun:test';
import { makeAlternativeSelection, parseAlternatives } from '../lib/translation-alternatives';
import { isRuntimeMessage } from '../lib/messages';

test('alternatives payloads enforce phrase and context limits at the message boundary', () => {
  const request = { type: 'TRANSLATION_ALTERNATIVES', text: 'hello', context: 'hello world', language: 'en' };
  expect(isRuntimeMessage(request)).toBe(true);
  expect(isRuntimeMessage({ ...request, text: 'x'.repeat(500), context: 'x'.repeat(1500) })).toBe(true);
  for (const fields of [{ text: '' }, { text: '  ' }, { text: 'x'.repeat(501) }, { context: [] }, { context: 'x'.repeat(1501) }, { language: 5 }, { language: 'x'.repeat(51) }]) {
    expect(isRuntimeMessage({ ...request, ...fields })).toBe(false);
  }
});

test('selection captures bounded nearby text without truncating an overlong phrase silently', () => {
  const text = 'a'.repeat(2000) + 'phrase' + 'b'.repeat(2000);
  const selection = makeAlternativeSelection(text, 2000, 2006, 'en');
  expect(selection.text).toBe('phrase');
  expect(selection.context).toHaveLength(1500);
  expect(selection.context).toContain('phrase');
  expect(selection.language).toBe('en');
  expect(makeAlternativeSelection('  ', 0, 2)).toBeUndefined();
  expect(makeAlternativeSelection(text, 0, 501).text).toHaveLength(501);
});

test('provider output is validated, deduplicated and limited to three suggestions', () => {
  const alternatives = ['hello', 'Hi', ' hi ', 'Welcome', 'Greetings', 'Hey'].map(text => ({ text, explanation: 'A greeting.' }));
  expect(parseAlternatives('```json\n' + JSON.stringify({ alternatives }) + '\n```', 'Hello').map(item => item.text)).toEqual(['Hi', 'Welcome', 'Greetings']);
  for (const raw of ['bad', '{}', '{"alternatives":[]}', '{"alternatives":[{"text":"Hi"}]}', JSON.stringify({ alternatives: [{ text: 'hello', explanation: 'same' }] }), JSON.stringify({ alternatives: [{ text: 'Hi', explanation: 'x'.repeat(1001) }] })]) {
    expect(() => parseAlternatives(raw, 'hello')).toThrow();
  }
});
