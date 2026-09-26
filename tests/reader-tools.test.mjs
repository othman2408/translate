import { expect, test } from 'bun:test';
import { findTextMatches, linkedScrollTop, nextMatchIndex } from '../lib/reader-tools';

test('reader search treats punctuation as literal and preserves cross-word offsets', () => {
  expect(findTextMatches('A [test]. a [TEST].', '[test].')).toEqual([
    { start: 2, end: 9 }, { start: 12, end: 19 },
  ]);
  expect(findTextMatches('one two\none two', 'one two')).toEqual([
    { start: 0, end: 7 }, { start: 8, end: 15 },
  ]);
  expect(findTextMatches('.* +? (hello) $ ^ | \\', '.*')).toEqual([{ start: 0, end: 2 }]);
});

test('reader search supports Arabic, emoji and case folding without shifting offsets', () => {
  expect(findTextMatches('😀 نص عربي 😀', '😀')).toEqual([{ start: 0, end: 2 }, { start: 11, end: 13 }]);
  expect(findTextMatches('نص عربي نص', 'نص')).toEqual([{ start: 0, end: 2 }, { start: 8, end: 10 }]);
  expect(findTextMatches('İ test TEST', 'test')).toEqual([{ start: 2, end: 6 }, { start: 7, end: 11 }]);
  expect(findTextMatches('text', '')).toEqual([]);
  expect(findTextMatches('text', 'absent')).toEqual([]);
});

test('search navigation wraps in both directions and handles no matches', () => {
  expect(nextMatchIndex(2, 1, 3)).toBe(0);
  expect(nextMatchIndex(0, -1, 3)).toBe(2);
  expect(nextMatchIndex(0, 1, 0)).toBe(0);
});

test('linked scrolling scales by overflow rather than total text height', () => {
  expect(linkedScrollTop(200, 400, 1000)).toBe(500);
  expect(linkedScrollTop(400, 400, 1000)).toBe(1000);
  expect(linkedScrollTop(-20, 400, 1000)).toBe(0);
  expect(linkedScrollTop(900, 400, 1000)).toBe(1000);
  expect(linkedScrollTop(0, 0, 1000)).toBe(0);
  expect(linkedScrollTop(200, 400, 0)).toBe(0);
});
