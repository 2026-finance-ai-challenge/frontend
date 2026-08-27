import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { api, queryString } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock } from "../types";

const stocks = [
  {
    id: "samsung-electronics",
    name: "Samsung Electronics",
    description: "005930 · KOSPI",
  },
  { id: "samsung-sdi", name: "Samsung SDI", description: "005930 · KOSPI" },
  {
    id: "samsung-biologics",
    name: "Samsung Biologics",
    description: "005930 · KOSPI",
  },
  {
    id: "samsung-engineering",
    name: "Samsung Engineering",
    description: "005930 · KOSPI",
  },
];

const filingGroups = [
  {
    day: "Thursday, Aug 14",
    rows: [
      [
        "13:02:41",
        "NAVER Corp",
        "035420 · KOSDAQ",
        "Convertible bond issuance decision",
        "M&A",
        "Low priority",
        "Neutral",
      ],
      [
        "11:40:08",
        "SK Hynix",
        "000660 · KOSPI",
        "Single supply agreement exceeding 5% of revenue",
        "Earning",
        "High priority",
        "Positive",
      ],
      [
        "09:15:22",
        "Samsung Electronics",
        "005930 · KOSPI",
        "Cash dividend decision ₩361 per share",
        "Government",
        "Medium priority",
        "Positive",
      ],
    ],
  },
  {
    day: "Wednesday, Aug 13",
    rows: [
      [
        "13:02:41",
        "Doosan Enerbility",
        "034020 · KOSPI",
        "Treasury share acquisition trust agreement",
        "Government",
        "Medium priority",
        "Positive",
      ],
      [
        "09:15:22",
        "Samsung Electronics",
        "005930 · KOSPI",
        "Cash dividend decision ₩361 per share",
        "M&A",
        "High priority",
        "Neutral",
      ],
      [
        "11:40:08",
        "SK Hynix",
        "000660 · KOSPI",
        "Single supply agreement exceeding 5% of revenue",
        "Earning",
        "High priority",
        "Positive",
      ],
      [
        "13:02:41",
        "Doosan Enerbility",
        "034020 · KOSPI",
        "Treasury share acquisition trust agreement",
        "M&A",
        "Low priority",
        "Neutral",
      ],
    ],
  },
];

const filterGroups = [
  [
    "Reporting & Governance",
    "Periodic Reports",
    "Audit Reports",
    "Auditor Change",
    "Corporate Governance",
    "Fair Trade",
    "Credit Rating",
  ],
  [
    "Capital & Shareholder Returns",
    "Issuance Docs",
    "Capital Changes",
    "Dividends",
    "Share Buyback",
    "Asset Securitization",
    "Investment Funds",
    "Bond Defaults",
  ],
  [
    "Corporate Events & Control",
    "Major Management Matters",
    "M&A",
    "Public Tender Offer",
    "Business Transfer",
    "Strategic Alliances",
    "Ownership Disclosure",
    "Listing/Delisting",
    "Lawsuit/Arbitration",
  ],
];

const news = [
  [
    "/assets/news-phone.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
  [
    "/assets/news-office.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Low priority",
    "Listing",
  ],
  [
    "/assets/news-expo.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "Medium priority",
    "Foreign selling",
  ],
  [
    "/assets/news-dark.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Medium priority",
    "Listing",
  ],
];

const RELATED_NEWS_TOTAL = 34;
const RELATED_NEWS_PAGE_SIZE = 4;

export function SearchPage() {
  const [params] = useSearchParams();
  const [range, setRange] = useState("1M");
  const [visibleNewsCount, setVisibleNewsCount] = useState(
    RELATED_NEWS_PAGE_SIZE,
  );
  const query = params.get("q") || "samsung";
  const stocksState = useRemote(
    (signal) => api<{ items: Stock[] }>(`/api/v1/market/stocks/search${queryString({ query, limit: 20 })}`, { signal }),
    [query],
  );
  const filingsState = useRemote(
    (signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ query, limit: 20 })}`, { signal }),
    [query],
  );
  const newsState = useRemote(
    (signal) => api<{ items: NewsArticle[]; nextCursor: string | null }>(`/api/v1/news${queryString({ query, sort: "IMPORTANCE", limit: visibleNewsCount })}`, { signal }),
    [query, visibleNewsCount],
  );
  const liveFilingGroups = useMemo(() => {
    const groups = new Map<string, Filing[]>();
    for (const filing of filingsState.data?.items ?? []) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
    return [...groups.entries()];
  }, [filingsState.data]);

  return (
    <div className="search-page">
      <Header initialQuery={query} />
      <div className="search-hero">
        <div className="page-shell">
          <BackLink to="/" />
          <div className="search-hero-title">
            <div>
              <h1>Search results for ‘{query}’</h1>
              <p>
                {stocksState.data?.items.length ?? 0} matching companies, with their recent filings and related news.
              </p>
            </div>
            <div className="slider-controls">
              <button aria-label="Previous companies">
                <img src="/assets/carousel-prev.svg" alt="" />
              </button>
              <button aria-label="Next companies">
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...stocksState} empty={(value) => !value.items.length}>
            {(value) => <div className="search-stock-grid">
            {value.items.map((stock) => (
              <article className="search-stock-card" key={stock.stockCode}>
                <Link to={`/stocks/${stock.stockCode}`}>
                  <div>
                    <h2>{stock.nameEn || stock.nameKo}</h2>
                    <span>{stock.stockCode} · {stock.market}</span>
                  </div>
                  <strong>{formatNumber(stock.quote?.currentPriceKrw, { style: "currency", currency: "KRW", maximumFractionDigits: 0 })}</strong>
                  <p>
                    <span>{formatNumber(stock.quote?.changeAmountKrw)}</span>
                    <span>{stock.quote?.changeRate === null || stock.quote?.changeRate === undefined ? stock.quote?.status || "Unavailable" : `${stock.quote.changeRate >= 0 ? "+" : ""}${stock.quote.changeRate.toFixed(2)}%`}</span>
                  </p>
                </Link>
                <WatchlistHeart
                  className="stock-result-heart"
                  itemId={stock.stockCode}
                  itemName={stock.nameEn || stock.nameKo}
                />
              </article>
            ))}
          </div>}
          </RemoteState>
        </div>
      </div>

      <main className="page-shell search-content">
        <section>
          <div className="search-section-title">
            <h2>Related disclosures</h2>
          </div>
          <section className="filing-filters search-filing-filters">
            <div className="date-filter">
              <span>Date range</span>
              <input placeholder="mm/dd/yyyy" aria-label="Start date" />
              <b>–</b>
              <input placeholder="mm/dd/yyyy" aria-label="End date" />
              {["1D", "1W", "1M", "3M", "1Y"].map((item) => (
                <button
                  className={range === item ? "active" : ""}
                  onClick={() => setRange(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
              <button className="reset">Reset</button>
            </div>
            {filterGroups.map((group) => (
              <div className="checkbox-row" key={group[0]}>
                <span>{group[0]}</span>
                {group.slice(1).map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      defaultChecked={item === "Periodic Reports"}
                    />
                    {item}
                  </label>
                ))}
              </div>
            ))}
          </section>
          <RemoteState {...filingsState} empty={(value) => !value.items.length}>
            {() => <div className="search-filings">
            {liveFilingGroups.map(([day, rows], groupIndex) => (
              <section key={day}>
                <header>
                  <span>{formatDate(day, false)}</span>
                  <span>{rows.length} filings</span>
                </header>
                {rows.map((filing, index) => (
                  <Link
                    to={`/disclosures/${filing.receiptNumber}`}
                    className={groupIndex === 0 && index === 1 ? "active" : ""}
                    key={filing.receiptNumber}
                  >
                    <span>{formatDate(filing.detectedAt)}</span>
                    <i />
                    <span>
                      <b>{filing.issuerNameEn || filing.issuerNameKo}</b>
                      <small>{filing.stockCode} · {filing.market}</small>
                    </span>
                    <strong>{filing.titleEn || filing.titleKo}</strong>
                    <em>{filing.type}</em>
                    <span className={filing.indexStatus === "READY" ? "positive" : "medium"}>{filing.indexStatus}</span>
                    <span>{filing.correction ? "Correction" : filing.documentStatus}</span>
                  </Link>
                ))}
              </section>
            ))}
          </div>}
          </RemoteState>
        </section>

        <section className="related-news">
          <div className="search-section-title">
            <h2>Related news</h2>
            <span>{newsState.data?.items.length ?? 0} news</span>
          </div>
          <RemoteState {...newsState} empty={(value) => !value.items.length}>
          {(value) => <>{value.items.map((item) => (
            <Link
              to={`/news/${item.id}`}
              key={item.id}
            >
              <img src={item.thumbnailUrl || "/assets/news-phone.png"} alt="" />
              <div>
                <div className="tags">
                  <span
                    className={item.sentiment === "NEGATIVE" ? "negative" : "positive"}
                  >
                    <img
                      src={
                        item.sentiment === "NEGATIVE"
                          ? "/assets/trend-down.svg"
                          : "/assets/trend-up.svg"
                      }
                      alt=""
                    />
                    {item.sentiment || "Pending"}
                  </span>
                  <span
                    className={
                      item.importance === "MEDIUM"
                        ? "medium"
                        : item.importance === "HIGH" || item.importance === "CRITICAL"
                          ? "priority"
                          : ""
                    }
                  >
                    {item.importance ? `${item.importance} priority` : "Pending"}
                  </span>
                  {item.eventType ? <span>{item.eventType}</span> : null}
                </div>
                <h3>{item.englishTitle || item.originalTitle}</h3>
                <p>{item.publisher} · {formatDate(item.publishedAt)} · {item.englishTitle ? "Auto-translated" : "Translation pending"}</p>
                <p>
                  {item.originalExcerpt || "Source excerpt unavailable."}
                </p>
              </div>
            </Link>
          ))}</>}
          </RemoteState>
          {newsState.data?.nextCursor ? (
            <button
              type="button"
              className="more-filings"
              onClick={() =>
                setVisibleNewsCount((current) =>
                  Math.min(
                    current + RELATED_NEWS_PAGE_SIZE,
                    RELATED_NEWS_TOTAL,
                  ),
                )
              }
            >
              View more news
              <img src="/assets/chevron-down-gold.svg" alt="" />
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}
