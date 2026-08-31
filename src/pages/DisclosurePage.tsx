import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { openKAgent } from "../agentEvents";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import type { Filing, FilingDetail } from "../types";

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
  const leadSection = filing?.documents
    .flatMap((document) => document.sections)
    .find((section) => section.kind === "TITLE")
    ?? filing?.documents.flatMap((document) => document.sections)[0];
  const leadTranslation = useAutomaticTranslation(
    leadSection
      ? `/api/v1/disclosures/${disclosureId}/sections/${leadSection.id}/translation`
      : `/api/v1/disclosures/${disclosureId}/sections/pending/translation`,
    Boolean(leadSection),
  );
  const translatedLead = leadTranslation.data?.status === "READY"
    ? leadTranslation.data.result
    : null;
  const [indexRequested, setIndexRequested] = useState(false);
  const [automaticError, setAutomaticError] = useState("");
  const indexRequest = useRef<string | null>(null);
  const insightRequest = useRef<string | null>(null);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ??
    "/disclosures";

  useEffect(() => {
    indexRequest.current = null;
    insightRequest.current = null;
    setIndexRequested(false);
    setAutomaticError("");
  }, [disclosureId]);

  useEffect(() => {
    if (!filing || filing.indexStatus === "READY" || filing.documentStatus !== "READY") return;
    if (indexRequest.current === disclosureId) return;
    indexRequest.current = disclosureId;
    setIndexRequested(true);
    void api(`/api/v1/disclosures/${disclosureId}/index`, { method: "POST" })
      .catch((reason: unknown) => setAutomaticError(reason instanceof Error ? reason.message : "Document indexing could not be requested."));
  }, [disclosureId, filing]);

  useEffect(() => {
    if (!indexRequested || !filing || filing.indexStatus === "READY") return;
    const timer = window.setTimeout(detailState.retry, 2_500);
    return () => window.clearTimeout(timer);
  }, [detailState.retry, filing, indexRequested]);

  useEffect(() => {
    if (filing?.indexStatus !== "READY" || insightState.loading || insightState.data) return;
    if (insightState.error?.code !== "DISCLOSURE_INSIGHT_NOT_READY") return;
    if (insightRequest.current === disclosureId) return;
    insightRequest.current = disclosureId;
    void api<FilingInsight>(`/api/v1/disclosures/${disclosureId}/insight`, { method: "POST" })
      .then(insightState.setData)
      .catch((reason: unknown) => setAutomaticError(reason instanceof Error ? reason.message : "AI insight could not be generated."));
  }, [disclosureId, filing?.indexStatus, insightState.data, insightState.error?.code, insightState.loading, insightState.setData]);

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
                  {translatedLead?.translatedHeading
                    || translatedLead?.translatedText
                    || filing?.titleEn
                    || filing?.titleKo
                    || "Loading disclosure…"}
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
                )) : <div className="api-state api-loading" role="status"><span>{automaticError || insightState.error?.message || insightState.data?.refusalReason || (filing?.indexStatus === "READY" ? "Generating the grounded What / Why / Impact summary…" : "Preparing the filing for translation and grounded insight…")}</span>{indexRequested && filing?.indexStatus !== "READY" ? <small>Indexing is in progress. This screen updates automatically.</small> : null}</div>}
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
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const translation = useAutomaticTranslation(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`, visible);
  const translated = translation.data?.status === "READY" ? translation.data.result : null;
  useEffect(() => {
    const target = sectionRef.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const pending = visible && (
    translation.loading
    || translation.requesting
    || translation.data?.status === "NOT_REQUESTED"
    || translation.data?.status === "PENDING"
    || translation.data?.status === "PROCESSING"
  );
  const table = translated?.translatedTableData ?? section.tableData;
  return <section id={`section-${section.id}`} ref={sectionRef} aria-busy={pending}>
    <h3>{translated?.translatedHeading || (pending ? "Translating section…" : section.heading || section.kind)}</h3>
    {translated?.translatedText
      ? <p>{translated.translatedText}</p>
      : translated?.translatedTableData
        ? <StructuredTable data={translated.translatedTableData} />
        : pending
          ? <div className="api-state api-loading" role="status">Loading the cached translation or generating it for the first view…</div>
          : section.kind === "TABLE"
            ? <><StructuredTable data={table} /><small className="translation-source-notice">Original Korean table shown because an English translation is unavailable.</small></>
            : <><p>{section.text || "Section text unavailable."}</p><small className="translation-source-notice">Original Korean source shown because an English translation is unavailable.</small></>}
    {translation.requestError ? <small className="translation-status-error">{translation.requestError.message}</small> : null}
  </section>;
}

function StructuredTable({ data }: { data: unknown }) {
  if (!Array.isArray(data) || !data.every(Array.isArray)) {
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }
  return <div className="disclosure-table-scroll"><table><tbody>{data.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell: unknown, cellIndex: number) => cellIndex === 0
    ? <th scope="row" key={cellIndex}>{String(cell ?? "")}</th>
    : <td key={cellIndex}>{String(cell ?? "")}</td>)}</tr>)}</tbody></table></div>;
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
