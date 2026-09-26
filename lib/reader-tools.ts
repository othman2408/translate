export type TextMatch = { start: number; end: number };

// Literal, case-insensitive search; preserve UTF-16 offsets used by JS strings.
export function findTextMatches(text: string, query: string): TextMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(text.matchAll(new RegExp(escaped, 'giu')), (match) => ({
    start: match.index, end: match.index + match[0].length,
  }));
}

export function linkedScrollTop(top: number, sourceRange: number, targetRange: number): number {
  if (sourceRange <= 0 || targetRange <= 0) return 0;
  return Math.max(0, Math.min(1, top / sourceRange)) * targetRange;
}

export function nextMatchIndex(current: number, direction: number, count: number): number {
  return count > 0 ? ((current + direction) % count + count) % count : 0;
}
