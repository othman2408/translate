import type { TranslationResponse } from '@/lib/messages';

import type { AlignmentState, TextSide, TokenPart, TokenRange } from './types';

const DEFAULT_MIN_ALIGNMENT_SIMILARITY = 0.46;

export function normalizeRange(range: TokenRange): TokenRange {
  return range.startPartIndex <= range.endPartIndex
    ? range
    : { startPartIndex: range.endPartIndex, endPartIndex: range.startPartIndex };
}

export function isRangeEqual(first?: TokenRange, second?: TokenRange): boolean {
  return Boolean(
    first &&
    second &&
    first.startPartIndex === second.startPartIndex &&
    first.endPartIndex === second.endPartIndex,
  );
}

export function isPartInRange(part: TokenPart, range?: TokenRange): boolean {
  if (!range) {
    return false;
  }

  const normalizedRange = normalizeRange(range);
  return part.partIndex >= normalizedRange.startPartIndex && part.partIndex <= normalizedRange.endPartIndex;
}

export function getSideRange(
  alignment: AlignmentState | undefined,
  side: TextSide,
  rangeType: 'selected' | 'matched',
): TokenRange | undefined {
  if (!alignment) {
    return undefined;
  }

  if (rangeType === 'selected') {
    return alignment.selectedSide === side ? alignment.selectedRange : undefined;
  }

  return alignment.selectedSide !== side ? alignment.matchedRange : undefined;
}

export function getWordCount(parts: TokenPart[], range: TokenRange): number {
  return parts.filter((part) => part.isWordLike && isPartInRange(part, range)).length;
}

export function getRangeText(parts: TokenPart[], range: TokenRange): string {
  const normalizedRange = normalizeRange(range);
  return parts
    .filter((part) => part.partIndex >= normalizedRange.startPartIndex && part.partIndex <= normalizedRange.endPartIndex)
    .map((part) => part.text)
    .join('');
}

export function tokenizeText(text: string, language?: string): TokenPart[] {
  if (!text) {
    return [];
  }

  if ('Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(
      language && language !== 'auto' ? language : undefined,
      { granularity: 'word' },
    );
    let wordIndex = 0;

    return Array.from(segmenter.segment(text)).map((segment, index) => {
      const isWordLike = Boolean(segment.isWordLike);
      const part: TokenPart = {
        partIndex: index,
        text: segment.segment,
        isWordLike,
      };

      if (isWordLike) {
        part.wordIndex = wordIndex;
        wordIndex += 1;
      }

      return part;
    });
  }

  let wordIndex = 0;
  const segments = text.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) ?? [text];
  return segments.map((segment, index) => {
    const isWordLike = /[\p{L}\p{N}]/u.test(segment);
    const part: TokenPart = {
      partIndex: index,
      text: segment,
      isWordLike,
    };

    if (isWordLike) {
      part.wordIndex = wordIndex;
      wordIndex += 1;
    }

    return part;
  });
}

export function getResolvedSourceLanguage(
  response: TranslationResponse | undefined,
  sourceLanguage: string,
): string | undefined {
  if (!response?.ok) {
    return undefined;
  }

  if (response.detectedSourceLanguage) {
    return response.detectedSourceLanguage;
  }

  return sourceLanguage === 'auto' ? undefined : sourceLanguage;
}

export function findBestTokenRange(
  queries: string[] | string,
  targetParts: TokenPart[],
  expectedCenterRatio?: number,
): TokenRange | undefined {
  const normalizedQueries = Array.from(new Set(
    (Array.isArray(queries) ? queries : [queries])
      .map((query) => normalizeAlignmentText(query))
      .filter(Boolean),
  ));

  if (normalizedQueries.length === 0) {
    return undefined;
  }

  const wordParts = getWordParts(targetParts);
  if (wordParts.length === 0) {
    return undefined;
  }

  let bestRange: TokenRange | undefined;
  let bestScore = 0;
  const normalizedCandidateCache = new Map<string, string>();

  normalizedQueries.forEach((normalizedQuery) => {
    const queryWordCount = getNormalizedWords(normalizedQuery).length || 1;
    const minWords = queryWordCount <= 2 ? 1 : Math.max(1, Math.floor(queryWordCount * 0.45));
    const maxWords = Math.min(wordParts.length, Math.max(5, Math.ceil(queryWordCount * 2.8) + 2));

    for (let length = minWords; length <= maxWords; length += 1) {
      for (let start = 0; start <= wordParts.length - length; start += 1) {
        const range = getPartRangeFromWordRange(wordParts, start, start + length - 1);
        const cacheKey = `${range.startPartIndex}:${range.endPartIndex}`;
        let normalizedCandidate = normalizedCandidateCache.get(cacheKey);
        if (normalizedCandidate === undefined) {
          normalizedCandidate = normalizeAlignmentText(getRangeText(targetParts, range));
          normalizedCandidateCache.set(cacheKey, normalizedCandidate);
        }

        if (!normalizedCandidate) {
          continue;
        }

        const baseScore = scoreAlignmentCandidate(normalizedQuery, normalizedCandidate);
        const positionScore = expectedCenterRatio === undefined
          ? 1
          : scorePositionProximity(getWordRangeCenterRatio(start, start + length - 1, wordParts.length), expectedCenterRatio);
        const score = baseScore * (0.92 + (positionScore * 0.08));

        if (score > bestScore) {
          bestScore = score;
          bestRange = range;
        }
      }
    }
  });

  return bestRange && bestScore >= getMinimumAlignmentScore(normalizedQueries) ? bestRange : undefined;
}

export function getRangeWordCenterRatio(parts: TokenPart[], range: TokenRange): number | undefined {
  const selectedWordIndexes = parts
    .filter((part) => part.isWordLike && isPartInRange(part, range) && part.wordIndex !== undefined)
    .map((part) => part.wordIndex as number);
  const wordParts = getWordParts(parts);

  if (selectedWordIndexes.length === 0 || wordParts.length === 0) {
    return undefined;
  }

  const firstWordIndex = selectedWordIndexes[0];
  const lastWordIndex = selectedWordIndexes[selectedWordIndexes.length - 1];
  return getWordRangeCenterRatio(firstWordIndex, lastWordIndex, wordParts.length);
}

function normalizeAlignmentText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreAlignmentCandidate(normalizedQuery: string, normalizedCandidate: string): number {
  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }

  const lengthRatio = getLengthRatio(normalizedQuery, normalizedCandidate);
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.88 + (lengthRatio * 0.1);
  }

  if (normalizedQuery.includes(normalizedCandidate)) {
    return 0.8 + (lengthRatio * 0.12);
  }

  const characterScore = diceCoefficient(normalizedQuery, normalizedCandidate);
  const tokenScore = tokenOverlapScore(normalizedQuery, normalizedCandidate);
  return Math.max(characterScore, tokenScore) * (0.82 + (lengthRatio * 0.18));
}

function getMinimumAlignmentScore(normalizedQueries: string[]): number {
  const longestQueryLength = Math.max(...normalizedQueries.map((query) => query.replace(/\s+/g, '').length));

  if (longestQueryLength <= 3) {
    return 0.78;
  }

  if (longestQueryLength <= 8) {
    return 0.58;
  }

  return DEFAULT_MIN_ALIGNMENT_SIMILARITY;
}

function getLengthRatio(first: string, second: string): number {
  const firstLength = first.replace(/\s+/g, '').length;
  const secondLength = second.replace(/\s+/g, '').length;

  if (firstLength === 0 || secondLength === 0) {
    return 0;
  }

  return Math.min(firstLength, secondLength) / Math.max(firstLength, secondLength);
}

function getNormalizedWords(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

function tokenOverlapScore(first: string, second: string): number {
  const firstWords = new Set(getNormalizedWords(first));
  const secondWords = new Set(getNormalizedWords(second));
  if (firstWords.size === 0 || secondWords.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  firstWords.forEach((word) => {
    if (secondWords.has(word)) {
      intersectionSize += 1;
    }
  });

  return (2 * intersectionSize) / (firstWords.size + secondWords.size);
}

function getWordRangeCenterRatio(startWordIndex: number, endWordIndex: number, wordCount: number): number {
  if (wordCount <= 1) {
    return 0.5;
  }

  return ((startWordIndex + endWordIndex) / 2) / (wordCount - 1);
}

function scorePositionProximity(candidateCenterRatio: number, expectedCenterRatio: number): number {
  return Math.max(0, 1 - Math.abs(candidateCenterRatio - expectedCenterRatio));
}

function getWordParts(parts: TokenPart[]): TokenPart[] {
  return parts.filter((part) => part.isWordLike);
}

function getPartRangeFromWordRange(wordParts: TokenPart[], startWordIndex: number, endWordIndex: number): TokenRange {
  return {
    startPartIndex: wordParts[startWordIndex].partIndex,
    endPartIndex: wordParts[endWordIndex].partIndex,
  };
}

function getBigrams(text: string): Map<string, number> {
  const compactText = text.replace(/\s+/g, '');
  if (compactText.length <= 1) {
    return new Map(compactText ? [[compactText, 1]] : []);
  }

  const bigrams = new Map<string, number>();
  for (let index = 0; index < compactText.length - 1; index += 1) {
    const bigram = compactText.slice(index, index + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  return bigrams;
}

function diceCoefficient(first: string, second: string): number {
  if (first === second) {
    return 1;
  }

  const firstBigrams = getBigrams(first);
  const secondBigrams = getBigrams(second);
  if (firstBigrams.size === 0 || secondBigrams.size === 0) {
    return 0;
  }

  let firstTotal = 0;
  let secondTotal = 0;
  let intersectionTotal = 0;

  firstBigrams.forEach((count, bigram) => {
    firstTotal += count;
    intersectionTotal += Math.min(count, secondBigrams.get(bigram) ?? 0);
  });
  secondBigrams.forEach((count) => {
    secondTotal += count;
  });

  return (2 * intersectionTotal) / (firstTotal + secondTotal);
}
