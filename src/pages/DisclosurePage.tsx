import { useState } from "react";
import { Link } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { WatchlistHeart } from "../components/WatchlistHeart";

const filings = [
  [
    "13:02:41",
    "NAVER Corp",
    "035420 · KOSDAQ",
    "Convertible bond issuance decision",
    "M&A",
    "Low priority",
  ],
  [
    "11:40:08",
    "SK Hynix",
    "000660 · KOSPI",
    "Single supply agreement exceeding 5% of revenue",
    "Earning",
    "High priority",
  ],
  [
    "09:15:22",
    "Samsung Electronics",
    "005930 · KOSPI",
    "Cash dividend decision ₩361 per share",
    "Government",
    "Medium priority",
  ],
  [
    "13:02:41",
    "Doosan Enerbility",
    "034020 · KOSPI",
    "Treasury share acquisition trust agreement",
    "Government",
    "Medium priority",
  ],
];

const filingGroups = [
  [
    "Thursday, Aug 14",
    "3",
    [
      [0, "Neutral"],
      [1, "Positive"],
      [2, "Positive"],
    ],
  ],
  [
    "Wednesday, Aug 13",
    "4",
    [
      [3, "Positive"],
      [2, "Neutral"],
      [1, "Positive"],
      [3, "Neutral"],
    ],
  ],
  [
    "Tuesday, Aug 12",
    "3",
    [
      [3, "Positive"],
      [2, "Positive"],
      [1, "Neutral"],
    ],
  ],
  [
    "Tuesday, Aug 12",
    "3",
    [
      [3, "Positive"],
      [2, "Positive"],
      [1, "Neutral"],
    ],
  ],
] as const;

function FilingRows() {
  return (
    <div className="disclosure-rows">
      {filingGroups.map((group, groupIndex) => (
        <section key={`${group[0]}-${groupIndex}`}>
          <header>
            <span>{group[0]}</span>
            <span>{group[1]} filings</span>
          </header>
          {group[2].map(([rowIndex, sentiment], index) => {
            const row = filings[rowIndex];
            return (
              <Link
                to="/disclosures/20260814001"
                className={index === 1 && groupIndex === 0 ? "active" : ""}
                key={`${groupIndex}-${index}`}
              >
                <span>{row[0]} KST</span>
                <i
                  className={
                    row[1].startsWith("Doosan")
                      ? "red"
                      : sentiment === "Neutral"
                        ? "neutral"
                        : ""
                  }
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
                <span className={sentiment === "Positive" ? "positive" : ""}>
                  {sentiment === "Positive" ? (
                    <img src="/assets/trend-up.svg" alt="" />
                  ) : (
                    "—"
                  )}
                  {sentiment}
                </span>
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function StockDisclosureHeader() {
  return (
    <div className="news-stock-hero">
      <Header />
      <div className="page-shell mini-stock">
        <BackLink to="/stocks/005930" />
        <div>
          <h1>
            Samsung Electronics{" "}
            <WatchlistHeart
              itemId="samsung-electronics"
              itemName="Samsung Electronics"
            />
          </h1>
          <span className="mini-price">
            <strong>₩288,020</strong>
            <small>
              -1,000 <img src="/assets/price-down.svg" alt="" /> -1.2%
            </small>
          </span>
        </div>
        <p>005930 · KOSPI</p>
        <p>Market closed · Aug 14, 15:30 KST · Converted at 1,318.40 KRW/USD</p>
        <div className="mini-metrics">
          <span>
            High<b>123,000</b>
          </span>
          <span>
            Low<b>123,000</b>
          </span>
          <span>
            Volume<b>20.1M</b>
          </span>
          <span>
            Prev close<b>192.06</b>
          </span>
        </div>
        <div className="stock-badges">
          <span className="stock-danger">
            <img src="/assets/status-warning.svg" alt="" />
            Near reached
          </span>
          <span className="warning-chip">
            <img src="/assets/timer.svg" alt="" />
            VI Triggered (01:43)
          </span>
        </div>
        <Link className="mini-insight" to="/stocks/005930?insights=1">
          <img src="/assets/info.svg" alt="" />
          <span>
            <b>Quick check company insight!</b>
            <small>
              See which global companies this business most closely resembles.
            </small>
          </span>
          <em>
            View insights <img src="/assets/chevron-right-gold.svg" alt="" />
          </em>
        </Link>
      </div>
    </div>
  );
}

export function DisclosurePage() {
  return (
    <div className="disclosure-page">
      <StockDisclosureHeader />
      <main className="page-shell disclosure-main">
        <div className="stock-tabs">
          <Link to="/stocks/005930">Chart</Link>
          <Link to="/news">News</Link>
          <button className="active">Disclosure</button>
        </div>
        <FilingFilters />
        <FilingRows />
        <button className="more-filings">
          View more filings <img src="/assets/chevron-down-gold.svg" alt="" />
        </button>
      </main>
    </div>
  );
}

function FilingFilters() {
  const [range, setRange] = useState("1M");
  return (
    <section className="filing-filters">
      <div className="date-filter">
        <span>Date range</span>
        <input placeholder="mm/dd/yyyy" />
        <b>–</b>
        <input placeholder="mm/dd/yyyy" />
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
      {[
        [
          "Reporting & Governance",
          "Periodic Reports",
          "Audit Reports",
          "Author Change",
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
        ],
      ].map((group) => (
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
  );
}

export function DisclosureDetailPage() {
  const [agent, setAgent] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <div className={`filing-detail ${agent ? "agent-open" : ""}`}>
      <div className="filing-detail-main">
        <Header />
        <div className="filing-hero">
          <div className="page-shell">
            <BackLink to="/disclosures" />
            <div className="filing-title">
              <div>
                <div className="entity-chips">
                  <span>
                    <img src="/assets/company.svg" alt="" />
                    Samsung Electronics
                  </span>
                  <span>005930</span>
                  <span>KOSPI</span>
                </div>
                <h1>
                  Resolution on Issuance of New
                  <br />
                  Shares
                </h1>
              </div>
              <div>
                <button>
                  <img src="/assets/download.svg" alt="" /> Download Original
                  (PDF)
                </button>
                <small>Submitted: Aug 14, 14:20 KST</small>
              </div>
            </div>
            <div className="filing-meta">
              <span>
                Reporter<b>Samsung Electronics Co., Ltd.</b>
              </span>
              <span>
                Receiver<b>Financial Services Commission</b>
              </span>
              <span>
                Document No.<b>20231031000123</b>
              </span>
            </div>
          </div>
        </div>
        <main className="page-shell filing-body-shell">
          <div className="article-grid">
            <div>
              <section className="ai-summary">
                <h2>
                  AI Insight summary{" "}
                  <img src="/assets/agent-badge.svg" alt="AI" />
                </h2>
                {[
                  [
                    "What",
                    "KOSPI closed 0.4% lower as foreign investors sold a net ₩820B.",
                  ],
                  [
                    "Why",
                    "Chip earnings expectations were revised down ahead of guidance.",
                  ],
                  [
                    "Impact",
                    "Breadth matters more than the index level; watch whether net buying returns before quarter-end.",
                  ],
                ].map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1]}</span>
                  </p>
                ))}
              </section>
              <section className="translation">
                <h2>
                  <span>
                    <img src="/assets/translation.svg" alt="" />
                    English translation
                  </span>
                  <span className="translation-actions">
                    <button aria-label="Print">
                      <img src="/assets/print.svg" alt="" />
                    </button>
                    <button aria-label="Share">
                      <img src="/assets/share.svg" alt="" />
                    </button>
                  </span>
                </h2>
                <button
                  className="selection-hint"
                  onClick={() => setAgent(true)}
                >
                  <img src="/assets/selection-info.svg" alt="" /> Drag over any
                  highlighted term to look it up.
                </button>
                <img
                  src="/assets/disclosure-table.png"
                  alt="Translated disclosure ownership tables"
                />
              </section>
            </div>
            <aside className="mentioned">
              <h2>Division</h2>
              <div className="tags">
                <span className="positive">
                  <img src="/assets/trend-up.svg" alt="" />
                  Positive
                </span>
                <span className="priority">High priority</span>
                <span>Earning</span>
              </div>
            </aside>
          </div>
        </main>
      </div>
      {agent && (
        <FilingAgent
          menu={menu}
          onMenu={() => setMenu(!menu)}
          close={() => setAgent(false)}
        />
      )}
    </div>
  );
}

function FilingAgent({
  menu,
  onMenu,
  close,
}: {
  menu: boolean;
  onMenu: () => void;
  close: () => void;
}) {
  return (
    <aside className="agent-panel filing-agent">
      <button className="agent-close" onClick={close}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>AI Financial Intelligence</p>
        </div>
        <button className="agent-overflow-button" onClick={onMenu}>
          <img src="/assets/overflow.svg" alt="Menu" />
        </button>
        {menu && (
          <div className="agent-menu">
            <button>
              <img src="/assets/history.svg" alt="" /> History
            </button>
            <button>
              <img src="/assets/delete.svg" alt="" /> Delete
            </button>
          </div>
        )}
      </header>
      <div className="context-chip">
        <img src="/assets/agent-context.svg" alt="" /> Context Attached: Samsung
        Electronics Prospectus
      </div>
      <div className="chat">
        <p className="user-message">
          What is the definition effect of this new share issuance
        </p>
        <div className="ai-message">
          <p>
            KT has reached its 49% cap, so buy orders from foreign investors
            will be rejected. SK Telecom sits at 46.10% of a 49% cap — about 94%
            used — and could reach the cap intraday. KEPCO and KOGAS both have
            substantial room.
          </p>
          <blockquote>
            <b>Data Point Reference:</b>
            <p>- SEOUL, South Korea — Samsung Electronics</p>
            <p>- accelerating its efforts to create a more connected</p>
          </blockquote>
          <p>
            so buy orders from foreign investors will be rejected. SK Telecom
            sits at 46.10% of a 49% cap.
          </p>
          <p>
            Source: <u>KRX foreign ownership snapshot, 15:30 KST</u>
          </p>
        </div>
      </div>
      <div className="faq">
        <span>Frequently asked</span>
        <button>Why is the KOSPI down today?</button>
        <button>Which stocks are near their foreign ownership cap?</button>
      </div>
      <div className="chat-input">
        Ask anything about this market{" "}
        <button>
          <img src="/assets/agent-send.svg" alt="Send" />
        </button>
      </div>
    </aside>
  );
}
