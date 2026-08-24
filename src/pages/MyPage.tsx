import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";

const recent = [
  [
    "News",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
  [
    "Disclosure",
    "Regulatory Body Probes Short Selling Practices",
    "Earning",
    "High priority",
    "Positive",
  ],
  [
    "Disclosure",
    "Semiconductor Exports Surge in April",
    "Government",
    "Medium priority",
    "Positive",
  ],
  [
    "News",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Medium priority",
    "Listing",
  ],
  [
    "News",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
];

const stocks = [
  [
    "Samsung Electronics",
    "005930 · KOSPI",
    "320,000",
    "-1,003",
    "-1.55%",
    "Near reached",
  ],
  ["SK Hynix", "000660 · KOSPI", "320,000", "-1,003", "-1.55%", "Near cap"],
  ["NAVER", "035420 · KOSPI", "320,000", "-1,003", "-1.55%", "Open"],
  [
    "KT Corporation",
    "030200 · KOSPI",
    "320,000",
    "-1,003",
    "+23.5%",
    "Near cap",
  ],
  ["Samsung SDI", "006400 · KOSPI", "320,000", "-1,003", "+23.5%", "Open"],
  [
    "Samsung Electronics",
    "005930 · KOSPI",
    "320,000",
    "-1,003",
    "-1.55%",
    "Near reached",
  ],
];

export function MyPage() {
  const [selected, setSelected] = useState([
    true,
    false,
    true,
    true,
    false,
    false,
  ]);
  const toggle = (index: number) =>
    setSelected((values) =>
      values.map((value, current) => (current === index ? !value : value)),
    );
  return (
    <div className="my-page">
      <Header authenticated white />
      <main className="page-shell my-shell">
        <BackLink to="/" />
        <section className="profile-row">
          <img src="/assets/profile.png" alt="Joe Biden" />
          <div>
            <h1>Joe Biden</h1>
            <div>
              <span>
                <img src="/assets/flag-us.svg" alt="" /> United States
              </span>
              <span className="safe">Eligible for 15% treaty rate</span>
              <span>Individual</span>
            </div>
          </div>
          <Link to="/tax">
            Complete tax filing{" "}
            <img src="/assets/chevron-right-gold.svg" alt="" />
          </Link>
        </section>
        <DashboardSection
          title="Recently viewed"
          description="News and filings you opened, with their summaries kept for reference."
        >
          <ActivityList />
        </DashboardSection>
        <DashboardSection
          title="My watchlist"
          description="Add companies with the heart button in the search dropdown or on any company page."
        >
          <div className="watchlist">
            <header>
              <span>
                <img src="/assets/checkbox-checked.svg" alt="" />{" "}
                {selected.filter(Boolean).length} selected
              </span>
              <button
                aria-label="Delete selected"
                onClick={() => setSelected(stocks.map(() => false))}
              >
                <img src="/assets/trash.svg" alt="" />
              </button>
            </header>
            <div className="watch-head">
              <span>Company</span>
              <span>Price(KRW)</span>
              <span>Change</span>
              <span>%</span>
              <span>Regulatory status</span>
            </div>
            {stocks.map((stock, index) => (
              <div className="watch-row" key={`${stock[0]}-${index}`}>
                <div className="watch-company">
                  <button
                    className={`watch-check ${selected[index] ? "checked" : ""}`}
                    onClick={() => toggle(index)}
                    aria-label={`${stock[0]} ${selected[index] ? "unselect" : "select"}`}
                  >
                    {selected[index] && (
                      <img src="/assets/checkbox-checked.svg" alt="" />
                    )}
                  </button>
                  <span>
                    <b>{stock[0]}</b>
                    <small>{stock[1]}</small>
                  </span>
                </div>
                <span>{stock[2]}</span>
                <span className="danger-text">{stock[3]}</span>
                <span
                  className={
                    stock[4].startsWith("+")
                      ? "safe watch-change"
                      : "danger watch-change"
                  }
                >
                  <img
                    src={
                      stock[4].startsWith("+")
                        ? "/assets/trend-up.svg"
                        : "/assets/price-down.svg"
                    }
                    alt=""
                  />
                  {stock[4]}
                </span>
                <span
                  className={
                    stock[5] === "Near reached"
                      ? "stock-danger watch-status"
                      : stock[5].startsWith("Near")
                        ? "warning-chip watch-status"
                        : "watch-status"
                  }
                >
                  {stock[5] === "Near reached" && (
                    <img src="/assets/status-warning.svg" alt="" />
                  )}
                  {stock[5]}
                </span>
              </div>
            ))}
            <Link to="/stocks/005930">
              View more watchlist{" "}
              <img src="/assets/chevron-down-gold.svg" alt="" />
            </Link>
          </div>
        </DashboardSection>
        <DashboardSection
          title="Integrated Intelligence Feed"
          description="News and filings filtered to your watchlist only."
        >
          <ActivityList />
        </DashboardSection>
      </main>
    </div>
  );
}

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-title">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="carousel-controls">
          <button aria-label="Previous">
            <img src="/assets/carousel-prev.svg" alt="" />
          </button>
          <button aria-label="Next">
            <img src="/assets/carousel-next.svg" alt="" />
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

function ActivityList() {
  return (
    <div className="activity-list">
      {recent.map((row, index) => (
        <Link
          to={
            row[0] === "News"
              ? "/news/fy2025-dividend"
              : "/disclosures/20260814001"
          }
          key={`${row[1]}-${index}`}
        >
          <div>
            <span>{row[0]}</span>
            <b>{row[1]}</b>
          </div>
          <div>
            {row
              .slice(2)
              .filter(Boolean)
              .map((tag, tagIndex) => (
                <span
                  className={
                    tag === "Negative" || tag === "High priority"
                      ? "priority"
                      : tag === "Positive"
                        ? "positive"
                        : tag === "Medium priority"
                          ? "medium"
                          : tag === "Foreign selling" || tag === "Listing"
                            ? "info-tag"
                            : ""
                  }
                  key={`${tag}-${tagIndex}`}
                >
                  {tag === "Negative" && (
                    <img src="/assets/trend-down.svg" alt="" />
                  )}
                  {tag === "Positive" && (
                    <img src="/assets/trend-up.svg" alt="" />
                  )}
                  {tag}
                </span>
              ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
