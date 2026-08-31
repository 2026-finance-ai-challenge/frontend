import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { StockNewsFeed } from "../components/StockNewsFeed";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { StockDisclosureFeed } from "./DisclosurePage";
import { api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { GlobalPeer, StockDetail } from "../types";

type StockAlert = "vi" | "price-limit";

function periodToLimit(period: string) {
  return ({ "1D": 2, "1W": 7, "1M": 31, "3M": 93, "1Y": 366 } as Record<string, number>)[period] ?? 31;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function StockPage() {
  const [params] = useSearchParams();
  const { stockCode = "005930" } = useParams();
  const profile = useProfile();
  const [period, setPeriod] = useState(params.get("period") || "1M");
  const detailState = useRemote((signal) => api<StockDetail>(`/api/v1/market/stocks/${stockCode}`, { signal }), [stockCode, profile]);
  const historyState = useRemote((signal) => api<{ status: string; items: Array<{ tradingDate: string; closePriceKrw: number }> }>(`/api/v1/market/stocks/${stockCode}/history?limit=${periodToLimit(period)}`, { signal }), [stockCode, period]);
  const peersState = useRemote((signal) => api<GlobalPeer>(`/api/v1/market/stocks/${stockCode}/global-peers`, { signal }), [stockCode]);
  const [insights, setInsights] = useState(true);
  const [alert, setAlert] = useState<StockAlert | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const initialTab = params.get("tab");
  const [activeTab, setActiveTab] = useState<
    "chart" | "news" | "disclosure"
  >(
    initialTab === "news" || initialTab === "disclosure"
      ? initialTab
      : "chart",
  );
  const isAlertSnapshot = alert !== null;
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
    if (alert !== "vi") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [alert]);

  const openAlert = (nextAlert: StockAlert) => {
    if (nextAlert === "vi") setRemainingSeconds(120);
    setAlert(nextAlert);
  };

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
                <h1>
                  {detailState.data?.nameEn || detailState.data?.nameKo || "Loading stock…"}{" "}
                  <WatchlistHeart
                    className="heart-button"
                    itemId={stockCode}
                    itemName={detailState.data?.nameEn || detailState.data?.nameKo || stockCode}
                  />
                </h1>
                <p>{stockCode}&nbsp;&nbsp; · &nbsp;&nbsp;{detailState.data?.market || "—"}</p>
                <p>
                  {detailState.data?.quote.status || "Loading"} · {formatDate(detailState.data?.quote.asOf)} · Converted at {formatNumber(detailState.data?.exchangeRate.krwPerUnit)} KRW/USD
                </p>
              </div>
              <div className="stock-price">
                <strong>{formatNumber(detailState.data?.quote.currentPriceKrw, { style: "currency", currency: "KRW", maximumFractionDigits: 0 })}</strong>
                <span>
                  {formatNumber(detailState.data?.quote.changeAmountKrw)} <img src="/assets/price-down.svg" alt="" /> {detailState.data?.quote.changeRate === null || detailState.data?.quote.changeRate === undefined ? "Unavailable" : `${detailState.data.quote.changeRate.toFixed(2)}%`}
                </span>
              </div>
            </div>
            <div className="stock-metrics">
              {[
                ["High", formatNumber(detailState.data?.quote.highPriceKrw)],
                ["Low", formatNumber(detailState.data?.quote.lowPriceKrw)],
                ["Volume", formatNumber(detailState.data?.quote.volume, { notation: "compact" })],
                ["Open", formatNumber(detailState.data?.quote.openPriceKrw)],
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
              <button
                className="stock-danger"
                onClick={() => openAlert("price-limit")}
              >
                <img src="/assets/status-warning.svg" alt="" />
                {detailState.data.foreignOwnership.limitExhaustionRate === null ? "Foreign limit unavailable" : `${detailState.data.foreignOwnership.limitExhaustionRate.toFixed(1)}% foreign limit used`}
              </button>) : null}
              {detailState.data?.quote.viActive || detailState.data?.quote.singlePriceTrading ? (
              <button onClick={() => openAlert("vi")}>
                {!isAlertSnapshot && <img src="/assets/timer.svg" alt="" />}
                {isAlertSnapshot
                  ? "VI Triggered single price auction"
                  : "VI Triggered (01:43)"}
              </button>) : null}
              {isAlertSnapshot && (
                <span className="stock-resume">Resumes 15:34 KST</span>
              )}
            </div>
            <button
              className="insight-banner"
              onClick={() => setInsights(true)}
            >
              <img src="/assets/info.svg" alt="" />
              <span>
                <strong>Quick check company insight!</strong>
                <small>
                  See which global companies this business most closely
                  resembles.
                </small>
              </span>
              <em>
                View insights{" "}
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
              Chart
            </button>
            <button
              type="button"
              className={activeTab === "news" ? "active" : ""}
              onClick={() => setActiveTab("news")}
            >
              News
            </button>
            <button
              type="button"
              className={activeTab === "disclosure" ? "active" : ""}
              onClick={() => setActiveTab("disclosure")}
            >
              Disclosure
            </button>
          </div>
          {activeTab === "news" ? (
            <StockNewsFeed />
          ) : activeTab === "disclosure" ? (
            <StockDisclosureFeed />
          ) : (
            <div className="chart-layout">
              <section className="chart-card">
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
                    <img
                      src="/assets/chart-candles.svg"
                      alt="Candlestick chart"
                    />
                    <img src="/assets/chart-line.svg" alt="Line chart" />
                    <img src="/assets/chart-expand.svg" alt="Expand chart" />
                  </div>
                </div>
                <RemoteState {...historyState} empty={(value) => !value.items.length}>
                  {(value) => <PriceChart items={value.items} label={`${detailState.data?.nameEn || stockCode} ${period} price chart`} />}
                </RemoteState>
              </section>
              <aside className="ownership-panel">
                <h2>Foreign ownership</h2>
                <p>ML prediction &amp; statutory limit</p>
                <div className="ownership-line">
                  <span />
                </div>
                <div className="ownership-values">
                  <div>
                    <span>Previous ownership</span>
                    <strong>{detailState.data?.foreignOwnership.ownershipRate === null || detailState.data?.foreignOwnership.ownershipRate === undefined ? "Unavailable" : `${detailState.data.foreignOwnership.ownershipRate.toFixed(2)}%`}</strong>
                  </div>
                  <div>
                    <span>Legal limit</span>
                    <strong>{detailState.data?.foreignOwnership.foreignLimitQuantity && detailState.data?.foreignOwnership.totalListedQuantity ? `${(detailState.data.foreignOwnership.foreignLimitQuantity / detailState.data.foreignOwnership.totalListedQuantity * 100).toFixed(2)}%` : "Not applicable"}</strong>
                  </div>
                </div>
                <div className="prediction">
                  <div>
                    <b>Today’s current prediction</b>
                    <span>95% CI</span>
                  </div>
                  <div>
                    <span>
                      Min<small>{percentage(detailState.data?.foreignLimitPrediction.minRate)}</small>
                    </span>
                    <span>
                      Base<small>{percentage(detailState.data?.foreignLimitPrediction.baseRate)}</small>
                    </span>
                    <span>
                      Max<small>{percentage(detailState.data?.foreignLimitPrediction.maxRate)}</small>
                    </span>
                  </div>
                </div>
                <p className="prediction-note">
                  The estimated maximum stays well below the cap, so foreign
                  buy orders should execute normally today.
                </p>
              </aside>
            </div>
          )}
        </main>
      </div>

      {insights && (
        <aside className="peer-panel" aria-label="Company insights">
          <button className="panel-close" onClick={() => setInsights(false)}>
            <img src="/assets/close.svg" alt="" />
            Close
          </button>
          <h2>Company insights</h2>
          <div className="context-chip">
            <img src="/assets/agent-context.svg" alt="" />
            Context attached · {detailState.data?.nameEn || detailState.data?.nameKo || stockCode}
          </div>
          <RemoteState {...peersState}>
          {(peerData) => <><div className="peer-intro">
            <h3>
              {peerData.stockNameEn} maps closest
              <br />
              to {peerData.primaryPeer.companyName}
            </h3>
            <p>{peerData.summary}</p>
            <div>
              <span>AI</span>
              <span>{peerData.confidenceLevel}</span>
              <span>{Math.round(peerData.confidenceScore * 100)}% confidence</span>
            </div>
          </div>
          <div className="peer-cards">
            {peerData.comparisons.map((comparison) => (
              <article key={comparison.dimension}>
                <span>{comparison.dimension}</span>
                <h3>{comparison.peer.companyName}</h3>
                <p>{comparison.description}</p>
              </article>
            ))}
          </div>
          <p className="peer-note">
            {peerData.source} · Financial data as of {peerData.financialDataAsOf}. A reference point for orientation, not a valuation claim.
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
                <h2 id="alert-title">Daily Price Limit Reached</h2>
                <p>
                  This stock has reached the daily price limit.
                  <br />
                  Orders may be delayed due to pending orders at the limit
                  price.
                </p>
              </>
            ) : (
              <>
                <h2 id="alert-title">Volatility Interruption Triggered</h2>
                <p>
                  A VI has been triggered for this stock.
                  <br />
                  Continuous matching is suspended and orders will be processed
                  <br />
                  through a two-minute single-price call auction.
                </p>
                <strong>
                  <img src="/assets/timer.svg" alt="" />
                  {formatCountdown(remainingSeconds)} left
                </strong>
              </>
            )}
            <button type="button" onClick={() => setAlert(null)}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function percentage(value: number | null | undefined) {
  return value === null || value === undefined ? "Unavailable" : `${value.toFixed(2)}%`;
}

function PriceChart({ items, label }: {
  items: Array<{ tradingDate: string; closePriceKrw: number }>;
  label: string;
}) {
  const prices = items.map((item) => item.closePriceKrw);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const points = items.map((item, index) => {
    const x = items.length === 1 ? 0 : index / (items.length - 1) * 1000;
    const y = 250 - ((item.closePriceKrw - min) / range) * 220;
    return `${x},${y}`;
  }).join(" ");
  return <svg className="live-stock-chart" role="img" aria-label={label} viewBox="0 0 1000 280" preserveAspectRatio="none">
    <title>{label}</title>
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    <text x="0" y="275">{items[0]?.tradingDate}</text>
    <text x="1000" y="275" textAnchor="end">{items.at(-1)?.tradingDate}</text>
  </svg>;
}
