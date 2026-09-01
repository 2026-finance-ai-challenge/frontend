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
import { isPublishedFiling, type PublishedFiling } from "../utils/disclosure";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { FitText } from "../components/FitText";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SelectionAssistant, useSelectionAssistant } from "../components/SelectionAssistant";
import { hasVerifiedEnglishTitle, isVerifiedEnglish, verifiedEnglishText } from "../utils/english";
import { adaptiveTextClass } from "../utils/text";

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
  const { locale, stockName } = useLocale();
  const { pathname } = useLocation();
  const state = useCursorPage(
    (cursor, signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ stockCode, from: filters.from || null, to: filters.to || null, types: filters.types.length ? filters.types.join(",") : null, cursor, limit: 20 })}`, { signal }),
    [stockCode, filters.from, filters.to, filters.types.join(",")],
    (item) => item.receiptNumber,
  );
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=disclosure`
    : pathname;

	const groups = new Map<string, PublishedFiling[]>();
	for (const filing of (state.data?.items ?? []).filter(isPublishedFiling).filter(hasVerifiedEnglishTitle)) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
  return <RemoteState {...state} empty={(value) => !value.items.length}>
    {() => <><div className="disclosure-rows">
      {[...groups.entries()].map(([day, rows]) => (
        <section key={day}>
          <header>
            <span>{formatDate(day, false)}</span>
            <span>{locale === "ko" ? `공시 ${rows.length}건` : `${rows.length} filings`}</span>
          </header>
          {rows.map((filing) => {
            const title = locale === "ko" ? filing.titleKo : verifiedEnglishText(filing.titleEn) || "";
            const issuer = stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo });
            return (
              <Link
                to={`/disclosures/${filing.receiptNumber}`}
                state={{ returnTo }}
                onClick={() => window.scrollTo(0, 0)}
                key={filing.receiptNumber}
              >
                <span>{formatDate(filing.detectedAt)}</span>
                <i className={filing.correction ? "red" : "neutral"} />
                <span>
                  <FitText className="filing-issuer" value={issuer} />
                  <small>{filing.stockCode} · {filing.market}</small>
                </span>
                <strong className={adaptiveTextClass(title, "filing-title")}>{title}</strong>
                <span className="filing-row-badges"><IntelligenceBadges variant="filing" sentiment={filing.sentiment} importance={filing.importance} eventType={filing.eventType} /></span>
              </Link>
            );
          })}
        </section>
      ))}
    </div><ViewMoreButton resource="filings" hasMore={Boolean(state.data?.nextCursor)} loading={state.loadingMore} error={state.loadMoreError} onClick={() => void state.loadMore()} /></>}
  </RemoteState>;
}

export function DisclosurePage() {
  const { locale, t } = useLocale();
  const [filters, setFilters] = useState<FilingFiltersValue>({ from: "", to: "", types: [] });
  return (
    <div className="disclosure-page disclosure-index-page">
      <Header white />
      <main className="page-shell disclosure-index-main">
        <BackLink to="/" />
        <h1>{t("filings")}</h1>
        <p className="disclosure-index-description">
          {locale === "ko" ? "공시 원문을 바탕으로 무엇·이유·영향을 요약하고 후속 질문에 답합니다." : "Disclosures summarised into What / Why / Impact, with an agent that answers follow-up questions from the original text."}
        </p>
        <FilingFilters value={filters} onChange={setFilters} />
        <FilingRows filters={filters} />
      </main>
    </div>
  );
}

function FilingFilters({ value, onChange }: { value: FilingFiltersValue; onChange: (value: FilingFiltersValue) => void }) {
  const { locale } = useLocale();
  const selectedRange = [["1D", 1], ["1W", 7], ["1M", 30], ["3M", 90], ["1Y", 365]].find(([, days]) => value.from === dateBefore(Number(days)) && value.to === new Date().toISOString().slice(0, 10))?.[0];
  const setRange = (days: number) => onChange({ ...value, from: dateBefore(days), to: new Date().toISOString().slice(0, 10) });
  const toggleType = (type: string) => onChange({ ...value, types: value.types.includes(type) ? value.types.filter((item) => item !== type) : [...value.types, type] });
  return (
    <section className="filing-filters">
      <div className="filing-filter-heading">
        <span>{locale === "ko" ? "기간" : "Date range"}</span>
        <button type="button" className="reset" onClick={() => onChange({ from: "", to: "", types: [] })}>
          {locale === "ko" ? "초기화" : "Reset"}
        </button>
      </div>
      <div className="date-filter">
        <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}" value={value.from} onChange={(event) => onChange({ ...value, from: event.target.value })} aria-label={locale === "ko" ? "시작일" : "Start date"} />
        <b>–</b>
        <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}" value={value.to} onChange={(event) => onChange({ ...value, to: event.target.value })} aria-label={locale === "ko" ? "종료일" : "End date"} />
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
          <span>{locale === "ko" ? disclosureFilterKo(group[0]) : group[0]}</span>
          {group.slice(1).map(([label, type]) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={value.types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {locale === "ko" ? disclosureFilterKo(label) : label}
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
  const { locale, t, stockName } = useLocale();
  const location = useLocation();
  const { disclosureId = "" } = useParams();
  const detailState = useRemote((signal) => api<FilingDetail>(`/api/v1/disclosures/${disclosureId}`, { signal }), [disclosureId]);
  const insightState = useRemote((signal) => api<FilingInsight>(`/api/v1/disclosures/${disclosureId}/insight`, { signal }), [disclosureId]);
  const filing = detailState.data;
  const englishTitle = verifiedEnglishText(filing?.titleEn);
  const insight = insightState.data && (locale === "ko" || isVerifiedEnglish({
    what: insightState.data.what,
    why: insightState.data.why,
    impact: insightState.data.impact,
    refusalReason: insightState.data.refusalReason,
  })) ? insightState.data : null;
  const [indexRequested, setIndexRequested] = useState(false);
  const [automaticError, setAutomaticError] = useState("");
  const selectionAssistant = useSelectionAssistant<HTMLDivElement>();
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
      .catch((reason: unknown) => setAutomaticError(reason instanceof Error ? reason.message : locale === "ko" ? "문서 색인을 요청하지 못했습니다." : "Document indexing could not be requested."));
  }, [disclosureId, filing, locale]);

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
      .catch((reason: unknown) => setAutomaticError(locale === "ko" ? "AI 요약을 생성하지 못했습니다." : reason instanceof Error ? reason.message : "AI insight could not be generated."));
  }, [disclosureId, filing?.indexStatus, insightState.data, insightState.error?.code, insightState.loading, insightState.setData, locale]);

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
                    {filing ? stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo }) : locale === "ko" ? "공시를 불러오는 중…" : "Loading filing…"}
                  </span>
                  <span>{filing?.stockCode || "—"}</span>
                  <span>{filing?.market || "—"}</span>
                </div>
                <h1 className={((locale === "ko" ? filing?.titleKo : englishTitle) || "").length > 70 ? "is-long-title" : ""}>
                  {locale === "ko" ? filing?.titleKo || "공시를 불러오는 중…" : englishTitle || "Loading disclosure…"}
                </h1>
              </div>
              <div>
                {filing?.officialUrl ? <a href={filing.officialUrl} target="_blank" rel="noreferrer">
                  <img src="/assets/download.svg" alt="" /> {t("openOriginal")}
                </a> : <span>{locale === "ko" ? "원문을 사용할 수 없습니다" : "Original document unavailable"}</span>}
                <small>{locale === "ko" ? "제출" : "Submitted"}: {formatDate(filing?.detectedAt)}</small>
              </div>
            </div>
            <div className="filing-meta">
              <span>
                {t("reporter")}<b>{locale === "ko" ? filing?.submitter || "정보 없음" : filing?.issuerNameEn || "Unavailable"}</b>
              </span>
              <span>
                {t("receiver")}<b>{locale === "ko" ? filing?.receiverKo : filing?.receiverEn}</b>
              </span>
              <span>
                {t("documentNo")}<b>{filing?.receiptNumber || disclosureId}</b>
              </span>
            </div>
          </div>
        </div>
        <main className="page-shell filing-body-shell">
          <div className="filing-summary-grid">
            <section className="ai-summary">
                <h2>
                  {t("aiSummary")}{" "}
                  <img src="/assets/agent-badge-figma.svg" alt="AI" />
                </h2>
                {insight?.sufficientEvidence ? [
                  [t("what"), insight.what],
                  [t("why"), insight.why],
                  [t("impact"), insight.impact],
                ].map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1]}</span>
                  </p>
                )) : automaticError ? <div className="api-state api-error">{automaticError}</div> : <LoadingSkeleton lines={3} className="summary-panel-skeleton" />}
            </section>
            <aside className="mentioned filing-division">
              <h2>{t("division")}</h2>
              <IntelligenceBadges sentiment={filing?.sentiment} importance={filing?.importance} eventType={filing?.eventType} />
            </aside>
          </div>
          <section className="translation">
            <h2>
              <span>
                <img src="/assets/translation-figma.svg" alt="" />
                {locale === "ko" ? t("koreanOriginal") : t("englishTranslation")}
              </span>
              <span className="translation-actions">
                <button type="button" aria-label={locale === "ko" ? "인쇄" : "Print"} onClick={() => window.print()}>
                  <img src="/assets/print.svg" alt="" />
                </button>
                <button type="button" aria-label={locale === "ko" ? "공유" : "Share"} onClick={() => void sharePage(filing?.titleEn || "KART disclosure")}>
                  <img src="/assets/share.svg" alt="" />
                </button>
              </span>
            </h2>
            <button className="selection-hint" onClick={() => openKAgent({ contextType: "FILING", referenceId: disclosureId, prompt: "Explain the important terms and practical impact of this filing." })}>
              <img src="/assets/selection-info-figma.svg" alt="" /> {locale === "ko" ? "궁금한 내용을 선택해 AI에게 물어보세요." : "Drag over any highlighted term to look it up."}
            </button>
            <div
              className="disclosure-copy selection-surface"
              ref={selectionAssistant.containerRef}
              onMouseUp={selectionAssistant.captureSelection}
            >
              <RemoteState {...detailState}>
                {(value) => locale === "ko"
                  ? <div className="dart-original-documents">{value.documents.map((document) => document.originalHtml ? <DartOriginalDocument html={document.originalHtml} key={document.id} /> : <div className="disclosure-structured-body" key={document.id}>{document.sections.map((section) => <OriginalDisclosureSection section={section} key={section.id} />)}</div>)}</div>
                  : <div className="disclosure-structured-body">{value.documents.flatMap((document) => document.sections).map((section) => <DisclosureSection receiptNumber={disclosureId} section={section} key={section.id} />)}</div>}
              </RemoteState>
              <SelectionAssistant
                selection={selectionAssistant.selection}
                prompt={locale === "ko" ? "이 내용이 궁금한가요?" : "Want to know what this means?"}
                actionLabel={locale === "ko" ? "질문하기" : "Click"}
                onAsk={(selectedText) => openKAgent({ contextType: "FILING", referenceId: disclosureId, prompt: locale === "ko" ? `이 공시에서 “${selectedText}”의 뜻과 투자 영향을 한국어로 설명해줘.` : `Explain “${selectedText}” and its investment impact in this filing.` })}
              />
            </div>
          </section>
          <DisclosureQuestionBox receiptNumber={disclosureId} ready={filing?.indexStatus === "READY"} />
        </main>
      </div>
    </div>
  );
}

function disclosureFilterKo(value: string) {
  return ({
    "Reporting & Governance": "보고·지배구조", "Periodic Reports": "정기보고서", "Audit Reports": "감사보고서", "Fair Trade": "공정거래",
    "Capital & Shareholder Returns": "자본·주주환원", "Issuance Docs": "발행공시", "Ownership Disclosure": "지분공시", "Investment Funds": "펀드", "Asset Securitization": "자산유동화",
    "Corporate Events & Control": "주요 경영·지배권", "Major Management Matters": "주요경영사항", "Listing/Delisting": "상장·상장폐지", "Other": "기타",
  } as Record<string, string>)[value] || value;
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
  const translation = useAutomaticTranslation(`/api/v1/disclosures/${receiptNumber}/sections/${section.id}/translation`);
  const translated = translation.data?.status === "READY" && isVerifiedEnglish(translation.data.result)
    ? translation.data.result
    : null;
  const pending = (
    translation.loading
    || translation.requesting
    || translation.data?.status === "NOT_REQUESTED"
    || translation.data?.status === "PENDING"
    || translation.data?.status === "PROCESSING"
  );
  return <section id={`section-${section.id}`} aria-busy={pending}>
    {translated?.translatedHeading ? <h3>{translated.translatedHeading}</h3> : null}
    {translated?.translatedTableData
      ? <StructuredTable data={translated.translatedTableData} />
      : translated?.translatedText
        ? <p>{translated.translatedText}</p>
        : pending
          ? <LoadingSkeleton lines={section.tableData ? 5 : 3} className="disclosure-section-skeleton" />
          : <div className="api-state api-error">Translation generation failed and no cache was stored.</div>}
    {translation.requestError ? <small className="translation-status-error">{translation.requestError.message}</small> : null}
  </section>;
}

function DartOriginalDocument({ html }: { html: string }) {
  return <article className="dart-original-html" dangerouslySetInnerHTML={{ __html: html }} />;
}

function OriginalDisclosureSection({ section }: { section: FilingSection }) {
  return <section>
    {section.heading ? <h3>{section.heading}</h3> : null}
    {section.kind === "TABLE" ? <StructuredTable data={section.tableData} /> : <p>{section.text}</p>}
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
  const { locale } = useLocale();
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
  return <section className="disclosure-question"><h2>{locale === "ko" ? "공시에 대해 질문하기" : "Ask about this filing"}</h2><p>{locale === "ko" ? "현재 공시 버전에서 색인된 원문만 근거로 답합니다." : "Answers are restricted to indexed sections of the current disclosure version."}</p><form onSubmit={(event) => { event.preventDefault(); void ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={locale === "ko" ? "무엇이 바뀌었고 투자자에게 어떤 영향이 있나요?" : "What changed and how could it affect investors?"} disabled={!ready || busy} /><button disabled={!ready || !question.trim() || busy}>{busy ? locale === "ko" ? "근거 확인 중…" : "Checking sources…" : locale === "ko" ? "질문" : "Ask"}</button></form>{!ready ? <small>{locale === "ko" ? "근거 기반 질문은 문서 색인이 끝난 뒤 사용할 수 있습니다." : "The document must finish indexing before grounded questions are available."}</small> : null}{error ? <p className="auth-error">{error}</p> : null}{answer ? <blockquote><p>{answer.refused ? answer.refusalReason : answer.answer}</p>{answer.citations.map((citation) => <small key={citation.id}><b>{citation.heading || (locale === "ko" ? "원문 구간" : "Source section")}</b> {citation.excerpt}</small>)}</blockquote> : null}</section>;
}
