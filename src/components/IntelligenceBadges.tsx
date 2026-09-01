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
  const categoryBadge = eventType ? <span className="signal-badge is-category">{eventTypeLabel(eventType, locale)}</span> : null;
  return <div className={`tags intelligence-badges is-${variant}`}>
    {variant === "filing" ? <>{categoryBadge}{importanceBadge}{sentimentBadge}</> : <>{sentimentBadge}{importanceBadge}{categoryBadge}</>}
  </div>;
}

function importanceLabelKo(value: string) {
  return ({ CRITICAL: "최상", HIGH: "높음", MEDIUM: "보통", LOW: "낮음" } as Record<string, string>)[value] || value;
}

function eventTypeLabel(value: string, locale: "en" | "ko") {
  const normalized = value.toUpperCase();
  if (locale === "ko") {
    return ({
      FOREIGN_SELLING: "외국인 매도", LISTING: "상장", EARNINGS: "실적", DIVIDEND: "배당",
      CAPITAL_RAISE: "자본 조달", GOVERNANCE: "지배구조", REGULATION: "규제", M_AND_A: "인수합병",
    } as Record<string, string>)[normalized] || value.replaceAll("_", " ");
  }
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
