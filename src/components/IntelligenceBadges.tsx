import { useLocale } from "../state/LocaleContext";

export function IntelligenceBadges({ sentiment, importance, eventType }: {
  sentiment?: string | null;
  importance?: string | null;
  eventType?: string | null;
}) {
  const { locale } = useLocale();
  const normalized = (sentiment || "NEUTRAL").toUpperCase();
  const sentimentLabel = locale === "ko"
    ? ({ POSITIVE: "긍정", NEGATIVE: "부정", NEUTRAL: "중립" }[normalized] || normalized)
    : normalized.charAt(0) + normalized.slice(1).toLowerCase();
  const importanceLabel = importance
    ? locale === "ko" ? `${importanceLabelKo(importance)} 중요도` : `${importance} priority`
    : locale === "ko" ? "분석 중" : "Analysis pending";
  return <div className="tags intelligence-badges">
    <span className={`signal-badge is-${normalized.toLowerCase()}`}>
      <img src={normalized === "NEGATIVE" ? "/assets/trend-down.svg" : normalized === "POSITIVE" ? "/assets/trend-up.svg" : "/assets/trend-neutral.svg"} alt="" />
      {sentimentLabel}
    </span>
    <span className={`signal-badge is-${(importance || "pending").toLowerCase()}`}>{importanceLabel}</span>
    {eventType ? <span className="signal-badge is-category">{eventType.replaceAll("_", " ")}</span> : null}
  </div>;
}

function importanceLabelKo(value: string) {
  return ({ CRITICAL: "최상", HIGH: "높음", MEDIUM: "보통", LOW: "낮음" } as Record<string, string>)[value] || value;
}
