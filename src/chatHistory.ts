import type { Locale } from "./state/LocaleContext";

export function chatHistoryEmptyMessage(locale: Locale, search: string) {
  if (search.trim()) {
    return locale === "ko"
      ? "검색과 일치하는 대화가 없습니다."
      : "No conversations match your search.";
  }

  return locale === "ko" ? "아직 대화가 없습니다." : "No conversations yet.";
}
