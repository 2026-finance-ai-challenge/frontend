import type { NewsArticle } from "../types";

export function localizedNewsInsight(article: NewsArticle, locale: "en" | "ko") {
  return locale === "ko"
    ? { what: article.whatKo, why: article.whyKo, impact: article.impactKo }
    : { what: article.whatEn, why: article.whyEn, impact: article.impactEn };
}

export function hasCompleteNewsInsight(insight: {
  what?: string | null;
  why?: string | null;
  impact?: string | null;
}) {
  return Boolean(insight.what?.trim() && insight.why?.trim() && insight.impact?.trim());
}
