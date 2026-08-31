import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ko";

const messages = {
  en: {
    back: "Back",
    searchPlaceholder: "Company, ticker, or filings",
    login: "Log in",
    loading: "Loading current data…",
    noData: "No matching data is available.",
    retry: "Retry",
    dataUnavailable: "Data unavailable",
    signInRequired: "Sign in required",
    marketNews: "Market news",
    filings: "DART filings pulse",
    chart: "Chart",
    news: "News",
    disclosure: "Disclosure",
    what: "What",
    why: "Why",
    impact: "Impact",
    aiSummary: "AI Insight summary",
    mentioned: "Mentioned",
    reporter: "Reporter",
    receiver: "Receiver",
    documentNo: "Document No.",
    openOriginal: "Open original",
    division: "Division",
    englishTranslation: "English translation",
    koreanOriginal: "Korean original",
    translationLoading: "Translation and grounded insight are loading…",
    companyInsights: "Company insights",
    viewInsights: "View insights",
    overallBusiness: "Overall business",
    close: "Close",
  },
  ko: {
    back: "뒤로",
    searchPlaceholder: "기업명, 종목코드 또는 공시 검색",
    login: "로그인",
    loading: "최신 데이터를 불러오는 중…",
    noData: "조건에 맞는 데이터가 없습니다.",
    retry: "다시 시도",
    dataUnavailable: "데이터를 불러올 수 없습니다",
    signInRequired: "로그인이 필요합니다",
    marketNews: "시장 뉴스",
    filings: "DART 공시 동향",
    chart: "차트",
    news: "뉴스",
    disclosure: "공시",
    what: "무엇",
    why: "이유",
    impact: "영향",
    aiSummary: "AI 핵심 요약",
    mentioned: "관련 종목",
    reporter: "제출인",
    receiver: "수신처",
    documentNo: "접수번호",
    openOriginal: "원문 열기",
    division: "분류",
    englishTranslation: "영문 번역",
    koreanOriginal: "한글 원문",
    translationLoading: "번역과 근거 기반 요약을 준비하는 중…",
    companyInsights: "기업 인사이트",
    viewInsights: "인사이트 보기",
    overallBusiness: "전체 사업",
    close: "닫기",
  },
} as const;

type MessageKey = keyof typeof messages.en;
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  stockName: (stock: { nameKo?: string | null; nameEn?: string | null }) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => localStorage.getItem("kart-locale") === "ko" ? "ko" : "en");
  const setLocale = (next: Locale) => {
    localStorage.setItem("kart-locale", next);
    setLocaleState(next);
  };
  useEffect(() => {
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => messages[locale][key],
    stockName: (stock) => locale === "ko" ? stock.nameKo || stock.nameEn || "" : stock.nameEn || stock.nameKo || "",
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing");
  return value;
}
