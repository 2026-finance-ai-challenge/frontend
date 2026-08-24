import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";

const metrics = [
  ["High", "123,000"],
  ["Low", "123,000"],
  ["Volume", "20.1M"],
  ["Prev close", "192.06"],
];
const alertMetrics = [
  ["High", "196.68"],
  ["Low", "186.12"],
  ["Volume", "20.1M"],
  ["Prev close", "192.06"],
];
const peers = [
  [
    "Overall business",
    "Intel",
    "Closest overall business reference diversified semi conductor manufacturing with in-house fabrication.",
  ],
  [
    "Semi-conductor",
    "TSMC",
    "Closest reference for the foundry and logic side of the business.",
  ],
  [
    "Consumer electronics",
    "Advanced Micro Devices",
    "Closest reference for the consumer device and computing segment.",
  ],
];

export function StockPage() {
  const [params] = useSearchParams();
  const [insights, setInsights] = useState(params.get("insights") === "1");
  const initialAlert = params.get("alert");
  const [alert, setAlert] = useState<"vi" | "price-limit" | null>(
    initialAlert === "price-limit"
      ? "price-limit"
      : initialAlert === "1" || initialAlert === "vi"
        ? "vi"
        : null,
  );
  const [period, setPeriod] = useState("1M");
  const isAlertSnapshot = alert !== null;

  return (
    <div className={`stock-page ${insights ? "panel-open" : ""}`}>
      <div className="stock-main">
        <div className="stock-hero">
          <Header />
          <div className="page-shell stock-summary">
            <BackLink to="/" />
            <div className="stock-title-row">
              <div>
                <h1>
                  Samsung Electronics{" "}
                  <button
                    className="heart-button"
                    aria-label="Remove from watchlist"
                  >
                    <img src="/assets/heart.svg" alt="" />
                  </button>
                </h1>
                <p>005930&nbsp;&nbsp; · &nbsp;&nbsp;KOSPI</p>
                <p>
                  Market closed · Aug 14, 15:30 KST · Converted at 1,318.40
                  KRW/USD
                </p>
              </div>
              <div className="stock-price">
                <strong>{isAlertSnapshot ? "$188.10" : "₩288,020"}</strong>
                <span>
                  -1,000 <img src="/assets/price-down.svg" alt="" /> -1.2%
                </span>
              </div>
            </div>
            <div className="stock-metrics">
              {(isAlertSnapshot ? alertMetrics : metrics).map(
                ([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ),
              )}
            </div>
            <div className="stock-badges">
              <button
                className="stock-danger"
                onClick={() => setAlert("price-limit")}
              >
                <img src="/assets/status-warning.svg" alt="" />
                Near reached
              </button>
              <button onClick={() => setAlert("vi")}>
                {!isAlertSnapshot && <img src="/assets/timer.svg" alt="" />}
                {isAlertSnapshot
                  ? "VI Triggered single price auction"
                  : "VI Triggered (01:43)"}
              </button>
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

        <main className="page-shell chart-content">
          <div className="stock-tabs">
            <button className="active">Chart</button>
            <button>News</button>
            <button>Disclosure</button>
          </div>
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
              <img
                src="/assets/stock-chart.png"
                alt={`Samsung Electronics ${period} price and foreign ownership chart`}
              />
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
                  <strong>20.61%</strong>
                </div>
                <div>
                  <span>Legal limit</span>
                  <strong>40.01%</strong>
                </div>
              </div>
              <div className="prediction">
                <div>
                  <b>Today’s current prediction</b>
                  <span>95% CI</span>
                </div>
                <div>
                  <span>
                    Min<small>20.64%</small>
                  </span>
                  <span>
                    Base<small>20.64%</small>
                  </span>
                  <span>
                    Max<small>20.64%</small>
                  </span>
                </div>
              </div>
              <p className="prediction-note">
                The estimated maximum stays well below the cap, so foreign buy
                orders should execute normally today.
              </p>
            </aside>
          </div>
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
            Context attached · Samsung Electronics
          </div>
          <div className="peer-intro">
            <h3>
              Samsung Electronics maps closest
              <br />
              to Intel
            </h3>
            <p>
              Matched with Intel as the closest US-listed reference peer for
              this Korean semiconductor business. Scale and financial data are
              used as secondary context; Intel is treated as a mega-cap market
              reference, not a one-for-one size match.
            </p>
            <div>
              <span>AI</span>
              <span>Consumer Electronics</span>
              <span>Semi-conductors</span>
            </div>
          </div>
          <div className="peer-cards">
            {peers.map(([category, name, copy]) => (
              <article key={name}>
                <span>{category}</span>
                <h3>{name}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <p className="peer-note">
            Peers are matched on sector, business mix and financial profile. A
            reference point for orientation, not a valuation claim.
          </p>
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
                  01:30 left
                </strong>
              </>
            )}
            <button onClick={() => setAlert(null)}>Cofirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
