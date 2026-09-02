import { useLocale } from "../state/LocaleContext";
import { ownershipLegendRows, type OwnershipPrediction } from "./ownershipPredictionModel";

export function OwnershipPredictionOverlay({ prediction }: { prediction: OwnershipPrediction }) {
  return <div className="ownership-forecast-overlay" aria-hidden="true">
    <div className="ownership-forecast-range" style={{ left: `${prediction.start}%`, width: `${prediction.end - prediction.start}%` }} />
    <div className="ownership-forecast-base" style={{ left: `${prediction.base}%` }} />
  </div>;
}

export function OwnershipPredictionLegend({ prediction, previousRate }: { prediction: OwnershipPrediction; previousRate: number | null }) {
  const { locale } = useLocale();
  return <div className="ownership-forecast-legend" role="note" aria-label={locale === "ko" ? "장중 외국인 보유율 예측" : "Intraday foreign ownership prediction"}>
    <dl>{ownershipLegendRows(prediction, previousRate, locale).map(row => <div className={`ownership-forecast-row is-${row.kind}`} key={row.kind}>
      <dt><i className={`ownership-${row.kind}-key`} aria-hidden="true" />{row.label}</dt>
      <dd>{row.value}</dd>
    </div>)}</dl>
  </div>;
}
