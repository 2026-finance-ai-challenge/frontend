import { Link } from "react-router-dom";
import { Footer, Header, MarketBar } from "../components/Layout";

const quickActions = [
  ["/assets/news.svg", "Today’s news", "/news"],
  ["/assets/filing.svg", "Dart filings", "/disclosures"],
  ["/assets/ownership.svg", "Foreigner ownership limits", "#foreign"],
  ["/assets/tax.svg", "Check my tax rate", "/tax"],
];

const filings = [
  [
    "13:02:41 KST",
    "NAVER Corp",
    "035420 · KOSPI",
    "Convertible bond issuance decision",
    "M&A",
    "Low priority",
    "Neutral",
  ],
  [
    "11:40:08 KST",
    "SK Hynix",
    "000660 · KOSPI",
    "Single supply agreement exceeding 5% of revenue",
    "Earning",
    "High priority",
    "Positive",
  ],
  [
    "09:15:22 KST",
    "Samsung Electronics",
    "005930 · KOSPI",
    "Cash dividend decision ₩361 per share",
    "Goverment",
    "Medium priority",
    "Positive",
  ],
  [
    "13:02:41 KST",
    "Doosan Enerbility",
    "034020 · KOSPI",
    "Treasury share acquisition trust agreement",
    "Goverment",
    "Medium priority",
    "Positive",
  ],
];

const ownership = [
  {
    name: "KT Corp.",
    code: "030200 · KOSPI",
    value: "0.00",
    width: "100%",
    state: "Near reached",
    tone: "danger",
    foot: "Foreign buy orders are rejected at the exchange until the quota frees up.",
  },
  {
    name: "SK Telecom",
    code: "017670 · KOSPI",
    value: "2.90",
    width: "91%",
    state: "Near cap",
    tone: "warning",
    foot: "The cap can be reached intraday; your buy order may be rejected.",
  },
  {
    name: "Korea Electric Power",
    code: "015760 · KOSPI",
    value: "19.37",
    width: "42%",
    state: "Open",
    tone: "safe",
    foot: "Foreign buy orders are rejected at the exchange.",
  },
];

export function HomePage() {
  return (
    <div className="app-page home-page">
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
              <button aria-label="Previous story">
                <img src="/assets/carousel-prev.svg" alt="" />
              </button>
              <button aria-label="Next story">
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <div className="news-grid">
            <article className="news-card featured">
              <div className="tags">
                <span className="negative">
                  <img src="/assets/trend-down.svg" alt="" />
                  Negative
                </span>
                <span className="priority">High priority</span>
                <span>Foreign selling</span>
              </div>
              <h3>Semiconductor Exports Surge in April</h3>
              <p className="meta">
                Yesterday · 4:26 PM · 5,900 read · Tech Journal
              </p>
              <img
                src="/assets/news-samsung.png"
                alt="Semiconductor manufacturing"
              />
              <div className="insight">
                <p>
                  <b>What</b>KOSPI closed 0.9% lower as foreign investors sold a
                  net ₩820B.
                </p>
                <p>
                  <b>Why</b>Chip earnings expectations were reduced amid demand
                  uncertainty.
                </p>
                <p>
                  <b>Impact</b>Broadly bearish across tech; watch volatility
                  after the open.
                </p>
              </div>
            </article>
            <article className="news-card">
              <div className="tags">
                <span className="positive">
                  <img src="/assets/trend-up.svg" alt="" />
                  Positive
                </span>
                <span className="medium">Medium priority</span>
                <span>Listing</span>
              </div>
              <h3>Regulatory Body Probes Short Selling Practices</h3>
              <p className="meta">
                Yesterday · 3:05 PM · 4,820 read · Korea Economic Daily
              </p>
              <img
                src="/assets/news-regulation.png"
                alt="Korean financial district"
              />
              <div className="insight">
                <p>
                  <b>What</b>Regulators announced a focused short-selling
                  review.
                </p>
                <p>
                  <b>Why</b>New market safeguards take effect this quarter.
                </p>
                <p>
                  <b>Impact</b>Near-term volatility may rise for high
                  short-interest names.
                </p>
              </div>
            </article>
          </div>
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
            <div className="table-day">
              <span>Thursday, Aug 14</span>
              <span>3 filings</span>
            </div>
            {filings.slice(0, 3).map((row, index) => (
              <FilingRow row={row} key={row[1]} active={index === 1} />
            ))}
            <div className="table-day">
              <span>Wednesday, Aug 13</span>
              <span>1 filing</span>
            </div>
            <FilingRow row={filings[3]} />
            <Link className="view-all" to="/disclosures">
              View all filings ›
            </Link>
          </div>
        </section>

        <section className="section-block ownership-section" id="foreign">
          <div className="section-heading">
            <div>
              <h2>Foreign ownership limit gauge</h2>
              <p>
                Thirty-three Korean stocks carry a statutory cap on foreign
                ownership.
                <br />
                Filter by status, then read how much headroom is left before
                orders start getting rejected.
              </p>
              <div className="status-copy">
                <span>
                  <b className="danger-text">3</b> <u>At the cap</u>&nbsp; Buy
                  orders rejected right now.
                </span>
                <span>
                  <b className="warning-text">5</b> <u>Near the cap</u>&nbsp;
                  90% or more of the quota used.
                </span>
                <span>
                  <b className="safe-text">25</b> <u>Open</u>&nbsp; Room to buy
                  without restriction.
                </span>
              </div>
            </div>
            <Link className="text-link icon-link" to="/stocks/005930">
              View all gauges
              <img src="/assets/chevron-right-gold.svg" alt="" />
            </Link>
          </div>
          <div className="ownership-grid">
            {ownership.map((item) => (
              <article className="ownership-card" key={item.name}>
                <div className="card-title">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.code}</p>
                  </div>
                  <span className={item.tone}>
                    {item.tone === "danger" && (
                      <img src="/assets/status-warning.svg" alt="" />
                    )}
                    {item.state}
                  </span>
                </div>
                <strong className={item.tone}>
                  {item.value}
                  <small>% remaining</small>
                </strong>
                <div className="gauge">
                  <span className={item.tone} style={{ width: item.width }} />
                </div>
                <div className="gauge-labels">
                  <span>
                    Used{" "}
                    {item.tone === "danger"
                      ? "40.00%"
                      : item.tone === "warning"
                        ? "46.10%"
                        : "20.64%"}
                  </span>
                  <span>Cap {item.tone === "safe" ? "40.00%" : "49.00%"}</span>
                </div>
                <p className="card-foot">{item.foot}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block tax-section">
          <div className="section-heading">
            <div>
              <h2>Dividend withholding tax</h2>
              <p>
                Korea withholds 22% on dividends paid to non-residents by
                default.
                <br />A tax treaty can reduce that rate but only for investors
                who file for it in advance.
              </p>
            </div>
          </div>
          <div className="tax-grid">
            <article className="tax-card">
              <div className="tax-rates">
                <div>
                  <span>Default rate</span>
                  <strong>
                    22.0<small>%</small>
                  </strong>
                  <small>20% national + 2% local surtax</small>
                </div>
                <b>›</b>
                <div>
                  <span>Treaty rate starts</span>
                  <strong className="safe-text">
                    15.0<small>%</small>
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
              <Link className="primary-button" to="/tax">
                Check eligibility ›
              </Link>
            </article>
            <article className="treaty-card">
              <div className="treaty-head">
                <span>Country of residence</span>
                <span>Default</span>
                <span>Treaty</span>
                <span>Difference</span>
              </div>
              {[
                ["United States", "22.0%", "15.0%", "-7.0pp"],
                ["Japan", "22.0%", "15.0%", "-7.0pp"],
                ["United Kingdom", "22.0%", "15.0%", "-7.0pp"],
                ["Singapore", "22.0%", "15.0%", "-7.0pp"],
                ["China", "22.0%", "10.0%", "-12.0pp"],
              ].map((row) => (
                <div key={row[0]}>
                  {row.map((cell, i) => (
                    <span className={i === 3 ? "safe-text" : ""} key={cell}>
                      {cell}
                    </span>
                  ))}
                </div>
              ))}
            </article>
          </div>
          <p className="tax-note">
            Standard treaty rates for individual portfolio dividends. Your rate
            may differ—confirm with your broker. Not tax advice.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FilingRow({
  row,
  active = false,
}: {
  row: string[];
  active?: boolean;
}) {
  return (
    <Link
      className={`filing-row ${active ? "active" : ""}`}
      to="/disclosures/20260814001"
    >
      <span>{row[0]}</span>
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
      <span className="positive">
        <img src="/assets/trend-up.svg" alt="" />
        {row[6]}
      </span>
    </Link>
  );
}
