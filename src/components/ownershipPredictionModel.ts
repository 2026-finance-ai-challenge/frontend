import type { ForeignOwnership, Quote, StockDetail } from "../types";

export function legalOwnershipLimit(ownership?: ForeignOwnership) {
  const quantity = ownership?.foreignLimitQuantity;
  const total = ownership?.totalListedQuantity;
  if (quantity == null || total == null || !Number.isFinite(quantity) || !Number.isFinite(total)
    || quantity <= 0 || total <= 0 || quantity > total) return null;
  return quantity / total * 100;
}

export function ownershipPrediction({ subjectToLimit, ownership, prediction, quote, regularDay }: {
  subjectToLimit: boolean;
  ownership?: ForeignOwnership;
  prediction?: StockDetail["foreignLimitPrediction"];
  quote?: Quote;
  regularDay: string | null;
}) {
  const cap = legalOwnershipLimit(ownership);
  if (!subjectToLimit || !regularDay || cap === null || ownership?.status !== "AVAILABLE"
    || quote?.marketSession !== "REGULAR" || !quote.asOf
    || prediction?.status !== "AVAILABLE" || prediction.baseDate !== regularDay) return null;
  const quoteTime = Date.parse(quote.asOf);
  // 전 거래일 REGULAR 캐시가 다음 날 장중 예측을 노출하지 않게 한다.
  if (!Number.isFinite(quoteTime)
    || new Date(quoteTime + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) !== regularDay) return null;
  const { minRate, baseRate, maxRate } = prediction;
  if (minRate == null || baseRate == null || maxRate == null
    || ![minRate, baseRate, maxRate].every(Number.isFinite)
    || minRate < 0 || minRate > baseRate || baseRate > maxRate || maxRate > 100) return null;
  // 화면 좌표만 법정 한도에 제한하고 실제 예측값은 그대로 표시한다.
  const position = (value: number) => Math.min(value / cap * 100, 100);
  return { minRate, baseRate, maxRate, start: position(minRate), end: position(maxRate), base: position(baseRate) };
}

export type OwnershipPrediction = NonNullable<ReturnType<typeof ownershipPrediction>>;

export function ownershipLegendRows(prediction: OwnershipPrediction, previousRate: number | null, locale: string) {
  return [
    { kind: "previous", label: locale === "ko" ? "직전 보유율" : "Previous", value: previousRate != null && Number.isFinite(previousRate) ? `${previousRate.toFixed(2)}%` : "—" },
    { kind: "range", label: locale === "ko" ? "예측 범위" : "Forecast range", value: `${prediction.minRate.toFixed(2)}–${prediction.maxRate.toFixed(2)}%` },
    { kind: "base", label: locale === "ko" ? "예측 기준값" : "Forecast base", value: `${prediction.baseRate.toFixed(2)}%` },
  ];
}
