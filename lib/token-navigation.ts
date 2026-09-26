// Arrow keys follow visual reading direction; Home/End follow logical text order.
export function navigateToken(indices: number[], current: number, key: string, rtl: boolean): number | undefined {
  if (!indices.length) return;
  if (key === 'Home') return indices[0];
  if (key === 'End') return indices.at(-1);
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
  const step = (key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
  const index = Math.max(0, indices.indexOf(current));
  return indices[Math.max(0, Math.min(indices.length - 1, index + step))];
}
