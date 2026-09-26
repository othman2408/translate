// Keep pasted text, page selections and expanded-view handoffs consistent.
export const TEXT_INPUT_MAX_LENGTH = 15_000;

export function insertLimitedText(text: string, start: number, end: number, pasted: string) {
  const available = Math.max(0, TEXT_INPUT_MAX_LENGTH - (text.length - (end - start)));
  const inserted = pasted.replace(/\r\n?/g, '\n');
  return {
    text: text.slice(0, start) + inserted.slice(0, available) + text.slice(end),
    truncated: inserted.length > available,
  };
}
