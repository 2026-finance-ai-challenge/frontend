import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { WatchlistHeart } from "../components/WatchlistHeart";

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
  const relatedNews = Array.from(
    { length: Math.min(visibleNewsCount, RELATED_NEWS_TOTAL) },
    (_, index) => news[index % news.length],
  );

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
                4 matching companies, with their recent filings and related
                news.
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
          <div className="search-stock-grid">
            {stocks.map((stock) => (
              <article className="search-stock-card" key={stock.id}>
                <Link to="/stocks/005930">
                  <div>
                    <h2>{stock.name}</h2>
                    <span>{stock.description}</span>
                  </div>
                  <strong>₩230,420</strong>
                  <p>
                    <span>▲ 4320</span>
                    <span>+2.52%</span>
                  </p>
                </Link>
                <WatchlistHeart
                  className="stock-result-heart"
                  itemId={stock.id}
                  itemName={stock.name}
                />
              </article>
            ))}
          </div>
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
          <div className="search-filings">
            {filingGroups.map((group, groupIndex) => (
              <section key={group.day}>
                <header>
                  <span>{group.day}</span>
                  <span>{group.rows.length} filings</span>
                </header>
                {group.rows.map((row, index) => (
                  <Link
                    to="/disclosures/20260814001"
                    className={groupIndex === 0 && index === 1 ? "active" : ""}
                    key={`${group.day}-${index}`}
                  >
                    <span>{row[0]} KST</span>
                    <i
                      className={row[1] === "Doosan Enerbility" ? "red" : ""}
                    />
                    <span>
                      <b>{row[1]}</b>
                      <small>{row[2]}</small>
                    </span>
                    <strong>{row[3]}</strong>
                    <em>{row[4]}</em>
                    <span
                      className={
                        row[5].startsWith("High")
                          ? "priority"
                          : row[5].startsWith("Medium")
                            ? "medium"
                            : ""
                      }
                    >
                      {row[5]}
                    </span>
                    <span className={row[6] === "Positive" ? "positive" : ""}>
                      {row[6] === "Positive" && (
                        <img src="/assets/trend-up.svg" alt="" />
                      )}
                      {row[6]}
                    </span>
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="related-news">
          <div className="search-section-title">
            <h2>Related news</h2>
            <span>{RELATED_NEWS_TOTAL} news</span>
          </div>
          {relatedNews.map((item, index) => (
            <Link
              to="/news/fy2025-dividend"
              key={`${item[1]}-${index}`}
            >
              <img src={item[0]} alt="" />
              <div>
                <div className="tags">
                  <span
                    className={item[2] === "Negative" ? "negative" : "positive"}
                  >
                    <img
                      src={
                        item[2] === "Negative"
                          ? "/assets/trend-down.svg"
                          : "/assets/trend-up.svg"
                      }
                      alt=""
                    />
                    {item[2]}
                  </span>
                  <span
                    className={
                      item[3].startsWith("Medium")
                        ? "medium"
                        : item[3].startsWith("High")
                          ? "priority"
                          : ""
                    }
                  >
                    {item[3]}
                  </span>
                  <span>{item[4]}</span>
                </div>
                <h3>{item[1]}</h3>
                <p>Yonhap Infomax · Aug 14, 14:20 KST · Auto-translated</p>
                <p>
                  Selling pressure came mostly from institutions, while ants
                  absorbed much of the supply for a fourth straight day. Trading
                  concentrated in the bellwether chip names, while several
                  small-cap names with limited free float — what local traders
                  call sold-out stocks — swung sharply.
                </p>
              </div>
            </Link>
          ))}
          {visibleNewsCount < RELATED_NEWS_TOTAL ? (
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
