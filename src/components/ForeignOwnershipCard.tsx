import { Link } from "react-router-dom";
import { useLocale } from "../state/LocaleContext";
import type { ForeignLimitMonitor } from "../types";
import { adaptiveTextClass, conciseCompanyName } from "../utils/text";
import { legalOwnershipLimit, ownershipPrediction } from "./ownershipPredictionModel";
import { OwnershipPredictionLegend } from "./OwnershipPrediction";
import { OwnershipGauge } from "./OwnershipGauge";

export const ownershipLabels = {
  danger: "Near reached",
  warning: "Near cap",
  safe: "Open",
  unavailable: "Data unavailable",
} as const;

export function ownershipTone(item: ForeignLimitMonitor): keyof typeof ownershipLabels {
  const ownership = item.stock.foreignOwnership;
  if (ownership?.status !== "AVAILABLE" || ownership.limitExhaustionRate == null || ownership.ownershipRate == null) {
    return "unavailable";
  }
  if (!item.warning) return "safe";
  return ownership.limitExhaustionRate >= 100 ? "danger" : "warning";
}

export function ownershipExhaustion(item: ForeignLimitMonitor) {
  return item.stock.foreignOwnership?.limitExhaustionRate ?? -1;
}

export function ForeignOwnershipCard({ item }: { item: ForeignLimitMonitor }) {
  const { locale, stockName } = useLocale();
  const used = item.stock.foreignOwnership?.ownershipRate ?? null;
  const cap = legalOwnershipLimit(item.stock.foreignOwnership);
  const prediction = ownershipPrediction({
    subjectToLimit: Boolean(item.policy),
    ownership: item.stock.foreignOwnership,
    prediction: item.prediction,
  });
  const tone = ownershipTone(item);
  const remaining = cap !== null && used !== null ? Math.max(cap - used, 0) : null;
  const exhaustion = cap !== null && used !== null && cap > 0 ? used / cap * 100 : null;
  const name = locale === "en" ? conciseCompanyName(stockName(item.stock)) : stockName(item.stock);

  return (
    <Link className={`ownership-card${prediction ? " has-prediction" : ""}`} to={`/stocks/${item.stock.stockCode}`}>
      <div className="card-title">
        <span className={tone}>
          {tone === "danger" ? <img src="/assets/status-warning.svg" alt="" /> : null}
          {locale === "ko"
            ? ({ danger: "한도 도달", warning: "한도 근접", safe: "여유", unavailable: "데이터 없음" } as const)[tone]
            : ownershipLabels[tone]}
        </span>
        <div>
          <h3 className={adaptiveTextClass(name, "ownership-name", 18, 28)}>{name}</h3>
          <p>{item.stock.stockCode} · {item.stock.sector || item.stock.market}</p>
        </div>
      </div>
      <strong className={tone}>
        {remaining === null ? locale === "ko" ? "정보 없음" : "Unavailable" : remaining.toFixed(2)}
        <small>{remaining === null ? locale === "ko" ? "확인된 보유 현황 없음" : "No verified ownership snapshot" : locale === "ko" ? "% 잔여" : "% remaining"}</small>
      </strong>
      <OwnershipGauge className={`gauge gauge-${tone}`} tone={tone} value={exhaustion} prediction={prediction} />
      <div className="gauge-labels">
        <span>{locale === "ko" ? "사용" : "Used"} {used === null ? locale === "ko" ? "정보 없음" : "Unavailable" : `${used.toFixed(2)}%`}</span>
        <span>{locale === "ko" ? "한도" : "Cap"} {cap === null ? locale === "ko" ? "정보 없음" : "Unavailable" : `${cap.toFixed(2)}%`}</span>
      </div>
      {prediction ? <OwnershipPredictionLegend prediction={prediction} previousRate={used} /> : null}
      <p className="ownership-note">
        {remaining === null
          ? locale === "ko" ? "검증된 보유 현황이 수집되면 주문 가능 여유를 표시합니다." : "Verified headroom will appear when the ownership snapshot is available."
          : tone === "danger"
            ? locale === "ko" ? "한도가 해소될 때까지 거래소에서 외국인 매수 주문이 제한됩니다." : "Foreign buy orders are rejected at the exchange until the quota frees up."
            : tone === "warning"
              ? locale === "ko" ? "한도는 장중 도달할 수 있으므로 주문 전에 잔여 한도를 확인하세요." : "The cap can be reached intraday; check remaining headroom before ordering."
              : locale === "ko" ? "현재 법정 한도 안에서 외국인 매수 여유가 남아 있습니다." : "Foreign investors currently have room to buy within the statutory cap."}
      </p>
    </Link>
  );
}
