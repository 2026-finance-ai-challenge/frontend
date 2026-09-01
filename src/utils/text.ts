export function adaptiveTextClass(value: string, prefix = "adaptive-text", compactAt = 58, denseAt = 92) {
  const length = Array.from(value.trim()).length;
  if (length >= denseAt) return `${prefix} ${prefix}--dense`;
  if (length >= compactAt) return `${prefix} ${prefix}--compact`;
  return prefix;
}

export function conciseCompanyName(value: string) {
  return value
    .replace(/\s+(?:CO\.?\s*,?\s*LTD\.?|CORPORATION|CORP\.?|INC\.?)$/i, "")
    .trim();
}
