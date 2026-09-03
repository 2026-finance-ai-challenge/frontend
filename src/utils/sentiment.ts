export function sentimentTone(value?: string | null): "positive" | "negative" | "neutral" {
  const normalized = value?.trim().toUpperCase();
  return normalized === "POSITIVE" ? "positive" : normalized === "NEGATIVE" ? "negative" : "neutral";
}
