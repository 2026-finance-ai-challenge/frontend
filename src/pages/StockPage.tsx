import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { StockNewsFeed } from "../components/StockNewsFeed";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { StockDisclosureFeed } from "./DisclosurePage";
import { REALTIME_API_BASE, api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { GlobalPeer, StockDetail } from "../types";
import { useLocale } from "../state/LocaleContext";

type StockAlert = "vi" | "price-limit";
type ChartMode = "candles" | "line";
type ChartBar = {
  timestamp: string;
  openPriceKrw: number;
  highPriceKrw: number;
  lowPriceKrw: number;
  closePriceKrw: number;
  volume: number;
};

type RealtimeMarketEvent = {
  type: string;
  stockCode: string | null;
  currentValue: number;
  changeAmount: number;
  changeRate: number;
  openValue: number;
  highValue: number;
  lowValue: number;
  volume: number;
  executionVolume: number;
  asOf: string;
  status: string;
  source: string;
};

export function StockPage() {
  const { locale, t, stockName } = useLocale();
  const [params] = useSearchParams();
  const { stockCode = "" } = useParams();
  const profile = useProfile();
  const [period, setPeriod] = useState(params.get("period") || "1D");
  const detailState = useRemote((signal) => api<StockDetail>(`/api/v1/market/stocks/${stockCode}`, { signal }), [stockCode, profile]);
  const historyState = useRemote((signal) => api<{ status: string; intervalMinutes: number; items: ChartBar[] }>(`/api/v1/market/stocks/${stockCode}/chart?period=${period}`, { signal }), [stockCode, period]);
  const peersState = useRemote((signal) => api<GlobalPeer>(`/api/v1/market/stocks/${stockCode}/global-peers`, { signal }), [stockCode]);
  const [insights, setInsights] = useState(params.get("insights") === "1");
  const [alert, setAlert] = useState<StockAlert | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const [liveQuote, setLiveQuote] = useState<RealtimeMarketEvent | null>(null);
  const [chartItems, setChartItems] = useState<ChartBar[]>([]);
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
  useEffect(() => {
    setLiveQuote(null);
    const source = new EventSource(`${REALTIME_API_BASE}/api/v1/market/stream?stockCode=${encodeURIComponent(stockCode)}`);
    const onMarket = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as RealtimeMarketEvent;
        if (event.type === "STOCK" && event.stockCode === stockCode) setLiveQuote(event);
      } catch {
        // 손상된 단일 이벤트는 다음 정상 틱 수신을 막지 않는다.
      }
    };
    source.addEventListener("market", onMarket as EventListener);
    return () => source.close();
  }, [stockCode]);
  useEffect(() => {
    setChartItems(mergeLiveBar(historyState.data?.items ?? [], liveQuote, period));
  }, [historyState.data?.items, period, stockCode]);
  useEffect(() => {
    if (!liveQuote) return;
    setChartItems((current) => mergeLiveBar(current.length ? current : historyState.data?.items ?? [], liveQuote, period));
  }, [liveQuote, period]);
  const quoteChangeRate = liveQuote?.changeRate ?? detailState.data?.quote.changeRate;
  const currentPriceKrw = liveQuote?.currentValue ?? detailState.data?.quote.currentPriceKrw;
  const changeAmountKrw = liveQuote?.changeAmount ?? detailState.data?.quote.changeAmountKrw;
  const previousCloseKrw = currentPriceKrw === null || currentPriceKrw === undefined || changeAmountKrw === null || changeAmountKrw === undefined
    ? null
    : currentPriceKrw - changeAmountKrw;
  const quoteStatus = liveQuote?.status ?? detailState.data?.quote.status;
  const quoteAsOf = liveQuote?.asOf ?? detailState.data?.quote.asOf;
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
                  {localizedMarketStatus(quoteStatus, locale)} · {formatDate(quoteAsOf)} · {locale === "ko" ? `환율 ${formatNumber(detailState.data?.exchangeRate.krwPerUnit)}원/USD` : `Converted at ${formatNumber(detailState.data?.exchangeRate.krwPerUnit)} KRW/USD`}
                </p>
              </div>
              <div className="stock-price">
                <strong>{formatLocalizedStockPrice(currentPriceKrw, detailState.data?.exchangeRate.krwPerUnit, locale, true)}</strong>
                <small className="stock-price-secondary">{formatLocalizedStockPrice(currentPriceKrw, detailState.data?.exchangeRate.krwPerUnit, locale, false)}</small>
                <span className={quoteChangeRate == null ? "" : quoteChangeRate >= 0 ? "is-positive" : ""}>
                  {formatQuoteChange(changeAmountKrw, detailState.data?.exchangeRate.krwPerUnit, locale)} {quoteChangeRate == null ? null : <img src={quoteChangeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />} {quoteChangeRate == null ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${quoteChangeRate >= 0 ? "+" : ""}${quoteChangeRate.toFixed(2)}%`}
                </span>
              </div>
            </div>
            <div className="stock-metrics">
              {[
                { label: locale === "ko" ? "고가" : "High", value: liveQuote?.highValue ?? detailState.data?.quote.highPriceKrw, price: true },
                { label: locale === "ko" ? "저가" : "Low", value: liveQuote?.lowValue ?? detailState.data?.quote.lowPriceKrw, price: true },
                { label: locale === "ko" ? "거래량" : "Volume", value: liveQuote?.volume ?? detailState.data?.quote.volume, price: false },
                { label: locale === "ko" ? "전일 종가" : "Prev close", value: previousCloseKrw, price: true },
              ].map(({ label, value, price }) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{price
                    ? formatLocalizedStockPrice(value, detailState.data?.exchangeRate.krwPerUnit, locale, true)
                    : formatNumber(value, { notation: "compact" })}</strong>
                  <small>{price
                    ? formatLocalizedStockPrice(value, detailState.data?.exchangeRate.krwPerUnit, locale, false)
                    : value === null || value === undefined
                      ? (locale === "ko" ? "정보 없음" : "Unavailable")
                      : `${formatNumber(value)} ${locale === "ko" ? "주" : "shares"}`}</small>
                </div>
              ))}
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
                <RemoteState {...historyState} empty={() => !chartItems.length}>
                  {() => <PriceChart items={chartItems} mode={chartMode} period={period} locale={locale} label={`${detailState.data?.nameEn || stockCode} ${period} ${chartMode} price chart`} />}
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

function formatQuoteChange(krw: number | null | undefined, exchangeRate: number | null | undefined, locale: "en" | "ko") {
  if (krw === null || krw === undefined) return locale === "ko" ? "정보 없음" : "Unavailable";
  const value = locale === "en" && exchangeRate ? krw / exchangeRate : krw;
  return `${value >= 0 ? "+" : ""}${formatNumber(value, {
    style: "currency",
    currency: locale === "en" ? "USD" : "KRW",
    maximumFractionDigits: locale === "en" ? 2 : 0,
  })}`;
}

function formatLocalizedStockPrice(currentPriceKrw: number | null | undefined, exchangeRate: number | null | undefined, locale: "en" | "ko", primary: boolean) {
  const useUsd = primary ? locale === "en" : locale === "ko";
  if (currentPriceKrw === null || currentPriceKrw === undefined) return locale === "ko" ? "정보 없음" : "Unavailable";
  const value = useUsd && exchangeRate ? currentPriceKrw / exchangeRate : currentPriceKrw;
  if (value === null || value === undefined) return locale === "ko" ? "정보 없음" : "Unavailable";
  return formatNumber(value, {
    style: "currency",
    currency: useUsd ? "USD" : "KRW",
    maximumFractionDigits: useUsd ? 2 : 0,
  });
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

function mergeLiveBar(items: ChartBar[], event: RealtimeMarketEvent | null, period: string): ChartBar[] {
  if (!event) return items;
  const instant = new Date(event.asOf);
  const koreaOffset = 9 * 60 * 60 * 1000;
  const koreaClock = new Date(instant.getTime() + koreaOffset);
  if (period === "1D") koreaClock.setUTCMinutes(Math.floor(koreaClock.getUTCMinutes() / 10) * 10, 0, 0);
  else if (period === "1W") koreaClock.setUTCMinutes(0, 0, 0);
  else koreaClock.setUTCHours(15, 30, 0, 0);
  const bucket = new Date(koreaClock.getTime() - koreaOffset).toISOString();
  const sameBucket = (item: ChartBar) => period === "1D" || period === "1W"
    ? item.timestamp === bucket
    : item.timestamp.slice(0, 10) === bucket.slice(0, 10);
  const existingIndex = items.findIndex(sameBucket);
  const current = event.currentValue;
  const next: ChartBar = existingIndex >= 0 ? {
    ...items[existingIndex],
    highPriceKrw: Math.max(items[existingIndex].highPriceKrw, current),
    lowPriceKrw: Math.min(items[existingIndex].lowPriceKrw, current),
    closePriceKrw: current,
    volume: period === "1D" || period === "1W"
      ? items[existingIndex].volume + event.executionVolume
      : event.volume,
  } : {
    timestamp: bucket,
    openPriceKrw: current,
    highPriceKrw: current,
    lowPriceKrw: current,
    closePriceKrw: current,
    volume: period === "1D" || period === "1W" ? event.executionVolume : event.volume,
  };
  if (existingIndex < 0) return [...items, next].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return items.map((item, index) => index === existingIndex ? next : item);
}

function PriceChart({ items, mode, period, locale, label }: {
  items: ChartBar[];
  mode: ChartMode;
  period: string;
  locale: "en" | "ko";
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const prices = items.flatMap((item) => [item.lowPriceKrw, item.highPriceKrw]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const maxVolume = Math.max(...items.map((item) => item.volume), 1);
  const yFor = (price: number) => 238 - ((price - min) / range) * 210;
  const [domainStart, domainEnd] = chartTimeDomain(items, period);
  const xForTimestamp = (timestamp: string) => Math.min(1000, Math.max(0,
    (new Date(timestamp).getTime() - domainStart) / Math.max(domainEnd - domainStart, 1) * 1000,
  ));
  const xFor = (index: number) => xForTimestamp(items[index].timestamp);
  const points = items.map((item, index) => {
    const x = xFor(index);
    const y = yFor(item.closePriceKrw);
    return `${x},${y}`;
  }).join(" ");
  const positive = items.at(-1)!.closePriceKrw >= items[0]!.openPriceKrw;
  const axisLabels = chartAxisLabels(items, period, domainStart, domainEnd);
  const hoveredItem = hovered === null ? null : items[hovered];
  return <div className={`stock-chart-wrap ${positive ? "is-positive" : "is-negative"}`} onPointerLeave={() => setHovered(null)}>
    {hoveredItem ? <div className="stock-chart-tooltip" style={{ left: `${Math.min(82, Math.max(2, xFor(hovered!) / 10))}%` }}>
      <b>{formatChartDate(hoveredItem.timestamp, period, locale, true)}</b>
      <span>O {formatNumber(hoveredItem.openPriceKrw)} · H {formatNumber(hoveredItem.highPriceKrw)}</span>
      <span>L {formatNumber(hoveredItem.lowPriceKrw)} · C {formatNumber(hoveredItem.closePriceKrw)}</span>
      <span>{locale === "ko" ? "거래량" : "Volume"} {formatNumber(hoveredItem.volume, { notation: "compact" })}</span>
    </div> : null}
    <svg className="live-stock-chart" role="img" aria-label={label} viewBox="0 0 1000 360" preserveAspectRatio="none">
      <title>{label}</title>
      {[0, 1, 2, 3].map((line) => <line className="chart-grid-line" x1="0" x2="1000" y1={28 + line * 70} y2={28 + line * 70} key={line} />)}
      {mode === "line"
        ? <polyline className="period-line" points={points} fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        : items.map((item, index) => {
          const x = xFor(index);
          const rising = item.closePriceKrw >= item.openPriceKrw;
          const bodyTop = Math.min(yFor(item.openPriceKrw), yFor(item.closePriceKrw));
          const bodyHeight = Math.max(Math.abs(yFor(item.openPriceKrw) - yFor(item.closePriceKrw)), 2);
          const width = Math.max(3, Math.min(18, 720 / Math.max(items.length, 1)));
          return <g className={rising ? "candle-up" : "candle-down"} key={item.timestamp}>
            <line x1={x} x2={x} y1={yFor(item.highPriceKrw)} y2={yFor(item.lowPriceKrw)} vectorEffect="non-scaling-stroke" />
            <rect x={x - width / 2} y={bodyTop} width={width} height={bodyHeight} />
          </g>;
        })}
      {items.map((item, index) => {
        const x = xFor(index);
        const barWidth = Math.max(2, Math.min(16, 650 / items.length));
        const height = item.volume / maxVolume * 62;
        return <rect className="volume-bar" key={`volume-${item.timestamp}`} x={x - barWidth / 2} y={322 - height} width={barWidth} height={height} />;
      })}
      {axisLabels.map((axis) => {
        const x = xForTimestamp(axis.timestamp);
        return <text x={x} y="350" textAnchor={x < 1 ? "start" : x > 999 ? "end" : "middle"} key={`label-${axis.timestamp}`}>{formatChartDate(axis.timestamp, period, locale)}</text>;
      })}
      {items.map((item, index) => {
        const x = xFor(index);
        const previousX = index === 0 ? x : xFor(index - 1);
        const nextX = index === items.length - 1 ? x : xFor(index + 1);
        const left = index === 0 ? Math.max(0, x - Math.max(8, (nextX - x) / 2)) : (previousX + x) / 2;
        const right = index === items.length - 1 ? Math.min(1000, x + Math.max(8, (x - previousX) / 2)) : (x + nextX) / 2;
        return <rect className="chart-hit-zone" x={left} y="0" width={Math.max(1, right - left)} height="325" key={`hit-${item.timestamp}`} onPointerEnter={() => setHovered(index)} />;
      })}
    </svg>
  </div>;
}

function chartTimeDomain(items: ChartBar[], period: string): [number, number] {
  const timestamps = items.map((item) => new Date(item.timestamp).getTime());
  if (period !== "1D") {
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    return start === end ? [start - 30 * 60_000, end + 30 * 60_000] : [start, end];
  }
  const koreaClock = new Date(timestamps[0] + 9 * 60 * 60_000);
  const start = Date.UTC(koreaClock.getUTCFullYear(), koreaClock.getUTCMonth(), koreaClock.getUTCDate(), 0, 0);
  return [start, start + 6.5 * 60 * 60_000];
}

function chartAxisLabels(items: ChartBar[], period: string, domainStart: number, domainEnd: number) {
  if (period === "1D") {
    return [0, 1, 2, 3, 4, 5, 6, 6.5].map((hours) => ({
      timestamp: new Date(domainStart + hours * 60 * 60_000).toISOString(),
    }));
  }
  if (period === "1W") {
    const seen = new Set<string>();
    return items.map((item, index) => [item.timestamp.slice(0, 10), index] as const)
      .filter(([date]) => seen.has(date) ? false : (seen.add(date), true))
      .map(([, index]) => ({ timestamp: items[index].timestamp }));
  }
  const zones = period === "1Y" ? 6 : 5;
  if (items.length === 1) return [{ timestamp: items[0].timestamp }];
  return Array.from({ length: Math.min(zones, items.length) }, (_, index) => ({
    timestamp: new Date(domainStart + index * (domainEnd - domainStart) / Math.max(1, Math.min(zones, items.length) - 1)).toISOString(),
  }));
}

function formatChartDate(timestamp: string, period: string, locale: "en" | "ko", detailed = false) {
  const options: Intl.DateTimeFormatOptions = detailed
    ? { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }
    : period === "1D"
      ? { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }
      : period === "1Y"
        ? { timeZone: "Asia/Seoul", month: "short" }
        : { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", options).format(new Date(timestamp));
}

async function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await element.requestFullscreen();
}
