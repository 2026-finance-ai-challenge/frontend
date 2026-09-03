import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Footer, Header, MarketBar } from "../components/Layout";
import { TaxEligibilityLink } from "../components/TaxEligibilityLink";
import { openTaxEligibility } from "../agentEvents";
import { ForeignOwnershipCard, ownershipExhaustion } from "../components/ForeignOwnershipCard";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import { useOwnershipForecastWindow } from "../hooks/useOwnershipForecastWindow";
import { useMarketRefresh } from "../hooks/useMarketRefresh";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import type { Filing, ForeignLimitMonitor, NewsArticle, SupportedCountry } from "../types";
import { isPublishedFiling, type PublishedFiling } from "../utils/disclosure";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { FitText } from "../components/FitText";
import { FilingSentimentDot } from "../components/FilingSentimentDot";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { hasVerifiedEnglishTitle, verifiedEnglishText } from "../utils/english";
import { adaptiveTextClass } from "../utils/text";
import { generatedNewsInsight, hasCompleteNewsInsight, localizedNewsInsight } from "../utils/newsInsight";

const quickActions = [
  ["/assets/news.svg", "Today’s news", "/news"],
  ["/assets/filing.svg", "Dart filings", "/disclosures"],
  ["/assets/ownership.svg", "Foreigner ownership limits", "/foreign-limits"],
  ["/assets/tax.svg", "Check my tax rate", "/tax"],
];

type TaxEligibility = { countryCode: string; countryName: string; domesticDefaultRate: number; treatyDividendRate: number | null; treatyDataAvailable: boolean };

export function HomePage() {
  const { locale } = useLocale();
  const forecastWindow = useOwnershipForecastWindow();
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
    (signal) => api<ForeignLimitMonitor[]>("/api/v1/market/foreign-limits", { signal }),
    [forecastWindow.targetDate, forecastWindow.session],
  );
  useMarketRefresh(forecastWindow.targetDate, ownershipState.loading, ownershipState.retry, forecastWindow.session === "INTRADAY" ? 60_000 : 300_000);
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
  const ownershipItems = [...(ownershipState.data ?? [])].sort((a, b) => ownershipExhaustion(b) - ownershipExhaustion(a));
  const newsItems = (newsState.data?.items ?? []).filter(hasVerifiedEnglishTitle);
  const visibleNews = newsItems.slice(newsStart, newsStart + 2);
  const visibleOwnership = ownershipItems.slice(0, 3);
  const filingGroups = useMemo(() => {
		const groups = new Map<string, PublishedFiling[]>();
    for (const filing of (filingsState.data?.items ?? []).filter(isPublishedFiling).filter(hasVerifiedEnglishTitle)) {
      const day = filing.filedDate;
      groups.set(day, [...(groups.get(day) ?? []), filing]);
    }
    return [...groups.entries()];
  }, [filingsState.data]);

  return (
    <div className="app-page home-page">
      <div className="hero-surface">
        <Header />
        <MarketBar />
        <main className="page-shell hero-content">
          <h1>
            <span>{locale === "ko" ? "한국 시장 분석," : "Korea analysis,"}</span>
            <span>{locale === "ko" ? "규제" : "regulation"}</span>
            <span>{locale === "ko" ? "& 투자 인텔리전스" : "& trading Intelligence"}</span>
          </h1>
          <div className="quick-actions">
            {quickActions.map(([icon, label, to], index) => {
              const content = <><img src={icon} alt="" />{locale === "ko" ? ["오늘의 뉴스", "DART 공시", "외국인 보유 한도", "내 세율 확인"][index] : label}</>;
              return to === "/tax"
                ? <TaxEligibilityLink key={label}>{content}</TaxEligibilityLink>
                : <Link to={to} key={label}>{content}</Link>;
            })}
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
              <button type="button" aria-label={locale === "ko" ? "이전 뉴스" : "Previous story"} disabled={newsStart === 0} onClick={() => setNewsStart((current) => Math.max(0, current - 1))}>
                <img className={newsStart === 0 ? "" : "is-reversed"} src={newsStart === 0 ? "/assets/carousel-prev.svg" : "/assets/carousel-next.svg"} alt="" />
              </button>
              <button type="button" aria-label={locale === "ko" ? "다음 뉴스" : "Next story"} disabled={newsStart + 2 >= newsItems.length} onClick={() => setNewsStart((current) => current + 1)}>
                <img className={newsStart + 2 >= newsItems.length ? "is-reversed" : ""} src={newsStart + 2 >= newsItems.length ? "/assets/carousel-prev.svg" : "/assets/carousel-next.svg"} alt="" />
              </button>
            </div>
          </div>
          <RemoteState {...newsState} empty={(value) => !value.items.length}>
            {(value) => <div className="news-grid">
              {visibleNews.map((article) => <HomeNewsCard article={article} key={article.id} />)}
            </div>}
          </RemoteState>
          <Link className="section-view-link" to="/news">
            {locale === "ko" ? "뉴스 전체 보기" : "View more news"}<img src="/assets/chevron-right-gold.svg" alt="" />
          </Link>
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
                <div className="table-day"><span>{formatDate(day, false)}</span><span>{items[0]?.filedDateTotal ?? items.length}{locale === "ko" ? "건" : " filings"}</span></div>
                {items.map((filing) => <FilingRow filing={filing} key={filing.receiptNumber} />)}
              </div>)}</>}
            </RemoteState>
            <Link className="view-all" to="/disclosures">
              {locale === "ko" ? "전체 공시 보기" : "View all filings"}<img src="/assets/chevron-right-gold.svg" alt="" />
            </Link>
          </div>
        </section>

        <section className="section-block ownership-section" id="foreign">
          <div className="section-heading">
            <div>
              <h2>{locale === "ko" ? "외국인 보유 한도" : "Foreign ownership limit gauge"}</h2>
              <p>{locale === "ko" ? <>아래 종목은 외국인 보유 법정 한도가 적용됩니다.<br />현재 사용률과 주문 제한까지 남은 여유를 확인하세요.</> : <>The monitored Korean stocks below carry a statutory cap on foreign ownership.<br />Filter by status, then read how much headroom is left before orders start getting rejected.</>}</p>
              <div className="ownership-support-copy">
                <b>{ownershipState.data ? ownershipItems.length : "—"}</b><span>/ 33 {locale === "ko" ? "법정 한도 종목 지원 중" : "statutory-limit stocks supported"}</span>
              </div>
            </div>
            <Link className="icon-link" to="/foreign-limits">
              {locale === "ko" ? "전체 게이지 보기" : "View all gauge"}<img src="/assets/chevron-right-gold.svg" alt="" />
            </Link>
          </div>
          <RemoteState {...ownershipState} empty={(value) => !value.length}>
            {() => <div className="ownership-grid">
            {visibleOwnership.map((item) => <ForeignOwnershipCard item={item} key={item.stock.stockCode} />)}
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
                  <small>{locale === "ko" ? "지방소득세 포함" : "Including local surtax"}</small>
                </div>
                <b>›</b>
                <div>
                  <span>{locale === "ko" ? "조약세율 시작" : "Treaty rate starts"}</span>
                  <strong className="safe-text">
                    {taxRatesState.data?.[0]?.treatyDividendRate ?? "—"}<small>%</small>
                  </strong>
                  <small>{taxRatesState.data?.[0]?.countryName}</small>
                </div>
              </div>
              <p>{locale === "ko" ? <>인하 세율은 <b>자동 적용되지 않습니다.</b> 배당 지급일 전에 증권사가 제한세율 적용신청서와 거주자증명서를 보유해야 합니다. 사전 신청을 놓쳤다면 법정 기간 안에 환급을 청구할 수 있습니다.</> : <>The reduced rate is <b>not applied automatically.</b> Your broker must hold an Application for Reduced Tax Rate and a Certificate of Residence before the dividend payment date. Without a pre-filed application, a refund claim may still be possible within the statutory period.</>}</p>
              <button
                className="primary-button eligibility-button"
                type="button"
                aria-haspopup="dialog"
                aria-controls="tax-eligibility-panel"
                onClick={openTaxEligibility}
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
                const row = [rate.countryName, `${rate.domesticDefaultRate}%`, rate.treatyDividendRate === null ? locale === "ko" ? "정보 없음" : "Unavailable" : `${rate.treatyDividendRate}%`, difference === null ? "—" : `${difference.toFixed(1)}pp`];
                return <div key={rate.countryCode}>
                  {row.map((cell, i) => (
                    <span className={i === 3 ? "safe-text" : ""} key={cell}>
                      {cell}
                    </span>
                  ))}
                </div>;
              })}
              <section className="treaty-locked-preview">
                <div aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div className="treaty-row-locked" key={index}>
                      <span>{locale === "ko" ? "추가 국가 준비 중" : "More countries coming soon"}</span>
                      <span>—</span><span>—</span><span>—</span>
                    </div>
                  ))}
                </div>
                <p className="treaty-availability-note">{locale === "ko" ? "현재 서비스에서 지원하는 국가의 세율입니다. 추가 국가는 준비 중입니다." : "Rates for countries currently supported by this service. More countries are coming soon."}</p>
              </section>
              {taxRatesState.error ? <div className="api-state api-error">{locale === "ko" ? "조세조약 세율 데이터를 불러올 수 없습니다." : "Treaty rate data unavailable."}</div> : null}
            </article>
          </div>
          <p className="tax-note">{locale === "ko" ? "개인 포트폴리오 배당의 일반 조약세율입니다. 실제 적용 세율은 증권사에 확인하세요. 세무 자문이 아닙니다." : "Standard treaty rates for individual portfolio dividends. Your rate may differ—confirm with your broker. Not tax advice."}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FilingRow({ filing }: { filing: PublishedFiling }) {
  const { locale, stockName } = useLocale();
  const title = locale === "ko" ? filing.titleKo : verifiedEnglishText(filing.titleEn) || "";
  const issuer = stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo });
  return (
    <Link
      className="filing-row"
      to={`/disclosures/${filing.receiptNumber}`}
    >
      <FilingSentimentDot sentiment={filing.sentiment} />
      <span>{formatDate(filing.detectedAt)}</span>
      <span>
        <FitText className="filing-issuer" value={issuer} />
        <small>{filing.stockCode} · {filing.market}</small>
      </span>
      <strong className={adaptiveTextClass(title, "filing-title")}><span>{title}</span></strong>
      <span className="filing-row-badges"><IntelligenceBadges variant="filing" sentiment={filing.sentiment} importance={filing.importance} eventType={filing.eventType} /></span>
    </Link>
  );
}

function HomeNewsCard({ article }: { article: NewsArticle }) {
  const { locale, t } = useLocale();
  const [hovered, setHovered] = useState(false);
  const [insightRequested, setInsightRequested] = useState(false);
  useEffect(() => {
    if (!hovered || insightRequested) return;
    const timer = window.setTimeout(() => setInsightRequested(true), 300);
    return () => window.clearTimeout(timer);
  }, [hovered, insightRequested]);
  const translation = useAutomaticTranslation(
    `/api/v1/news/${article.id}/translation?locale=${locale}`,
    insightRequested,
  );
  const insight = generatedNewsInsight(translation.data, locale);
  const title = locale === "ko" ? article.originalTitle : verifiedEnglishText(article.englishTitle) || "";
  const wrappedTitle = Array.from(title).length > 34;
  const cachedInsight = localizedNewsInsight(article, locale);
  const readyInsight = insight && hasCompleteNewsInsight(insight) ? insight : cachedInsight;
  const summaryReady = hasCompleteNewsInsight(readyInsight);
  const summary: Array<[string, string | null | undefined]> = [
    [t("what"), readyInsight.what],
    [t("why"), readyInsight.why],
    [t("impact"), readyInsight.impact],
  ];
  return <Link
    className={`news-card ${locale === "ko" ? "is-korean" : ""} ${wrappedTitle ? "has-wrapped-title" : ""}`}
    to={`/news/${article.id}`}
    onPointerEnter={() => setHovered(true)}
    onPointerLeave={() => setHovered(false)}
    onFocus={() => { setHovered(true); setInsightRequested(true); }}
    onBlur={() => setHovered(false)}
  >
    <div className="news-card-content">
      <IntelligenceBadges sentiment={article.sentiment} importance={article.importance} eventType={article.eventType} />
      <h3 className={adaptiveTextClass(title, "news-card-title", locale === "ko" ? 24 : 36, locale === "ko" ? 40 : 62)}>{title}</h3>
      <p className="meta">{article.publisher} · {formatDate(article.publishedAt)}</p>
    </div>
    <NewsThumbnail className="news-card-thumbnail" src={article.thumbnailUrl} />
    <div className="insight">
      {!summaryReady && !hovered ? (
        <p className="insight-hover-prompt">
          {locale === "ko" ? "마우스를 올려 What / Why / Impact 요약 보기" : "Hover to view the What / Why / Impact summary"}
        </p>
      ) : summaryReady ? (
        summary.map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)
      ) : (
        summary.map(([label]) => <p key={label}><b>{label}</b><LoadingSkeleton className="insight-loading" /></p>)
      )}
    </div>
  </Link>;
}
