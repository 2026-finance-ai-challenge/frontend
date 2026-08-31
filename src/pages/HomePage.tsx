import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Footer, Header, MarketBar } from "../components/Layout";
import { TaxEligibilityPanel } from "../components/TaxEligibilityPanel";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock, StockDetail } from "../types";

const quickActions = [
  ["/assets/news.svg", "Today’s news", "/news"],
  ["/assets/filing.svg", "Dart filings", "/disclosures"],
  ["/assets/ownership.svg", "Foreigner ownership limits", "#foreign"],
  ["/assets/tax.svg", "Check my tax rate", "/tax"],
];

type ForeignMonitor = {
  stock: Stock;
  policy: { warningThreshold: number };
  warning: boolean;
  prediction: StockDetail["foreignLimitPrediction"];
};
type TaxEligibility = { countryCode: string; countryName: string; domesticDefaultRate: number; treatyDividendRate: number | null; treatyDataAvailable: boolean };

const ownershipLabels = {
  danger: "Near reached",
  warning: "Near cap",
  safe: "Open",
};

export function HomePage() {
  const [taxAgentOpen, setTaxAgentOpen] = useState(false);
  const [ownershipStart, setOwnershipStart] = useState(0);
  const [newsStart, setNewsStart] = useState(0);
  const newsState = useCursorPage(
    (cursor, signal) => api<{ items: NewsArticle[]; nextCursor: string | null }>(`/api/v1/news${queryString({ sort: "IMPORTANCE", cursor, limit: 20 })}`, { signal }),
    [],
    (item) => item.id,
  );
  const filingsState = useCursorPage(
    (cursor, signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ cursor, limit: cursor ? 20 : 4 })}`, { signal }),
    [],
    (item) => item.receiptNumber,
  );
  const ownershipState = useRemote(
    (signal) => api<ForeignMonitor[]>("/api/v1/market/foreign-limits", { signal }),
    [],
  );
  const taxRatesState = useRemote(async (signal) => Promise.all(["US", "JP", "GB", "SG", "CN"].map((residencyCountry) => api<TaxEligibility>("/api/v1/tax/eligibility", { method: "POST", signal, body: JSON.stringify({ residencyCountry, investorType: "INDIVIDUAL" }) }))), []);
  const eligibilityButtonRef = useRef<HTMLButtonElement>(null);
  const closeTaxAgent = () => {
    setTaxAgentOpen(false);
    window.requestAnimationFrame(() => eligibilityButtonRef.current?.focus());
  };
  const ownershipItems = ownershipState.data ?? [];
  const newsItems = newsState.data?.items ?? [];
  const visibleNews = newsItems.slice(newsStart, newsStart + 2);
  const visibleOwnership = ownershipItems.length
    ? Array.from({ length: Math.min(4, ownershipItems.length) }, (_, index) =>
        ownershipItems[(index + ownershipStart) % ownershipItems.length],
      )
    : [];
  const filingGroups = useMemo(() => {
    const groups = new Map<string, Filing[]>();
    for (const filing of filingsState.data?.items ?? []) {
      const day = filing.filedDate;
      groups.set(day, [...(groups.get(day) ?? []), filing]);
    }
    return [...groups.entries()];
  }, [filingsState.data]);

  return (
    <div className={`app-page home-page ${taxAgentOpen ? "agent-open" : ""}`}>
      <div className="hero-surface">
        <Header />
        <MarketBar />
        <main className="page-shell hero-content">
          <h1>
            Korea <u>analysis</u>,<br />
            regulation{" "}
            <sup>
              <img src="/assets/hero-marker.svg" alt="KART" />
            </sup>
            <br />
            &amp; trading <u>Intelligence</u>
          </h1>
          <div className="quick-actions">
            {quickActions.map(([icon, label, to]) => (
              <Link to={to} key={label}>
                <img src={icon} alt="" />
                {label}
              </Link>
            ))}
          </div>
        </main>
      </div>

      <main className="page-shell home-content">
        <section className="section-block news-section" id="news">
          <div className="section-heading">
            <div>
              <h2>
                AI News Summary <span>· Real-time</span>
              </h2>
              <p>
                Hover a card to reveal the What / Why / Impact summary.
                <br />
                Use the arrows to move through the feed one story at a time.
              </p>
            </div>
            <div className="slider-controls">
              <button type="button" aria-label="Previous story" disabled={newsStart === 0} onClick={() => setNewsStart((current) => Math.max(0, current - 1))}>
                <img src="/assets/carousel-prev.svg" alt="" />
              </button>
              <button type="button" aria-label="Next story" disabled={newsStart + 2 >= newsItems.length} onClick={() => setNewsStart((current) => current + 1)}>
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...newsState} empty={(value) => !value.items.length}>
            {(value) => <div className="news-grid">
              {visibleNews.map((article) => <HomeNewsCard article={article} key={article.id} />)}
            </div>}
          </RemoteState>
          <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
        </section>

        <section className="section-block filing-section">
          <div className="section-heading">
            <div>
              <h2>DART filings pulse</h2>
              <p>
                One filing per row, newest first submission date and time
                <br />
                on the left, company and title on the right.
              </p>
            </div>
          </div>
          <div className="filing-table">
            <RemoteState {...filingsState} empty={(value) => !value.items.length}>
              {() => <>{filingGroups.map(([day, items]) => <div key={day}>
                <div className="table-day"><span>{formatDate(day, false)}</span><span>{items.length} filings</span></div>
                {items.map((filing) => <FilingRow filing={filing} key={filing.receiptNumber} />)}
              </div>)}</>}
            </RemoteState>
            <ViewMoreButton resource="filings" hasMore={Boolean(filingsState.data?.nextCursor)} loading={filingsState.loadingMore} error={filingsState.loadMoreError} className="view-all" onClick={() => void filingsState.loadMore()} />
          </div>
        </section>

        <section className="section-block ownership-section" id="foreign">
          <div className="section-heading">
            <div>
              <h2>Foreign ownership limit gauge</h2>
              <p>
                The monitored Korean stocks below carry a statutory cap on
                foreign ownership.
                <br />
                Filter by status, then read how much headroom is left before
                orders start getting rejected.
              </p>
              <div className="status-copy">
                <span>
                  <b className="danger-text">{ownershipItems.filter((item) => item.warning && (item.stock.foreignOwnership?.limitExhaustionRate ?? 0) >= 100).length}</b> <u>At the cap</u>&nbsp; Buy
                  orders rejected right now.
                </span>
                <span>
                  <b className="warning-text">{ownershipItems.filter((item) => item.warning && (item.stock.foreignOwnership?.limitExhaustionRate ?? 0) < 100).length}</b> <u>Near the cap</u>&nbsp;
                  90% or more of the quota used.
                </span>
                <span>
                  <b className="safe-text">{ownershipItems.filter((item) => !item.warning).length}</b> <u>Open</u>&nbsp; Room to buy
                  without restriction.
                </span>
              </div>
            </div>
            <div className="slider-controls ownership-controls">
              <button
                type="button"
                aria-label="Previous ownership card"
                disabled={ownershipStart === 0 || ownershipItems.length === 0}
                onClick={() =>
                  setOwnershipStart((current) =>
                    current === 0 ? ownershipItems.length - 1 : current - 1,
                  )
                }
              >
                <img
                  className={ownershipStart === 0 ? "" : "is-reversed"}
                  src={
                    ownershipStart === 0
                      ? "/assets/carousel-prev.svg"
                      : "/assets/carousel-next.svg"
                  }
                  alt=""
                />
              </button>
              <button
                type="button"
                aria-label="Next ownership card"
                onClick={() =>
                  setOwnershipStart(
                    (current) => ownershipItems.length ? (current + 1) % ownershipItems.length : 0,
                  )
                }
              >
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...ownershipState} empty={(value) => !value.length}>
            {() => <div className="ownership-grid">
            {visibleOwnership.map((item) => {
              const used = item.stock.foreignOwnership?.ownershipRate ?? 0;
              const cap = item.stock.foreignOwnership?.foreignLimitQuantity && item.stock.foreignOwnership?.totalListedQuantity
                ? item.stock.foreignOwnership.foreignLimitQuantity / item.stock.foreignOwnership.totalListedQuantity * 100
                : 0;
              const tone = item.warning ? (used >= cap ? "danger" : "warning") : "safe";
              const remaining = cap ? Math.max(cap - used, 0) : null;
              const width = `${Math.min(item.stock.foreignOwnership?.limitExhaustionRate ?? 0, 100)}%`;

              return (
                <article
                  className="ownership-card"
                  key={item.stock.stockCode}
                  tabIndex={0}
                >
                  <div className="card-title">
                    <span className={tone}>
                      {tone === "danger" ? (
                        <img src="/assets/status-warning.svg" alt="" />
                      ) : null}
                      {ownershipLabels[tone]}
                    </span>
                    <div>
                      <h3>{item.stock.nameEn || item.stock.nameKo}</h3>
                      <p>{item.stock.stockCode} · {item.stock.sector || item.stock.market}</p>
                    </div>
                  </div>
                  <strong className={tone}>
                    {remaining === null ? "N/A" : remaining.toFixed(2)}
                    <small>% remaining</small>
                  </strong>
                  <div className={`gauge gauge-${tone}`}>
                    <span className={tone} style={{ width }} />
                    <i style={{ left: width }} />
                  </div>
                  <div className="gauge-labels">
                    <span>Used {used.toFixed(2)}%</span>
                    <span>Cap {cap ? cap.toFixed(2) : "Unavailable"}%</span>
                  </div>
                </article>
              );
            })}
          </div>}
          </RemoteState>
        </section>

        <section className="section-block tax-section">
          <div className="section-heading">
            <div>
              <h2>Dividend withholding tax</h2>
              <p>
                Compare Korea’s domestic default with the published treaty rate for your residence.
                <br />A reduced rate is conditional and must be confirmed before payment.
              </p>
            </div>
          </div>
          <div className="tax-grid">
            <article className="tax-card">
              <div className="tax-rates">
                <div>
                  <span>Default rate</span>
                  <strong>
                    {taxRatesState.data?.[0]?.domesticDefaultRate ?? "—"}<small>%</small>
                  </strong>
                  <small>20% national + 2% local surtax</small>
                </div>
                <b>›</b>
                <div>
                  <span>Treaty rate starts</span>
                  <strong className="safe-text">
                    {taxRatesState.data?.[0]?.treatyDividendRate ?? "—"}<small>%</small>
                  </strong>
                  <small>Portfolio dividends, most treaties</small>
                </div>
              </div>
              <p>
                The reduced rate is <b>not applied automatically.</b> Your
                broker must hold an Application for Reduced Tax Rate and a
                Certificate of Residence before the dividend payment date.
                Without a pre-filed application, a refund claim may still be
                possible within the statutory period.
              </p>
              <button
                className="primary-button eligibility-button"
                type="button"
                aria-expanded={taxAgentOpen}
                aria-controls="tax-eligibility-panel"
                onClick={() => setTaxAgentOpen(true)}
                ref={eligibilityButtonRef}
              >
                Check eligibility
                <img src="/assets/chevron-right-gold.svg" alt="" />
              </button>
            </article>
            <article className="treaty-card">
              <div className="treaty-head">
                <span>Country of residence</span>
                <span>Default</span>
                <span>Treaty</span>
                <span>Difference</span>
              </div>
              {taxRatesState.data?.map((rate) => {
                const difference = rate.treatyDividendRate === null ? null : rate.treatyDividendRate - rate.domesticDefaultRate;
                const row = [rate.countryName, `${rate.domesticDefaultRate}%`, rate.treatyDividendRate === null ? "Unavailable" : `${rate.treatyDividendRate}%`, difference === null ? "—" : `${difference.toFixed(1)}pp`];
                return <div key={rate.countryCode}>
                  {row.map((cell, i) => (
                    <span className={i === 3 ? "safe-text" : ""} key={cell}>
                      {cell}
                    </span>
                  ))}
                </div>;
              })}
              {taxRatesState.error ? <div className="api-state api-error">Treaty rate data unavailable.</div> : null}
            </article>
          </div>
          <p className="tax-note">
            Standard treaty rates for individual portfolio dividends. Your rate
            may differ—confirm with your broker. Not tax advice.
          </p>
        </section>
      </main>
      <Footer />
      {taxAgentOpen ? <TaxEligibilityPanel close={closeTaxAgent} /> : null}
    </div>
  );
}

function FilingRow({ filing }: { filing: Filing }) {
  return (
    <Link
      className="filing-row"
      to={`/disclosures/${filing.receiptNumber}`}
    >
      <img
        className="filing-timeline-dot"
        src="/assets/timeline-neutral.svg"
        alt=""
      />
      <span>{formatDate(filing.detectedAt)}</span>
      <span>
        <b>{filing.issuerNameEn || filing.issuerNameKo}</b>
        <small>{filing.stockCode} · {filing.market}</small>
      </span>
      <strong>{filing.titleEn || filing.titleKo}</strong>
      <em>{filing.type}</em>
      <span className={filing.indexStatus === "READY" ? "positive" : "medium"}>{filing.indexStatus}</span>
      <span className="neutral">{filing.correction ? "Correction" : filing.documentStatus}</span>
    </Link>
  );
}

function HomeNewsCard({ article }: { article: NewsArticle }) {
  const sentiment = (article.sentiment || "Neutral").toLowerCase();
  return <Link className="news-card" to={`/news/${article.id}`}>
    <div className="tags">
      <span className={sentiment === "negative" ? "negative" : sentiment === "positive" ? "positive" : ""}>
        <img src={sentiment === "negative" ? "/assets/trend-down.svg" : sentiment === "positive" ? "/assets/trend-up.svg" : "/assets/trend-neutral.svg"} alt="" />
        {article.sentiment || "Analysis pending"}
      </span>
      <span className={article.importance === "HIGH" || article.importance === "CRITICAL" ? "priority" : "medium"}>{article.importance ? `${article.importance} priority` : "Pending"}</span>
      {article.eventType ? <span>{article.eventType}</span> : null}
    </div>
    <h3>{article.englishTitle || article.originalTitle}</h3>
    <p className="meta">{formatDate(article.publishedAt)} · {article.publisher}</p>
    <NewsThumbnail src={article.thumbnailUrl} />
    <div className="insight">
      <p><b>What</b>{article.what || "Grounded insight is unavailable."}</p>
      <p><b>Why</b>{article.why || "Grounded insight is unavailable."}</p>
      <p><b>Impact</b>{article.impact || "Grounded insight is unavailable."}</p>
    </div>
  </Link>;
}
