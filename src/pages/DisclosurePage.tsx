import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { openKAgent } from "../agentEvents";
import {
  AgentHistoryView,
  AgentOverflowMenu,
} from "../components/AgentHistory";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { useRemote } from "../hooks/useRemote";
import type { Filing, FilingDetail, TranslationResult } from "../types";

type FilingInsight = {
  sufficientEvidence: boolean;
  what: string | null;
  why: string | null;
  impact: string | null;
  refusalReason: string | null;
  sourceSectionIds: string[];
  modelId: string | null;
  generatedAt: string | null;
};

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

function FilingRows({ stockCode }: { stockCode?: string }) {
  const { pathname } = useLocation();
  const [limit, setLimit] = useState(30);
  const state = useRemote(
    (signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ stockCode, limit })}`, { signal }),
    [stockCode, limit],
  );
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=disclosure`
    : pathname;

  const groups = new Map<string, Filing[]>();
  for (const filing of state.data?.items ?? []) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
  return <RemoteState {...state} empty={(value) => !value.items.length}>
    {() => <><div className="disclosure-rows">
      {[...groups.entries()].map(([day, rows], groupIndex) => (
        <section key={day}>
          <header>
            <span>{formatDate(day, false)}</span>
            <span>{rows.length} filings</span>
          </header>
          {rows.map((filing, index) => (
              <Link
                to={`/disclosures/${filing.receiptNumber}`}
                state={{ returnTo }}
                onClick={() => window.scrollTo(0, 0)}
                className={index === 1 && groupIndex === 0 ? "active" : ""}
                key={filing.receiptNumber}
              >
                <span>{formatDate(filing.detectedAt)}</span>
                <i className={filing.correction ? "red" : "neutral"} />
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
    </div>{state.data?.nextCursor ? <button type="button" className="more-filings" onClick={() => setLimit((value) => Math.min(value + 30, 100))}>View more filings <img src="/assets/chevron-down-gold.svg" alt="" /></button> : null}</>}
  </RemoteState>;
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
  const { stockCode } = useParams();
  return (
    <>
      <FilingFilters />
      <FilingRows stockCode={stockCode} />
    </>
  );
}

export function DisclosureDetailPage() {
  const location = useLocation();
  const { disclosureId = "" } = useParams();
  const detailState = useRemote((signal) => api<FilingDetail>(`/api/v1/disclosures/${disclosureId}`, { signal }), [disclosureId]);
  const insightState = useRemote((signal) => api<FilingInsight>(`/api/v1/disclosures/${disclosureId}/insight`, { signal }), [disclosureId]);
  const filing = detailState.data;
  const [indexRequested, setIndexRequested] = useState(false);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ??
    "/disclosures";

  return (
    <div className="filing-detail">
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
                    {filing?.issuerNameEn || filing?.issuerNameKo || "Loading filing…"}
                  </span>
                  <span>{filing?.stockCode || "—"}</span>
                  <span>{filing?.market || "—"}</span>
                </div>
                <h1>
                  {filing?.titleEn || filing?.titleKo || "Loading disclosure…"}
                </h1>
              </div>
              <div>
                <a href={filing?.officialUrl || "#"} target="_blank" rel="noreferrer">
                  <img src="/assets/download.svg" alt="" /> Download Original
                </a>
                <small>Submitted: {formatDate(filing?.detectedAt)}</small>
              </div>
            </div>
            <div className="filing-meta">
              <span>
                Reporter<b>{filing?.submitter || "Unavailable"}</b>
              </span>
              <span>
                Status<b>{filing?.documentStatus || "Unavailable"}</b>
              </span>
              <span>
                Document No.<b>{filing?.receiptNumber || disclosureId}</b>
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
                {insightState.data?.sufficientEvidence ? [
                  ["What", insightState.data.what],
                  ["Why", insightState.data.why],
                  ["Impact", insightState.data.impact],
                ].map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1]}</span>
                  </p>
                )) : <div className="api-state"><span>{insightState.loading ? "Loading AI insight…" : insightState.error?.message || insightState.data?.refusalReason || "No grounded insight has been generated."}</span>{filing?.indexStatus === "READY" ? <button onClick={() => void api<FilingInsight>(`/api/v1/disclosures/${disclosureId}/insight`, { method: "POST" }).then(insightState.setData)}>Generate insight</button> : filing && !indexRequested ? <button onClick={() => void api(`/api/v1/disclosures/${disclosureId}/index`, { method: "POST" }).then(() => setIndexRequested(true))}>Prepare document for AI</button> : null}{indexRequested ? <small>Indexing requested. The grounded insight will be available after processing.</small> : null}</div>}
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
            <button className="selection-hint" onClick={() => openKAgent({ contextType: "FILING", referenceId: disclosureId, prompt: "Explain the important terms and practical impact of this filing." })}>
              <img src="/assets/selection-info.svg" alt="" /> Drag over any
              highlighted term to look it up.
            </button>
            <RemoteState {...detailState}>
              {(value) => <div className="disclosure-structured-body">{value.documents.flatMap((document) => document.sections).map((section) => <DisclosureSection receiptNumber={disclosureId} section={section} key={section.id} />)}</div>}
            </RemoteState>
          </section>
          <DisclosureQuestionBox receiptNumber={disclosureId} ready={filing?.indexStatus === "READY"} />
        </main>
      </div>
    </div>
  );
}

type FilingSection = FilingDetail["documents"][number]["sections"][number];

function DisclosureSection({ receiptNumber, section }: { receiptNumber: string; section: FilingSection }) {
  const translation = useRemote((signal) => api<TranslationResult>(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`, { signal }), [receiptNumber, section.id]);
  const translated = translation.data?.status === "READY" ? translation.data.result : null;
  const requestTranslation = () => void api<TranslationResult>(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`, { method: "POST" }).then(translation.setData);
  return <section id={`section-${section.id}`}><h3>{translated?.translatedHeading || section.heading || section.kind}</h3>{translated?.translatedText ? <p>{translated.translatedText}</p> : translated?.translatedTableData ? <pre>{JSON.stringify(translated.translatedTableData, null, 2)}</pre> : section.kind === "TABLE" ? <pre>{JSON.stringify(section.tableData, null, 2)}</pre> : <p>{section.text || "Section text unavailable."}</p>}<div className="disclosure-section-actions">{translation.data?.status !== "READY" ? <button type="button" onClick={requestTranslation} disabled={translation.data?.status === "PENDING" || translation.data?.status === "PROCESSING"}>{translation.data?.status === "PENDING" || translation.data?.status === "PROCESSING" ? "Translation processing…" : "Translate section"}</button> : null}<button type="button" onClick={() => openKAgent({ contextType: "FILING", referenceId: receiptNumber, prompt: `Explain the ${section.heading || section.kind} section and its investor impact.` })}>Ask K-Agent</button></div></section>;
}

type DisclosureAnswer = { answer: string; refused: boolean; refusalReason: string | null; citations: Array<{ id: string; heading: string | null; excerpt: string | null }> };

function DisclosureQuestionBox({ receiptNumber, ready }: { receiptNumber: string; ready: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<DisclosureAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true); setError("");
    try { setAnswer(await api<DisclosureAnswer>(`/api/v1/disclosures/${receiptNumber}/questions`, { method: "POST", body: JSON.stringify({ question: question.trim() }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The filing question could not be answered."); }
    finally { setBusy(false); }
  };
  return <section className="disclosure-question"><h2>Ask about this filing</h2><p>Answers are restricted to indexed sections of the current disclosure version.</p><form onSubmit={(event) => { event.preventDefault(); void ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed and how could it affect investors?" disabled={!ready || busy} /><button disabled={!ready || !question.trim() || busy}>{busy ? "Checking sources…" : "Ask"}</button></form>{!ready ? <small>The document must finish indexing before grounded questions are available.</small> : null}{error ? <p className="auth-error">{error}</p> : null}{answer ? <blockquote><p>{answer.refused ? answer.refusalReason : answer.answer}</p>{answer.citations.map((citation) => <small key={citation.id}><b>{citation.heading || "Source section"}</b> {citation.excerpt}</small>)}</blockquote> : null}</section>;
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
