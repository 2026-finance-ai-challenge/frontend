import { useLocale } from "../state/LocaleContext";
import type { OwnershipPrediction } from "./ownershipPredictionModel";

export function OwnershipPredictionOverlay({ prediction }: { prediction: OwnershipPrediction }) {
  return <div className="ownership-forecast-overlay" aria-hidden="true">
    <div className="ownership-forecast-range" style={{ left: `${prediction.start}%`, width: `${prediction.end - prediction.start}%` }} />
    <div className="ownership-forecast-base" style={{ left: `${prediction.base}%` }} />
  </div>;
}

export function OwnershipPredictionLegend({ prediction }: { prediction: OwnershipPrediction }) {
  const { locale } = useLocale();
  return <div className="ownership-forecast-legend" role="note" aria-label={locale === "ko" ? "장중 외국인 보유율 예측" : "Intraday foreign ownership prediction"}>
    <div className="ownership-forecast-keys">
      <span><i className="ownership-previous-key" />{locale === "ko" ? "직전 보유율" : "Previous"}</span>
      <span><i className="ownership-forecast-key" />{locale === "ko" ? "예측 범위" : "Forecast range"}</span>
    </div>
    <div className="ownership-forecast-numbers">
      <span>{prediction.minRate.toFixed(2)}–{prediction.maxRate.toFixed(2)}%</span>
      <span>{locale === "ko" ? "기준" : "Base"} {prediction.baseRate.toFixed(2)}%</span>
    </div>
  </div>;
}
