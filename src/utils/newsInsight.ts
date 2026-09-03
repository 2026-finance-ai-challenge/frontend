import type { NewsArticle, TranslationResult } from "../types";

export function generatedNewsInsight(translation: TranslationResult | null | undefined, locale: "en" | "ko") {
  if (!translation || translation.targetLocale !== locale) return null;
  if (translation.status !== "READY" && translation.result?.summaryReady !== true) return null;
  return translation.result && hasCompleteNewsInsight(translation.result) ? translation.result : null;
}

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
