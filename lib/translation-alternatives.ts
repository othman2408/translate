// Bound selected phrases and nearby context independently of the full reader limit.
export const ALTERNATIVE_TEXT_LIMIT = 500;
export const ALTERNATIVE_CONTEXT_LIMIT = 1500;
export type TranslationAlternative = { text: string; explanation: string };
export type AlternativeSelection = { text: string; context: string; language?: string };

export function makeAlternativeSelection(text: string, start: number, end: number, language?: string): AlternativeSelection | undefined {
  const selected = text.slice(start, end).trim();
  if (!selected) return undefined;
  const contextStart = Math.max(0, start - 500);
  return { text: selected, context: text.slice(contextStart, contextStart + ALTERNATIVE_CONTEXT_LIMIT), language };
}

export function parseAlternatives(raw: string, selected: string): TranslationAlternative[] {
  if (raw.length > 20_000) throw new Error('Invalid alternatives');
  const data: unknown = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!data || typeof data !== 'object' || !('alternatives' in data) || !Array.isArray(data.alternatives)) {
    throw new Error('Invalid alternatives');
  }
  const seen = new Set([selected.trim().toLocaleLowerCase()]);
  const result: TranslationAlternative[] = [];
  for (const item of data.alternatives) {
    if (!item || typeof item.text !== 'string' || typeof item.explanation !== 'string') throw new Error('Invalid alternative');
    const text = item.text.trim();
    const explanation = item.explanation.trim();
    if (!text || text.length > 1000 || !explanation || explanation.length > 1000) throw new Error('Invalid alternative');
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ text, explanation });
  }
  if (!result.length) throw new Error('No alternatives');
  return result.slice(0, 3);
}
