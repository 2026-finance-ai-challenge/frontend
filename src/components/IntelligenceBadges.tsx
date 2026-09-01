import { useLocale } from "../state/LocaleContext";

export function IntelligenceBadges({ sentiment, importance, eventType, variant = "news" }: {
  sentiment?: string | null;
  importance?: string | null;
  eventType?: string | null;
  variant?: "news" | "filing";
}) {
  const { locale } = useLocale();
  const normalized = (sentiment || "NEUTRAL").toUpperCase();
  const sentimentLabel = locale === "ko"
    ? ({ POSITIVE: "긍정", NEGATIVE: "부정", NEUTRAL: "중립" }[normalized] || normalized)
    : normalized.charAt(0) + normalized.slice(1).toLowerCase();
  const importanceLabel = importance
    ? locale === "ko" ? `${importanceLabelKo(importance)} 중요도` : `${importance} priority`
    : locale === "ko" ? "분석 중" : "Analysis pending";
  const sentimentBadge = <span className={`signal-badge is-${normalized.toLowerCase()}`}>
      <img src={normalized === "NEGATIVE" ? "/assets/trend-down.svg" : normalized === "POSITIVE" ? "/assets/trend-up.svg" : "/assets/trend-neutral.svg"} alt="" />
      {sentimentLabel}
    </span>;
  const importanceBadge = <span className={`signal-badge is-${(importance || "pending").toLowerCase()}`}>{importanceLabel}</span>;
  const categoryBadge = eventType ? <span className={`signal-badge ${variant === "filing" ? "is-filing-category" : "is-category"}`}>{eventType.replaceAll("_", " ")}</span> : null;
  return <div className={`tags intelligence-badges is-${variant}`}>
    {variant === "filing" ? <>{categoryBadge}{importanceBadge}{sentimentBadge}</> : <>{sentimentBadge}{importanceBadge}{categoryBadge}</>}
  </div>;
}

function importanceLabelKo(value: string) {
  return ({ CRITICAL: "최상", HIGH: "높음", MEDIUM: "보통", LOW: "낮음" } as Record<string, string>)[value] || value;
}
