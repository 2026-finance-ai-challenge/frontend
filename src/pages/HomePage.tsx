import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Footer, Header, MarketBar } from "../components/Layout";
import { TaxEligibilityPanel } from "../components/TaxEligibilityPanel";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import type { Filing, NewsArticle, Stock, StockDetail, SupportedCountry } from "../types";
import { isPublishedFiling, type PublishedFiling } from "../utils/disclosure";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "../components/IntelligenceBadges";

const quickActions = [
  ["/assets/news.svg", "Today’s news", "/news"],
  ["/assets/filing.svg", "Dart filings", "/disclosures"],
  ["/assets/ownership.svg", "Foreigner ownership limits", "#foreign"],
  ["/assets/tax.svg", "Check my tax rate", "/tax"],
];

type ForeignMonitor = {
  stock: Stock;
  policy: { warningThreshold: number };
  warning: boolean;
  prediction: StockDetail["foreignLimitPrediction"];
};
type TaxEligibility = { countryCode: string; countryName: string; domesticDefaultRate: number; treatyDividendRate: number | null; treatyDataAvailable: boolean };

const ownershipLabels = {
  danger: "Near reached",
  warning: "Near cap",
  safe: "Open",
  unavailable: "Data unavailable",
};

function ownershipTone(item: ForeignMonitor): keyof typeof ownershipLabels {
  const ownership = item.stock.foreignOwnership;
  if (ownership?.status !== "AVAILABLE" || ownership.limitExhaustionRate == null || ownership.ownershipRate == null) {
    return "unavailable";
  }
  if (!item.warning) return "safe";
  return ownership.limitExhaustionRate >= 100 ? "danger" : "warning";
}

export function HomePage() {
  const { locale } = useLocale();
  const [taxAgentOpen, setTaxAgentOpen] = useState(false);
  const [ownershipStart, setOwnershipStart] = useState(0);
  const [newsStart, setNewsStart] = useState(0);
  const newsState = useCursorPage(
    (cursor, signal) => api<{ items: NewsArticle[]; nextCursor: string | null }>(`/api/v1/news${queryString({ sort: "IMPORTANCE", cursor, limit: 20 })}`, { signal }),
    [],
    (item) => item.id,
  );
  const filingsState = useCursorPage(
    (cursor, signal) => api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ cursor, limit: cursor ? 20 : 4 })}`, { signal }),
    [],
    (item) => item.receiptNumber,
  );
  const ownershipState = useRemote(
    (signal) => api<ForeignMonitor[]>("/api/v1/market/foreign-limits", { signal }),
    [],
  );
  const taxRatesState = useRemote(async (signal) => {
    const supported = await api<SupportedCountry[]>("/api/v1/tax/countries", { signal });
    const country = supported.find((item) => item.countryCode === "US");
    if (!country) return [];
    return Promise.all([country].map((item) => api<TaxEligibility>("/api/v1/tax/eligibility", {
      method: "POST",
      signal,
      body: JSON.stringify({ residencyCountry: item.countryCode, investorType: "INDIVIDUAL" }),
    })));
  }, []);
  const eligibilityButtonRef = useRef<HTMLButtonElement>(null);
  const closeTaxAgent = () => {
    setTaxAgentOpen(false);
    window.requestAnimationFrame(() => eligibilityButtonRef.current?.focus());
  };
  const ownershipItems = ownershipState.data ?? [];
  const newsItems = newsState.data?.items ?? [];
  const visibleNews = newsItems.slice(newsStart, newsStart + 2);
  const visibleOwnership = ownershipItems.length
    ? Array.from({ length: Math.min(4, ownershipItems.length) }, (_, index) =>
        ownershipItems[(index + ownershipStart) % ownershipItems.length],
      )
    : [];
  const filingGroups = useMemo(() => {
		const groups = new Map<string, PublishedFiling[]>();
    for (const filing of (filingsState.data?.items ?? []).filter(isPublishedFiling)) {
      const day = filing.filedDate;
      groups.set(day, [...(groups.get(day) ?? []), filing]);
    }
    return [...groups.entries()];
  }, [filingsState.data]);

  return (
    <div className={`app-page home-page ${taxAgentOpen ? "agent-open" : ""}`}>
      <div className="hero-surface">
        <Header />
        <MarketBar />
        <main className="page-shell hero-content">
          <h1>
            {locale === "ko" ? <>한국 시장 <u>분석</u>,<br />규제</> : <>Korea <u>analysis</u>,<br />regulation</>}{" "}
            <sup>
              <img src="/assets/hero-marker.svg" alt="KART" />
            </sup>
            <br />
            {locale === "ko" ? <>&amp; 투자 <u>인텔리전스</u></> : <>&amp; trading <u>Intelligence</u></>}
          </h1>
          <div className="quick-actions">
            {quickActions.map(([icon, label, to], index) => (
              <Link to={to} key={label}>
                <img src={icon} alt="" />
                {locale === "ko" ? ["오늘의 뉴스", "DART 공시", "외국인 보유 한도", "내 세율 확인"][index] : label}
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
                {locale === "ko" ? "AI 뉴스 요약" : "AI News Summary"} <span>· {locale === "ko" ? "실시간" : "Real-time"}</span>
              </h2>
              <p>
                {locale === "ko" ? "카드에서 무엇·이유·영향 요약을 확인하세요." : "Hover a card to reveal the What / Why / Impact summary."}
                <br />
                {locale === "ko" ? "화살표로 뉴스를 한 건씩 탐색할 수 있습니다." : "Use the arrows to move through the feed one story at a time."}
              </p>
            </div>
            <div className="slider-controls">
              <button type="button" aria-label="Previous story" disabled={newsStart === 0} onClick={() => setNewsStart((current) => Math.max(0, current - 1))}>
                <img src="/assets/carousel-prev.svg" alt="" />
              </button>
              <button type="button" aria-label="Next story" disabled={newsStart + 2 >= newsItems.length} onClick={() => setNewsStart((current) => current + 1)}>
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...newsState} empty={(value) => !value.items.length}>
            {(value) => <div className="news-grid">
              {visibleNews.map((article) => <HomeNewsCard article={article} key={article.id} />)}
            </div>}
          </RemoteState>
          <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
        </section>

        <section className="section-block filing-section">
          <div className="section-heading">
            <div>
              <h2>{locale === "ko" ? "DART 공시 동향" : "DART filings pulse"}</h2>
              <p>{locale === "ko" ? <>최신 공시를 제출 시각과 함께 한 줄씩 확인하고<br />기업명과 공시 제목을 바로 비교하세요.</> : <>One filing per row, newest first submission date and time<br />on the left, company and title on the right.</>}</p>
            </div>
          </div>
          <div className="filing-table">
            <RemoteState {...filingsState} empty={(value) => !value.items.length}>
              {() => <>{filingGroups.map(([day, items]) => <div key={day}>
                <div className="table-day"><span>{formatDate(day, false)}</span><span>{items.length}{locale === "ko" ? "건" : " filings"}</span></div>
                {items.map((filing) => <FilingRow filing={filing} key={filing.receiptNumber} />)}
              </div>)}</>}
            </RemoteState>
            <ViewMoreButton resource="filings" hasMore={Boolean(filingsState.data?.nextCursor)} loading={filingsState.loadingMore} error={filingsState.loadMoreError} className="view-all" onClick={() => void filingsState.loadMore()} />
          </div>
        </section>

        <section className="section-block ownership-section" id="foreign">
          <div className="section-heading">
            <div>
              <h2>{locale === "ko" ? "외국인 보유 한도" : "Foreign ownership limit gauge"}</h2>
              <p>{locale === "ko" ? <>아래 종목은 외국인 보유 법정 한도가 적용됩니다.<br />현재 사용률과 주문 제한까지 남은 여유를 확인하세요.</> : <>The monitored Korean stocks below carry a statutory cap on foreign ownership.<br />Filter by status, then read how much headroom is left before orders start getting rejected.</>}</p>
              <div className="status-copy">
                <span>
                  <b className="danger-text">{ownershipItems.filter((item) => ownershipTone(item) === "danger").length}</b> <u>{locale === "ko" ? "한도 도달" : "At the cap"}</u>&nbsp; {locale === "ko" ? "현재 매수 주문 제한" : "Buy orders rejected right now."}
                </span>
                <span>
                  <b className="warning-text">{ownershipItems.filter((item) => ownershipTone(item) === "warning").length}</b> <u>{locale === "ko" ? "한도 근접" : "Near the cap"}</u>&nbsp; {locale === "ko" ? "한도의 90% 이상 사용" : "90% or more of the quota used."}
                </span>
                <span>
                  <b className="safe-text">{ownershipItems.filter((item) => ownershipTone(item) === "safe").length}</b> <u>{locale === "ko" ? "여유" : "Open"}</u>&nbsp; {locale === "ko" ? "한도 내 매수 가능" : "Room to buy without restriction."}
                </span>
              </div>
            </div>
            <div className="slider-controls ownership-controls">
              <button
                type="button"
                aria-label="Previous ownership card"
                disabled={ownershipStart === 0 || ownershipItems.length === 0}
                onClick={() =>
                  setOwnershipStart((current) =>
                    current === 0 ? ownershipItems.length - 1 : current - 1,
                  )
                }
              >
                <img
                  className={ownershipStart === 0 ? "" : "is-reversed"}
                  src={
                    ownershipStart === 0
                      ? "/assets/carousel-prev.svg"
                      : "/assets/carousel-next.svg"
                  }
                  alt=""
                />
              </button>
              <button
                type="button"
                aria-label="Next ownership card"
                onClick={() =>
                  setOwnershipStart(
                    (current) => ownershipItems.length ? (current + 1) % ownershipItems.length : 0,
                  )
                }
              >
                <img src="/assets/carousel-next.svg" alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...ownershipState} empty={(value) => !value.length}>
            {() => <div className="ownership-grid">
            {visibleOwnership.map((item) => {
              const used = item.prediction?.baseRate ?? item.stock.foreignOwnership?.ownershipRate ?? null;
              const cap = item.stock.foreignOwnership?.foreignLimitQuantity && item.stock.foreignOwnership?.totalListedQuantity
                ? item.stock.foreignOwnership.foreignLimitQuantity / item.stock.foreignOwnership.totalListedQuantity * 100
                : null;
              const tone = ownershipTone(item);
              const remaining = cap !== null && used !== null ? Math.max(cap - used, 0) : null;
              const exhaustion = cap !== null && used !== null && cap > 0 ? used / cap * 100 : null;
              const width = `${exhaustion == null ? 0 : Math.min(exhaustion, 100)}%`;

              return (
                <Link
                  className="ownership-card"
                  key={item.stock.stockCode}
                  to={`/stocks/${item.stock.stockCode}`}
                >
                  <div className="card-title">
                    <span className={tone}>
                      {tone === "danger" ? (
                        <img src="/assets/status-warning.svg" alt="" />
                      ) : null}
                      {locale === "ko" ? ({ danger: "한도 도달", warning: "한도 근접", safe: "여유", unavailable: "데이터 없음" } as const)[tone] : ownershipLabels[tone]}
                    </span>
                    <div>
                      <h3>{item.stock.nameEn || item.stock.nameKo}</h3>
                      <p>{item.stock.stockCode} · {item.stock.sector || item.stock.market}</p>
                    </div>
                  </div>
                  <strong className={tone}>
                    {remaining === null ? locale === "ko" ? "정보 없음" : "Unavailable" : remaining.toFixed(2)}
                    <small>{remaining === null ? locale === "ko" ? "확인된 보유 현황 없음" : "No verified ownership snapshot" : locale === "ko" ? "% 잔여" : "% remaining"}</small>
                  </strong>
                  <div className={`gauge gauge-${tone}`}>
                    <span className={tone} style={{ width }} />
                    <i style={{ left: width }} />
                  </div>
                  <div className="gauge-labels">
                    <span>{locale === "ko" ? "사용" : "Used"} {used === null ? locale === "ko" ? "정보 없음" : "Unavailable" : `${used.toFixed(2)}%`}</span>
                    <span>{locale === "ko" ? "한도" : "Cap"} {cap === null ? locale === "ko" ? "정보 없음" : "Unavailable" : `${cap.toFixed(2)}%`}</span>
                  </div>
                </Link>
              );
            })}
          </div>}
          </RemoteState>
        </section>

        <section className="section-block tax-section">
          <div className="section-heading">
            <div>
              <h2>{locale === "ko" ? "배당 원천징수 세율" : "Dividend withholding tax"}</h2>
              <p>{locale === "ko" ? <>한국 기본세율과 거주국 조세조약 세율을 비교하세요.<br />인하 세율은 지급 전 요건 확인과 서류 제출이 필요합니다.</> : <>Compare Korea’s domestic default with the published treaty rate for your residence.<br />A reduced rate is conditional and must be confirmed before payment.</>}</p>
            </div>
          </div>
          <div className="tax-grid">
            <article className="tax-card">
              <div className="tax-rates">
                <div>
                  <span>{locale === "ko" ? "기본세율" : "Default rate"}</span>
                  <strong>
                    {taxRatesState.data?.[0]?.domesticDefaultRate ?? "—"}<small>%</small>
                  </strong>
                  <small>{locale === "ko" ? "국세 20% + 지방소득세 2%" : "20% national + 2% local surtax"}</small>
                </div>
                <b>›</b>
                <div>
                  <span>{locale === "ko" ? "조약세율 시작" : "Treaty rate starts"}</span>
                  <strong className="safe-text">
                    {taxRatesState.data?.[0]?.treatyDividendRate ?? "—"}<small>%</small>
                  </strong>
                  <small>{locale === "ko" ? "대부분 조약의 포트폴리오 배당" : "Portfolio dividends, most treaties"}</small>
                </div>
              </div>
              <p>{locale === "ko" ? <>인하 세율은 <b>자동 적용되지 않습니다.</b> 배당 지급일 전에 증권사가 제한세율 적용신청서와 거주자증명서를 보유해야 합니다. 사전 신청을 놓쳤다면 법정 기간 안에 환급을 청구할 수 있습니다.</> : <>The reduced rate is <b>not applied automatically.</b> Your broker must hold an Application for Reduced Tax Rate and a Certificate of Residence before the dividend payment date. Without a pre-filed application, a refund claim may still be possible within the statutory period.</>}</p>
              <button
                className="primary-button eligibility-button"
                type="button"
                aria-expanded={taxAgentOpen}
                aria-controls="tax-eligibility-panel"
                onClick={() => setTaxAgentOpen(true)}
                ref={eligibilityButtonRef}
              >
                {locale === "ko" ? "적용 가능 여부 확인" : "Check eligibility"}
                <img src="/assets/chevron-right-gold.svg" alt="" />
              </button>
            </article>
            <article className="treaty-card">
              <div className="treaty-head">
                <span>{locale === "ko" ? "거주 국가" : "Country of residence"}</span>
                <span>{locale === "ko" ? "기본" : "Default"}</span>
                <span>{locale === "ko" ? "조약" : "Treaty"}</span>
                <span>{locale === "ko" ? "차이" : "Difference"}</span>
              </div>
              {taxRatesState.data?.map((rate) => {
                const difference = rate.treatyDividendRate === null ? null : rate.treatyDividendRate - rate.domesticDefaultRate;
                const row = [rate.countryName, `${rate.domesticDefaultRate}%`, rate.treatyDividendRate === null ? "Unavailable" : `${rate.treatyDividendRate}%`, difference === null ? "—" : `${difference.toFixed(1)}pp`];
                return <div key={rate.countryCode}>
                  {row.map((cell, i) => (
                    <span className={i === 3 ? "safe-text" : ""} key={cell}>
                      {cell}
                    </span>
                  ))}
                </div>;
              })}
              {["Additional treaty data", "Additional treaty data", "Additional treaty data", "Additional treaty data"].map((label, index) => (
                <div className="treaty-row-locked" aria-label="Additional country treaty data unavailable" key={`${label}-${index}`}>
                  <span>{label}</span><span>—</span><span>—</span><span>—</span>
                </div>
              ))}
              {taxRatesState.error ? <div className="api-state api-error">Treaty rate data unavailable.</div> : null}
            </article>
          </div>
          <p className="tax-note">{locale === "ko" ? "개인 포트폴리오 배당의 일반 조약세율입니다. 실제 적용 세율은 증권사에 확인하세요. 세무 자문이 아닙니다." : "Standard treaty rates for individual portfolio dividends. Your rate may differ—confirm with your broker. Not tax advice."}</p>
        </section>
      </main>
      <Footer />
      {taxAgentOpen ? <TaxEligibilityPanel close={closeTaxAgent} /> : null}
    </div>
  );
}

function FilingRow({ filing }: { filing: PublishedFiling }) {
  const { locale, stockName } = useLocale();
  return (
    <Link
      className="filing-row"
      to={`/disclosures/${filing.receiptNumber}`}
    >
      <img
        className="filing-timeline-dot"
        src="/assets/timeline-neutral.svg"
        alt=""
      />
      <span>{formatDate(filing.detectedAt)}</span>
      <span>
        <b>{stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo })}</b>
        <small>{filing.stockCode} · {filing.market}</small>
      </span>
      <strong>{locale === "ko" ? filing.titleKo : filing.titleEn || filing.titleKo}</strong>
      <span className="filing-row-badges"><IntelligenceBadges sentiment={filing.sentiment} importance={filing.importance} eventType={filing.eventType} /></span>
    </Link>
  );
}

function HomeNewsCard({ article }: { article: NewsArticle }) {
  const { locale, t } = useLocale();
  const translation = useAutomaticTranslation(`/api/v1/news/${article.id}/translation`, locale === "en");
  const insight = translation.data?.status === "READY" ? translation.data.result : null;
  return <Link className="news-card" to={`/news/${article.id}`}>
    <IntelligenceBadges sentiment={article.sentiment} importance={article.importance} eventType={article.eventType} />
    <h3>{locale === "ko" ? article.originalTitle : article.englishTitle || article.originalTitle}</h3>
    <p className="meta">{formatDate(article.publishedAt)} · {article.publisher}</p>
    <NewsThumbnail src={article.thumbnailUrl} />
    <div className="insight">
      <p><b>{t("what")}</b>{insight?.what || article.what || (locale === "ko" ? "요약 준비 중…" : "Preparing verified insight…")}</p>
      <p><b>{t("why")}</b>{insight?.why || article.why || (locale === "ko" ? "요약 준비 중…" : "Preparing verified insight…")}</p>
      <p><b>{t("impact")}</b>{insight?.impact || article.impact || (locale === "ko" ? "요약 준비 중…" : "Preparing verified insight…")}</p>
    </div>
  </Link>;
}
