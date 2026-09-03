export function formatContentDate(
  value: string | null | undefined,
  locale: "en-US" | "ko-KR",
  time = true,
) {
  if (!value) return locale === "ko-KR" ? "정보 없음" : "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  const formatted = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
    ...(time ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).format(parsed);
  return time ? `${formatted} KST` : formatted;
}
