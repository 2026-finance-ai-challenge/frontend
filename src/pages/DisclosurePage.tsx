import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import {
  AgentHistoryView,
  AgentOverflowMenu,
} from "../components/AgentHistory";

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
  const { pathname } = useLocation();
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=disclosure`
    : pathname;

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
                state={{ returnTo }}
                onClick={() => window.scrollTo(0, 0)}
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

export function DisclosurePage() {
  return (
    <div className="disclosure-page disclosure-index-page">
      <Header white />
      <main className="page-shell disclosure-index-main">
        <BackLink to="/" />
        <h1>DART filings pulse</h1>
        <p className="disclosure-index-description">
          Disclosures summarised into What / Why / Impact, with an agent that
          answers follow-up questions from the original text.
        </p>
        <FilingFilters />
        <FilingRows />
        <button type="button" className="more-filings">
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
      <div className="filing-filter-heading">
        <span>Date range</span>
        <button type="button" className="reset">
          Reset
        </button>
      </div>
      <div className="date-filter">
        <input placeholder="mm/dd/yyyy" aria-label="Start date" />
        <b>–</b>
        <input placeholder="mm/dd/yyyy" aria-label="End date" />
        {["1D", "1W", "1M", "3M", "1Y"].map((item) => (
          <button
            type="button"
            className={range === item ? "active" : ""}
            onClick={() => setRange(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      {[
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

export function StockDisclosureFeed() {
  return (
    <>
      <FilingFilters />
      <FilingRows />
      <button type="button" className="more-filings">
        View more filings <img src="/assets/chevron-down-gold.svg" alt="" />
      </button>
    </>
  );
}

export function DisclosureDetailPage() {
  const location = useLocation();
  const [agent, setAgent] = useState(false);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ??
    "/disclosures";

  return (
    <div className={`filing-detail ${agent ? "agent-open" : ""}`}>
      <div className="filing-detail-main">
        <Header />
        <div className="filing-hero">
          <div className="page-shell">
            <BackLink to={returnTo} />
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
          <div className="filing-summary-grid">
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
            <aside className="mentioned filing-division">
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
            <button className="selection-hint" onClick={() => setAgent(true)}>
              <img src="/assets/selection-info.svg" alt="" /> Drag over any
              highlighted term to look it up.
            </button>
            <img
              src="/assets/disclosure-table.png"
              alt="Translated disclosure ownership tables"
            />
          </section>
        </main>
      </div>
      {agent ? (
        <FilingAgent close={() => setAgent(false)} />
      ) : null}
    </div>
  );
}

function FilingAgent({ close }: { close: () => void }) {
  const [history, setHistory] = useState(false);

  if (history) {
    return (
      <AgentHistoryView
        close={close}
        onConversation={() => setHistory(false)}
      />
    );
  }

  return (
    <aside
      className="agent-panel filing-agent"
      role="dialog"
      aria-modal="true"
      aria-label="K-Agent chat"
    >
      <button className="agent-close" type="button" onClick={close}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>AI Financial Intelligence</p>
        </div>
        <AgentOverflowMenu onHistory={() => setHistory(true)} />
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
        <button type="button">
          <img src="/assets/agent-send.svg" alt="Send" />
        </button>
      </div>
    </aside>
  );
}
