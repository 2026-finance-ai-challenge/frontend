type Locale = "en" | "ko";

export function stockCurrency(krw: number | null | undefined, rate: number | null | undefined, locale: Locale, primary = true, signed = false) {
  const usd = primary ? locale === "en" : locale === "ko";
  if (krw == null || !Number.isFinite(krw) || (usd && (rate == null || !Number.isFinite(rate) || rate <= 0))) {
    return locale === "ko" ? "정보 없음" : "Unavailable";
  }
  const value = usd ? krw / rate! : krw;
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    style: "currency", currency: usd ? "USD" : "KRW", maximumFractionDigits: usd ? 2 : 0,
    signDisplay: signed ? "always" : "auto",
  }).format(value);
}
