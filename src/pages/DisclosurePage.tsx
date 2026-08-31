import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { openKAgent } from "../agentEvents";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { useCursorPage } from "../hooks/useCursorPage";
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

type FilingFiltersValue = { from: string; to: string; types: string[] };

const DISCLOSURE_FILTERS = [
  ["Reporting & Governance", ["Periodic Reports", "PERIODIC"], ["Audit Reports", "AUDIT"], ["Fair Trade", "FAIR_TRADE"]],
  ["Capital & Shareholder Returns", ["Issuance Docs", "ISSUANCE"], ["Ownership Disclosure", "OWNERSHIP"], ["Investment Funds", "FUND"], ["Asset Securitization", "SECURITIZATION"]],
  ["Corporate Events & Control", ["Major Management Matters", "MATERIAL_EVENT"], ["Listing/Delisting", "EXCHANGE"], ["Other", "OTHER"]],
] as const;

function dateBefore(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

function FilingRows({ stockCode, filters }: { stockCode?: string; filters: FilingFiltersValue }) {
  const { pathname } = useLocation();
  const state = useCursorPage(
    (cursor, signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ stockCode, from: filters.from || null, to: filters.to || null, types: filters.types.length ? filters.types.join(",") : null, cursor, limit: 20 })}`, { signal }),
    [stockCode, filters.from, filters.to, filters.types.join(",")],
    (item) => item.receiptNumber,
  );
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=disclosure`
    : pathname;

  const groups = new Map<string, Filing[]>();
  for (const filing of state.data?.items ?? []) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
  return <RemoteState {...state} empty={(value) => !value.items.length}>
    {() => <><div className="disclosure-rows">
      {[...groups.entries()].map(([day, rows]) => (
        <section key={day}>
          <header>
            <span>{formatDate(day, false)}</span>
            <span>{rows.length} filings</span>
          </header>
          {rows.map((filing) => (
              <Link
                to={`/disclosures/${filing.receiptNumber}`}
                state={{ returnTo }}
                onClick={() => window.scrollTo(0, 0)}
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
    </div><ViewMoreButton resource="filings" hasMore={Boolean(state.data?.nextCursor)} loading={state.loadingMore} error={state.loadMoreError} onClick={() => void state.loadMore()} /></>}
  </RemoteState>;
}

export function DisclosurePage() {
  const [filters, setFilters] = useState<FilingFiltersValue>({ from: "", to: "", types: [] });
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
        <FilingFilters value={filters} onChange={setFilters} />
        <FilingRows filters={filters} />
      </main>
    </div>
  );
}

function FilingFilters({ value, onChange }: { value: FilingFiltersValue; onChange: (value: FilingFiltersValue) => void }) {
  const selectedRange = [["1D", 1], ["1W", 7], ["1M", 30], ["3M", 90], ["1Y", 365]].find(([, days]) => value.from === dateBefore(Number(days)) && value.to === new Date().toISOString().slice(0, 10))?.[0];
  const setRange = (days: number) => onChange({ ...value, from: dateBefore(days), to: new Date().toISOString().slice(0, 10) });
  const toggleType = (type: string) => onChange({ ...value, types: value.types.includes(type) ? value.types.filter((item) => item !== type) : [...value.types, type] });
  return (
    <section className="filing-filters">
      <div className="filing-filter-heading">
        <span>Date range</span>
        <button type="button" className="reset" onClick={() => onChange({ from: "", to: "", types: [] })}>
          Reset
        </button>
      </div>
      <div className="date-filter">
        <input type="date" value={value.from} onChange={(event) => onChange({ ...value, from: event.target.value })} aria-label="Start date" />
        <b>–</b>
        <input type="date" value={value.to} onChange={(event) => onChange({ ...value, to: event.target.value })} aria-label="End date" />
        {[["1D", 1], ["1W", 7], ["1M", 30], ["3M", 90], ["1Y", 365]].map(([item, days]) => (
          <button
            type="button"
            className={selectedRange === item ? "active" : ""}
            onClick={() => setRange(Number(days))}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      {DISCLOSURE_FILTERS.map((group) => (
        <div className="checkbox-row" key={group[0]}>
          <span>{group[0]}</span>
          {group.slice(1).map(([label, type]) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={value.types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {label}
            </label>
          ))}
        </div>
      ))}
    </section>
  );
}

export function StockDisclosureFeed() {
  const { stockCode } = useParams();
  const [filters, setFilters] = useState<FilingFiltersValue>({ from: "", to: "", types: [] });
  return (
    <>
      <FilingFilters value={filters} onChange={setFilters} />
      <FilingRows stockCode={stockCode} filters={filters} />
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
                {filing?.officialUrl ? <a href={filing.officialUrl} target="_blank" rel="noreferrer">
                  <img src="/assets/download.svg" alt="" /> Open original
                </a> : <span>Original document unavailable</span>}
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
                <span>{filing?.type || "Type unavailable"}</span>
                <span>{filing?.documentStatus || "Status unavailable"}</span>
                <span>{filing?.indexStatus || "Index unavailable"}</span>
                {filing?.correction ? <span>Correction</span> : null}
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
                <button type="button" aria-label="Print" onClick={() => window.print()}>
                  <img src="/assets/print.svg" alt="" />
                </button>
                <button type="button" aria-label="Share" onClick={() => void sharePage(filing?.titleEn || filing?.titleKo || "KART disclosure")}>
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

async function sharePage(title: string) {
  if (navigator.share) {
    await navigator.share({ title, url: window.location.href });
    return;
  }
  await navigator.clipboard.writeText(window.location.href);
}

function DisclosureSection({ receiptNumber, section }: { receiptNumber: string; section: FilingSection }) {
  const translation = useRemote((signal) => api<TranslationResult>(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`, { signal }), [receiptNumber, section.id]);
  const translated = translation.data?.status === "READY" ? translation.data.result : null;
  const requestTranslation = () => void api<TranslationResult>(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`, { method: "POST" }).then(translation.setData);
  useEffect(() => {
    if (translation.data?.status !== "PENDING" && translation.data?.status !== "PROCESSING") return;
    const timer = window.setTimeout(translation.retry, 2500);
    return () => window.clearTimeout(timer);
  }, [translation.data?.status, translation.retry]);
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
