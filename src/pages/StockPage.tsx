import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { StockNewsFeed } from "../components/StockNewsFeed";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { StockDisclosureFeed } from "./DisclosurePage";
import { api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { GlobalPeer, StockDetail } from "../types";
import { useLocale } from "../state/LocaleContext";

type StockAlert = "vi" | "price-limit";
type ChartMode = "candles" | "line";
type DailyPrice = {
  tradingDate: string;
  openPriceKrw: number;
  highPriceKrw: number;
  lowPriceKrw: number;
  closePriceKrw: number;
  volume: number;
  source: string;
};

function periodToLimit(period: string) {
  return ({ "1D": 2, "1W": 7, "1M": 31, "3M": 93, "1Y": 366 } as Record<string, number>)[period] ?? 31;
}

export function StockPage() {
  const { locale, t, stockName } = useLocale();
  const [params] = useSearchParams();
  const { stockCode = "" } = useParams();
  const profile = useProfile();
  const [period, setPeriod] = useState(params.get("period") || "1M");
  const detailState = useRemote((signal) => api<StockDetail>(`/api/v1/market/stocks/${stockCode}`, { signal }), [stockCode, profile]);
  const historyState = useRemote((signal) => api<{ status: string; items: DailyPrice[] }>(`/api/v1/market/stocks/${stockCode}/history?limit=${periodToLimit(period)}`, { signal }), [stockCode, period]);
  const peersState = useRemote((signal) => api<GlobalPeer>(`/api/v1/market/stocks/${stockCode}/global-peers`, { signal }), [stockCode]);
  const [insights, setInsights] = useState(params.get("insights") === "1");
  const [alert, setAlert] = useState<StockAlert | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const chartCardRef = useRef<HTMLElement>(null);
  const initialTab = params.get("tab");
  const [activeTab, setActiveTab] = useState<
    "chart" | "news" | "disclosure"
  >(
    initialTab === "news" || initialTab === "disclosure"
      ? initialTab
      : "chart",
  );
  useEffect(() => {
    const quote = detailState.data?.quote;
    if (!quote) return;
    if (quote.viActive || quote.singlePriceTrading) setAlert("vi");
    else if (quote.priceLimitState && quote.priceLimitState !== "NONE") setAlert("price-limit");
  }, [detailState.data]);
  useEffect(() => {
    if (!profile) return;
    void api("/api/v1/me/recently-viewed", {
      method: "POST",
      body: JSON.stringify({ itemType: "STOCK", referenceId: stockCode, stockCode }),
    }).catch(() => undefined);
  }, [profile, stockCode]);
  const quoteChangeRate = detailState.data?.quote.changeRate;
  const ownershipExhaustion = detailState.data?.foreignOwnership.limitExhaustionRate;
  const activePrediction = detailState.data?.foreignLimitPrediction.status === "AVAILABLE"
    && detailState.data.quote.marketSession === "REGULAR";
  return (
    <div className={`stock-page ${insights ? "panel-open" : ""}`}>
      <div className="stock-main">
        <div className="stock-hero">
          <Header />
          <div className="page-shell stock-summary">
            <BackLink to="/" />
            {detailState.error ? <RemoteState {...detailState}>{() => null}</RemoteState> : null}
            <div className="stock-title-row">
              <div>
                <h1 className={(detailState.data ? stockName(detailState.data) : "").length > 24 ? "is-long-title" : ""}>
                  {detailState.data ? stockName(detailState.data) : locale === "ko" ? "종목을 불러오는 중…" : "Loading stock…"}{" "}
                  <WatchlistHeart
                    className="heart-button"
                    itemId={stockCode}
                    itemName={detailState.data ? stockName(detailState.data) : stockCode}
                  />
                </h1>
                <p>{stockCode}&nbsp;&nbsp; · &nbsp;&nbsp;{detailState.data?.market || "—"}</p>
                <p>
                  {localizedMarketStatus(detailState.data?.quote.status, locale)} · {formatDate(detailState.data?.quote.asOf)} · {locale === "ko" ? `환율 ${formatNumber(detailState.data?.exchangeRate.krwPerUnit)}원/USD` : `Converted at ${formatNumber(detailState.data?.exchangeRate.krwPerUnit)} KRW/USD`}
                </p>
              </div>
              <div className="stock-price">
                <strong>{formatStockPrice(detailState.data, locale, true)}</strong>
                <small className="stock-price-secondary">{formatStockPrice(detailState.data, locale, false)}</small>
                <span className={quoteChangeRate == null ? "" : quoteChangeRate >= 0 ? "is-positive" : ""}>
                  {signedNumber(detailState.data?.quote.changeAmountKrw, locale)} {quoteChangeRate == null ? null : <img src={quoteChangeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />} {quoteChangeRate == null ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${quoteChangeRate >= 0 ? "+" : ""}${quoteChangeRate.toFixed(2)}%`}
                </span>
              </div>
            </div>
            <div className="stock-metrics">
              {[
                [locale === "ko" ? "고가" : "High", formatNumber(detailState.data?.quote.highPriceKrw)],
                [locale === "ko" ? "저가" : "Low", formatNumber(detailState.data?.quote.lowPriceKrw)],
                [locale === "ko" ? "거래량" : "Volume", formatNumber(detailState.data?.quote.volume, { notation: "compact" })],
                [locale === "ko" ? "전일 종가" : "Prev close", formatNumber(previousClose(detailState.data))],
              ].map(
                ([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ),
              )}
            </div>
            <div className="stock-badges">
              {detailState.data?.subjectToForeignAcquisitionLimit ? (
              <span
                className="stock-danger"
              >
                <img src="/assets/status-warning.svg" alt="" />
                {detailState.data.foreignOwnership.limitExhaustionRate === null ? (locale === "ko" ? "외국인 한도 정보 없음" : "Foreign limit unavailable") : (locale === "ko" ? `외국인 한도 ${detailState.data.foreignOwnership.limitExhaustionRate.toFixed(1)}% 사용` : `${detailState.data.foreignOwnership.limitExhaustionRate.toFixed(1)}% foreign limit used`)}
              </span>) : null}
              {detailState.data?.quote.viActive || detailState.data?.quote.singlePriceTrading ? (
              <button type="button" onClick={() => setAlert("vi")}>
                <img src="/assets/timer.svg" alt="" />
                {locale === "ko" ? "VI 발동 · 단일가 매매" : "VI active · single-price trading"}
              </button>) : null}
            </div>
            <button
              className="insight-banner"
              onClick={() => setInsights(true)}
            >
              <img src="/assets/info.svg" alt="" />
              <span>
                <strong>{locale === "ko" ? "기업 인사이트 빠른 확인" : "Quick check company insight!"}</strong>
                <small>
                  {locale === "ko" ? "사업 구조가 가장 비슷한 글로벌 기업을 확인하세요." : "See which global companies this business most closely resembles."}
                </small>
              </span>
              <em>
                {t("viewInsights")}{" "}
                <img src="/assets/chevron-right-gold.svg" alt="" />
              </em>
            </button>
          </div>
        </div>

        <main
          className={`page-shell chart-content ${activeTab !== "chart" ? "stock-news-content" : ""}`}
        >
          <div className="stock-tabs">
            <button
              type="button"
              className={activeTab === "chart" ? "active" : ""}
              onClick={() => setActiveTab("chart")}
            >
              {t("chart")}
            </button>
            <button
              type="button"
              className={activeTab === "news" ? "active" : ""}
              onClick={() => setActiveTab("news")}
            >
              {t("news")}
            </button>
            <button
              type="button"
              className={activeTab === "disclosure" ? "active" : ""}
              onClick={() => setActiveTab("disclosure")}
            >
              {t("disclosure")}
            </button>
          </div>
          {activeTab === "news" ? (
            <StockNewsFeed />
          ) : activeTab === "disclosure" ? (
            <StockDisclosureFeed />
          ) : (
            <div className="chart-layout">
              <section className="chart-card" ref={chartCardRef}>
                <div className="chart-tools">
                  <div>
                    {["1D", "1W", "1M", "3M", "1Y"].map((item) => (
                      <button
                        className={period === item ? "active" : ""}
                        onClick={() => setPeriod(item)}
                        key={item}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="chart-tool-icons">
                    <button type="button" className={chartMode === "candles" ? "active" : ""} aria-label={locale === "ko" ? "캔들 차트 보기" : "Show candlestick chart"} aria-pressed={chartMode === "candles"} onClick={() => setChartMode("candles")}>
                      <img src="/assets/chart-candles.svg" alt="" />
                    </button>
                    <button type="button" className={chartMode === "line" ? "active" : ""} aria-label={locale === "ko" ? "선 차트 보기" : "Show line chart"} aria-pressed={chartMode === "line"} onClick={() => setChartMode("line")}>
                      <img src="/assets/chart-line.svg" alt="" />
                    </button>
                    <button type="button" aria-label={locale === "ko" ? "차트 전체 화면 전환" : "Toggle full-screen chart"} onClick={() => void toggleFullscreen(chartCardRef.current)}>
                      <img src="/assets/chart-expand.svg" alt="" />
                    </button>
                  </div>
                </div>
                <RemoteState {...historyState} empty={(value) => !value.items.length}>
                  {(value) => <PriceChart items={value.items} mode={chartMode} label={`${detailState.data?.nameEn || stockCode} ${period} ${chartMode} price chart`} />}
                </RemoteState>
              </section>
              <aside className="ownership-panel">
                <h2>{locale === "ko" ? "외국인 보유" : "Foreign ownership"}</h2>
                <p>{activePrediction
                  ? (locale === "ko" ? "AI 예측 및 법정 한도" : "ML prediction & statutory limit")
                  : detailState.data?.subjectToForeignAcquisitionLimit
                    ? (locale === "ko" ? "최신 확인 보유율 및 법정 한도" : "Latest verified ownership & statutory limit")
                    : (locale === "ko" ? "최신 확인 보유율" : "Latest verified ownership")}</p>
                <div className="ownership-line">
                  <span className={ownershipExhaustion == null ? "unavailable" : ""} style={{ width: `${ownershipExhaustion == null ? 0 : Math.min(ownershipExhaustion, 100)}%` }} />
                </div>
                <div className="ownership-values">
                  <div>
                    <span>{locale === "ko" ? "직전 보유율" : "Previous ownership"}</span>
                    <strong>{detailState.data?.foreignOwnership.ownershipRate === null || detailState.data?.foreignOwnership.ownershipRate === undefined ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${detailState.data.foreignOwnership.ownershipRate.toFixed(2)}%`}</strong>
                  </div>
                  <div>
                    <span>{locale === "ko" ? "법정 한도" : "Legal limit"}</span>
                    <strong>{detailState.data?.subjectToForeignAcquisitionLimit && detailState.data.foreignOwnership.foreignLimitQuantity && detailState.data.foreignOwnership.totalListedQuantity ? `${(detailState.data.foreignOwnership.foreignLimitQuantity / detailState.data.foreignOwnership.totalListedQuantity * 100).toFixed(2)}%` : (locale === "ko" ? "해당 없음" : "Not applicable")}</strong>
                  </div>
                </div>
                {detailState.data?.subjectToForeignAcquisitionLimit && activePrediction ? <div className="prediction">
                  <div>
                    <b>{locale === "ko" ? "오늘의 현재 예측" : "Today’s current prediction"}</b>
                    <span>95% CI</span>
                  </div>
                  <div>
                    <span>
                      {locale === "ko" ? "최소" : "Min"}<small>{percentage(detailState.data?.foreignLimitPrediction.minRate, locale)}</small>
                    </span>
                    <span>
                      {locale === "ko" ? "기준" : "Base"}<small>{percentage(detailState.data?.foreignLimitPrediction.baseRate, locale)}</small>
                    </span>
                    <span>
                      {locale === "ko" ? "최대" : "Max"}<small>{percentage(detailState.data?.foreignLimitPrediction.maxRate, locale)}</small>
                    </span>
                  </div>
                </div> : null}
                {detailState.data?.subjectToForeignAcquisitionLimit && activePrediction ? <p className="prediction-note">
                  {predictionNote(detailState.data, locale)}
                </p> : null}
              </aside>
            </div>
          )}
        </main>
      </div>

      {insights && (
        <aside className="peer-panel" aria-label={locale === "ko" ? "기업 인사이트" : "Company insights"}>
          <button className="panel-close" onClick={() => setInsights(false)}>
            <img src="/assets/close.svg" alt="" />
            {t("close")}
          </button>
          <h2>{t("companyInsights")}</h2>
          <div className="context-chip">
            <img src="/assets/agent-context.svg" alt="" />
            {locale === "ko" ? "연결된 컨텍스트" : "Context attached"} · {detailState.data ? stockName(detailState.data) : stockCode}
          </div>
          <RemoteState {...peersState}>
          {(peerData) => <><div className="peer-intro">
            <h3>{locale === "ko" ? `${detailState.data ? stockName(detailState.data) : peerData.stockNameEn}: 글로벌 피어 3가지 비교` : peerData.headline}</h3>
            <p>{locale === "ko" ? "전체 사업과 핵심 분야 두 가지를 검증된 글로벌 상장사와 비교합니다. 유사도는 사업 이해를 위한 참고 지표이며 가치평가나 성과 예측이 아닙니다." : peerData.summary}</p>
            <div>
              <span>AI</span>
              <span>{locale === "ko" ? confidenceLevelKo(peerData.confidenceLevel) : peerData.confidenceLevel}</span>
              <span>{Math.round(peerData.confidenceScore * 100)}% {locale === "ko" ? "신뢰도" : "confidence"}</span>
            </div>
          </div>
          <div className="peer-cards">
            {peerData.comparisons.map((comparison) => (
              <article key={comparison.dimension}>
                <span>{locale === "ko" ? peerDimensionKo(comparison.dimension) : comparison.dimension.replaceAll("_", " ")}</span>
                <div className="peer-company">
                  <img src={comparison.peer.logoUrl} alt={`${comparison.peer.companyName} ${locale === "ko" ? "로고" : "logo"}`} onError={(event) => { event.currentTarget.hidden = true; }} />
                  <h3>{comparison.peer.companyName}</h3>
                </div>
                <p>{locale === "ko" ? peerDescriptionKo(comparison.dimension, comparison.peer.companyName, comparison.peer.industry) : comparison.description}</p>
              </article>
            ))}
          </div>
          <p className="peer-note">
            {locale === "ko" ? `${peerData.financialDataAsOf} 기준 재무 데이터입니다. 가치평가나 투자 권유가 아닌 비교 참고 정보입니다.` : `Financial data as of ${peerData.financialDataAsOf}. A reference point for orientation, not a valuation claim.`}
          </p>
          </>}
          </RemoteState>
        </aside>
      )}

      {alert && (
        <div className="modal-backdrop" role="presentation">
          <div
            className={`alert-modal ${alert === "price-limit" ? "is-price-limit" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-title"
          >
            <img
              src={
                alert === "price-limit"
                  ? "/assets/price-limit-warning.svg"
                  : "/assets/warning.svg"
              }
              alt=""
            />
            {alert === "price-limit" ? (
              <>
                <h2 id="alert-title">{locale === "ko" ? "일일 가격제한폭 도달" : "Daily Price Limit Reached"}</h2>
                <p>
                  {locale === "ko" ? "이 종목이 일일 가격제한폭에 도달했습니다." : "This stock has reached the daily price limit."}
                  <br />
                  {locale === "ko" ? "가격제한폭에 쌓인 대기 주문으로 체결이 지연될 수 있습니다." : "Orders may be delayed due to pending orders at the limit price."}
                </p>
              </>
            ) : (
              <>
                <h2 id="alert-title">{locale === "ko" ? "변동성 완화장치 발동" : "Volatility Interruption Triggered"}</h2>
                <p>
                  {locale === "ko" ? "이 종목에 VI가 발동했습니다." : "A VI has been triggered for this stock."}
                  <br />
                  {locale === "ko" ? "연속 매매가 중단되고 주문은 2분간 단일가 방식으로 처리됩니다." : <>Continuous matching is suspended and orders will be processed
                  <br />
                  through a two-minute single-price call auction.</>}
                </p>
                <strong>{locale === "ko" ? "주문 전 실시간 매매 상태를 확인하세요." : "Check the live trading status before placing an order."}</strong>
              </>
            )}
            <button type="button" onClick={() => setAlert(null)}>
              {locale === "ko" ? "확인" : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function peerDimensionKo(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("overall") || normalized.includes("business")) return "전체 사업";
  if (normalized.includes("semiconductor")) return "반도체";
  if (normalized.includes("consumer")) return "소비자 전자";
  if (normalized.includes("memory")) return "메모리";
  return value;
}

function peerDescriptionKo(dimension: string, companyName: string, industry: string) {
  return `${peerDimensionKo(dimension)} 관점의 비교 기업은 ${companyName}입니다. ${peerIndustryKo(industry)} 분야의 글로벌 피어이며, 일대일 가치평가가 아닌 사업 이해용 비교입니다.`;
}

function peerIndustryKo(value: string) {
  return ({ Semiconductors: "반도체", "Consumer Electronics": "소비자 전자", Banking: "은행", Insurance: "보험", Automotive: "자동차" } as Record<string, string>)[value] || value || "유사 사업";
}

function confidenceLevelKo(value: string) {
  return ({ HIGH: "높음", MEDIUM: "보통", LOW: "낮음" } as Record<string, string>)[value] || value;
}

function localizedMarketStatus(value: string | null | undefined, locale: "en" | "ko") {
  if (!value) return locale === "ko" ? "불러오는 중" : "Loading";
  if (locale === "en") return value;
  return ({ OPEN: "장중", REGULAR: "장중", CLOSED: "장 마감", PRE_MARKET: "장 시작 전", AFTER_HOURS: "장 마감 후", HALTED: "거래 정지" } as Record<string, string>)[value] || value;
}

function percentage(value: number | null | undefined, locale: "en" | "ko") {
  return value === null || value === undefined ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${value.toFixed(2)}%`;
}

function signedNumber(value: number | null | undefined, locale: "en" | "ko" = "en") {
  if (value === null || value === undefined) return locale === "ko" ? "정보 없음" : "Unavailable";
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatStockPrice(stock: StockDetail | null, locale: "en" | "ko", primary: boolean) {
  const useUsd = primary ? locale === "en" : locale === "ko";
  const value = useUsd ? stock?.currentPriceUsd : stock?.quote.currentPriceKrw;
  if (value === null || value === undefined) return locale === "ko" ? "정보 없음" : "Unavailable";
  return formatNumber(value, {
    style: "currency",
    currency: useUsd ? "USD" : "KRW",
    maximumFractionDigits: useUsd ? 2 : 0,
  });
}

function previousClose(stock: StockDetail | null) {
  const current = stock?.quote.currentPriceKrw;
  const change = stock?.quote.changeAmountKrw;
  return current === null || current === undefined || change === null || change === undefined
    ? null
    : current - change;
}

function predictionNote(stock: StockDetail | null, locale: "en" | "ko") {
  const maximum = stock?.foreignLimitPrediction.maxRate;
  const quantity = stock?.foreignOwnership.foreignLimitQuantity;
  const total = stock?.foreignOwnership.totalListedQuantity;
  if (maximum === null || maximum === undefined || !quantity || !total) {
    return locale === "ko" ? "이 종목은 검증된 예측치 또는 법정 한도 정보가 없습니다." : "A verified prediction or statutory limit is unavailable for this stock.";
  }
  const legalLimit = quantity / total * 100;
  if (maximum >= legalLimit) {
    return locale === "ko" ? `예상 최대치가 법정 한도 ${legalLimit.toFixed(2)}%에 도달하거나 초과합니다. 거래 전 주문 가능 여부를 확인하세요.` : `The estimated maximum reaches or exceeds the ${legalLimit.toFixed(2)}% statutory limit. Check order eligibility before trading.`;
  }
  return locale === "ko" ? `예상 최대치는 법정 한도 ${legalLimit.toFixed(2)}%보다 ${(legalLimit - maximum).toFixed(2)}%p 낮습니다.` : `The estimated maximum is ${(legalLimit - maximum).toFixed(2)} percentage points below the ${legalLimit.toFixed(2)}% statutory limit.`;
}

function PriceChart({ items, mode, label }: {
  items: DailyPrice[];
  mode: ChartMode;
  label: string;
}) {
  const prices = items.flatMap((item) => [item.lowPriceKrw, item.highPriceKrw]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const yFor = (price: number) => 250 - ((price - min) / range) * 220;
  const points = items.map((item, index) => {
    const x = items.length === 1 ? 0 : index / (items.length - 1) * 1000;
    const y = yFor(item.closePriceKrw);
    return `${x},${y}`;
  }).join(" ");
  return <svg className="live-stock-chart" role="img" aria-label={label} viewBox="0 0 1000 280" preserveAspectRatio="none">
    <title>{label}</title>
    {mode === "line"
      ? <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      : items.map((item, index) => {
        const x = items.length === 1 ? 500 : index / (items.length - 1) * 1000;
        const rising = item.closePriceKrw >= item.openPriceKrw;
        const bodyTop = Math.min(yFor(item.openPriceKrw), yFor(item.closePriceKrw));
        const bodyHeight = Math.max(Math.abs(yFor(item.openPriceKrw) - yFor(item.closePriceKrw)), 2);
        const width = Math.max(3, Math.min(18, 720 / Math.max(items.length, 1)));
        return <g className={rising ? "candle-up" : "candle-down"} key={item.tradingDate}>
          <line x1={x} x2={x} y1={yFor(item.highPriceKrw)} y2={yFor(item.lowPriceKrw)} vectorEffect="non-scaling-stroke" />
          <rect x={x - width / 2} y={bodyTop} width={width} height={bodyHeight} />
        </g>;
      })}
    <text x="0" y="275">{items[0]?.tradingDate}</text>
    <text x="1000" y="275" textAnchor="end">{items.at(-1)?.tradingDate}</text>
  </svg>;
}

async function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await element.requestFullscreen();
}
