import type { ForeignOwnership, StockDetail } from "../types";
import { getOwnershipForecastWindow, nextKoreaTradingDay } from "../utils/koreaMarketClock.ts";

export function legalOwnershipLimit(ownership?: ForeignOwnership) {
  const quantity = ownership?.foreignLimitQuantity;
  const total = ownership?.totalListedQuantity;
  if (quantity == null || total == null || !Number.isFinite(quantity) || !Number.isFinite(total)
    || quantity <= 0 || total <= 0 || quantity > total) return null;
  return quantity / total * 100;
}

export function ownershipPrediction({ subjectToLimit, ownership, prediction, now = new Date() }: {
  subjectToLimit: boolean;
  ownership?: ForeignOwnership;
  prediction?: StockDetail["foreignLimitPrediction"];
  now?: Date;
}) {
  const cap = legalOwnershipLimit(ownership);
  const window = getOwnershipForecastWindow(now);
  if (!subjectToLimit || cap === null || ownership?.status !== "AVAILABLE"
    || prediction?.status !== "AVAILABLE" || !prediction.baseDate || !window.targetDate
    || prediction.targetDate !== window.targetDate
    || prediction.predictionSession !== window.session
    || nextKoreaTradingDay(prediction.baseDate) !== prediction.targetDate) return null;
  const { minRate, baseRate, maxRate } = prediction;
  if (minRate == null || baseRate == null || maxRate == null
    || ![minRate, baseRate, maxRate].every(Number.isFinite)
    || minRate < 0 || minRate > baseRate || baseRate > maxRate || maxRate > 100) return null;
  // 화면 좌표만 법정 한도에 제한하고 실제 예측값은 그대로 표시한다.
  const position = (value: number) => Math.min(value / cap * 100, 100);
  return { minRate, baseRate, maxRate, start: position(minRate), end: position(maxRate), base: position(baseRate), targetDate: prediction.targetDate, session: window.session };
}

export type OwnershipPrediction = NonNullable<ReturnType<typeof ownershipPrediction>>;

export function ownershipPredictionLabel(prediction: OwnershipPrediction, locale: string) {
  return `${prediction.session === "INTRADAY"
    ? locale === "ko" ? "장중 예측" : "Intraday forecast"
    : locale === "ko" ? "다음 장 예측" : "Next-session forecast"} · ${prediction.targetDate} KST`;
}

export function ownershipLegendRows(prediction: OwnershipPrediction, previousRate: number | null, locale: string) {
  return [
    { kind: "previous", label: locale === "ko" ? "직전 보유율" : "Previous", value: previousRate != null && Number.isFinite(previousRate) ? `${previousRate.toFixed(2)}%` : "—" },
    { kind: "range", label: locale === "ko" ? "예측 범위" : "Forecast range", value: `${prediction.minRate.toFixed(2)}–${prediction.maxRate.toFixed(2)}%` },
    { kind: "base", label: locale === "ko" ? "예측 기준값" : "Forecast base", value: `${prediction.baseRate.toFixed(2)}%` },
  ];
}
