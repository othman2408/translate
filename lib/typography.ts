export type Typography = { size: number };
export const MIN_TEXT_SIZE = 12;
export const MAX_TEXT_SIZE = 28;
export const DEFAULT_TYPOGRAPHY: Typography = { size: 16 };

// Accept only supported text-size values from local storage.
export function normalizeTypography(value: unknown): Typography {
  const input = value && typeof value === 'object' ? value as Partial<Typography> : {};
  return {
    size: typeof input.size === 'number' && Number.isFinite(input.size)
      ? Math.max(MIN_TEXT_SIZE, Math.min(MAX_TEXT_SIZE, Math.round(input.size))) : DEFAULT_TYPOGRAPHY.size,
  };
}
