import { useEffect } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { StockNewsFeed } from "../components/StockNewsFeed";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { openKAgent } from "../agentEvents";
import { api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import type { NewsArticle, StockDetail } from "../types";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SelectionAssistant, useSelectionAssistant } from "../components/SelectionAssistant";
import { isVerifiedEnglish, verifiedEnglishText } from "../utils/english";
import { generatedNewsInsight, hasCompleteNewsInsight, localizedNewsInsight } from "../utils/newsInsight";
import { stockCurrency } from "../utils/stockCurrency";

function StockNewsHeader({ stockCode }: { stockCode: string }) {
  const { locale, stockName } = useLocale();
  const stockState = useRemote((signal) => api<StockDetail>(`/api/v1/market/stocks/${stockCode}`, { signal }), [stockCode]);
  const stock = stockState.data;
  const changeRate = stock?.quote.changeRate;
  const price = (value: number | null | undefined, primary = true, signed = false) => stockCurrency(value, stock?.exchangeRate.krwPerUnit, locale, primary, signed);
  return (
    <div className="news-stock-hero">
      <Header />
      <div className="page-shell mini-stock">
        <BackLink to={`/stocks/${stockCode}`} />
        <div>
          <h1>
            {stock ? stockName(stock) : locale === "ko" ? "종목을 불러오는 중…" : "Loading stock…"}{" "}
            <WatchlistHeart
              itemId={stockCode}
              itemName={stock ? stockName(stock) : stockCode}
            />
          </h1>
          <span className="mini-price">
            <strong>{price(stock?.quote.currentPriceKrw)}</strong>
            <span className="stock-price-secondary">{price(stock?.quote.currentPriceKrw, false)}</span>
            <small className={changeRate == null ? "" : changeRate >= 0 ? "is-positive" : ""}>
              {price(stock?.quote.changeAmountKrw, true, true)} {changeRate == null ? null : <img src={changeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />} {changeRate == null ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`}
            </small>
          </span>
        </div>
        <p>{stockCode}&nbsp;&nbsp; · &nbsp;&nbsp;{stock?.market || "—"}</p>
        <p>{stock?.quote.status || (locale === "ko" ? "불러오는 중" : "Loading")} · {formatDate(stock?.quote.asOf)} · {locale === "ko" ? `환율 ${formatNumber(stock?.exchangeRate.krwPerUnit)}원/USD` : `Converted at ${formatNumber(stock?.exchangeRate.krwPerUnit)} KRW/USD`}</p>
        <div className="mini-metrics">
          <span>
            {locale === "ko" ? "고가" : "High"}<b>{price(stock?.quote.highPriceKrw)}</b><small>{price(stock?.quote.highPriceKrw, false)}</small>
          </span>
          <span>
            {locale === "ko" ? "저가" : "Low"}<b>{price(stock?.quote.lowPriceKrw)}</b><small>{price(stock?.quote.lowPriceKrw, false)}</small>
          </span>
          <span>
            {locale === "ko" ? "거래량" : "Volume"}<b>{formatNumber(stock?.quote.volume, { notation: "compact" })}</b>
          </span>
          <span>
            {locale === "ko" ? "시가" : "Open"}<b>{price(stock?.quote.openPriceKrw)}</b><small>{price(stock?.quote.openPriceKrw, false)}</small>
          </span>
        </div>
        <div className="stock-badges">
          {stock?.subjectToForeignAcquisitionLimit ? <span className="stock-danger">
            <img src="/assets/status-warning.svg" alt="" />
            {stock.foreignOwnership.limitExhaustionRate == null ? (locale === "ko" ? "외국인 한도 정보 없음" : "Foreign limit unavailable") : (locale === "ko" ? `외국인 한도 ${stock.foreignOwnership.limitExhaustionRate.toFixed(1)}% 사용` : `${stock.foreignOwnership.limitExhaustionRate.toFixed(1)}% foreign limit used`)}
          </span> : null}
          {stock?.quote.viActive || stock?.quote.singlePriceTrading ? <span className="warning-chip">
            <img src="/assets/timer.svg" alt="" />
            {locale === "ko" ? "VI 발동" : "VI active"}
          </span> : null}
        </div>
        <Link className="mini-insight" to={`/stocks/${stockCode}?insights=1`}>
          <img src="/assets/info.svg" alt="" />
          <span>
            <b>{locale === "ko" ? "기업 인사이트 빠른 확인" : "Quick check company insight!"}</b>
            <small>
              {locale === "ko" ? "사업 구조가 가장 비슷한 글로벌 기업을 확인하세요." : "See which global companies this business most closely resembles."}
            </small>
          </span>
          <em>
            {locale === "ko" ? "인사이트 보기" : "View insights"} <img src="/assets/chevron-right-gold.svg" alt="" />
          </em>
        </Link>
      </div>
    </div>
  );
}

export function NewsPage() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const stockCode = params.get("stockCode") || "";
  return (
    <div className="news-page">
      {stockCode ? <StockNewsHeader stockCode={stockCode} /> : <Header white />}
      <main className="page-shell news-feed">
        {stockCode ? <div className="stock-tabs">
          <Link to={`/stocks/${stockCode}`}>{t("chart")}</Link>
          <button className="active">{t("news")}</button>
          <Link to={`/stocks/${stockCode}?tab=disclosure`}>{t("disclosure")}</Link>
        </div> : <><BackLink to="/" /><h1>{t("marketNews")}</h1></>}
        <StockNewsFeed stockCode={stockCode || undefined} />
      </main>
    </div>
  );
}

export function NewsDetailPage() {
  const { locale, t, stockName } = useLocale();
  const location = useLocation();
  const { newsId = "" } = useParams();
  const profile = useProfile();
  const articleState = useRemote((signal) => api<NewsArticle>(`/api/v1/news/${newsId}`, { signal }), [newsId]);
  const translationState = useAutomaticTranslation(`/api/v1/news/${newsId}/translation?locale=${locale}`, Boolean(newsId));
  const selectionAssistant = useSelectionAssistant<HTMLDivElement>(false, `${newsId}:${locale}`);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/news";
  const article = articleState.data;
  const readyResult = generatedNewsInsight(translationState.data, locale);
  const translation = locale === "en"
    ? readyResult && isVerifiedEnglish(readyResult) ? readyResult : null
    : readyResult && hasCompleteNewsInsight(readyResult) ? readyResult : null;
  const cachedInsight = article ? localizedNewsInsight(article, locale) : { what: null, why: null, impact: null };
  const summaryInsight = translation && hasCompleteNewsInsight(translation) ? translation : cachedInsight;
  const englishTitle = verifiedEnglishText(article?.englishTitle);
  useEffect(() => {
    if (!profile || !newsId) return;
    void api("/api/v1/me/recently-viewed", { method: "POST", body: JSON.stringify({ itemType: "NEWS", referenceId: newsId, stockCode: article?.relatedStocks[0]?.stockCode || null }) }).catch(() => undefined);
  }, [article?.relatedStocks, newsId, profile]);
  const translationPending = translationState.loading
    || translationState.requesting
    || translationState.data?.status === "NOT_REQUESTED"
    || translationState.data?.status === "PENDING"
    || translationState.data?.status === "PROCESSING";
  const translationError = translationState.requestError || translationState.error;

  return (
    <div className="article-page">
      <div className="article-main">
        <Header />
        <main className="page-shell article-shell">
          <BackLink to={returnTo} />
          <section className="article-hero">
            <div>
              <IntelligenceBadges sentiment={article?.sentiment} importance={article?.importance} eventType={article?.eventType} />
              <h1 className={((locale === "ko" ? article?.originalTitle : englishTitle) || "").length > 70 ? "is-long-title" : ""}>
                {locale === "ko" ? article?.originalTitle || "뉴스를 불러오는 중…" : englishTitle || "Loading article…"}
              </h1>
              <p>{article?.publisher || "—"} · {formatDate(article?.publishedAt)} · {locale === "ko" ? "한글 원문" : translation ? "Auto-translated" : translationPending ? "Translation loading" : "Translation unavailable"}</p>
            </div>
            <NewsThumbnail src={article?.thumbnailUrl} />
          </section>
          <div className="article-grid">
            <div>
              <section className="ai-summary">
                <h2>
                  {t("aiSummary")}{" "}
                  <img src="/assets/agent-badge-381-4971.svg" alt="AI" />
                </h2>
                {[[t("what"), summaryInsight.what], [t("why"), summaryInsight.why], [t("impact"), summaryInsight.impact]].map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    {row[1] ? <span>{row[1]}</span> : translationPending ? <LoadingSkeleton className="insight-loading" /> : <span>{locale === "ko" ? "근거 기반 요약을 준비하지 못했습니다." : "Grounded insight could not be generated for this source."}</span>}
                  </p>
                ))}
                {translationError ? <small className="translation-status-error">{translationError.message}</small> : null}
              </section>
              <article className="article-body">
                <button
                  className="selection-hint"
                  onClick={selectionAssistant.clearSelection}
                >
                  <img src="/assets/selection-info-figma.svg" alt="" /> {locale === "ko" ? "궁금한 문장을 드래그해 AI에게 물어보세요." : "Drag over any highlighted term to look it up."}
                </button>
                <button type="button" className="article-share" aria-label={locale === "ko" ? "뉴스 공유" : "Share article"} onClick={() => void shareArticle((locale === "ko" ? article?.originalTitle : englishTitle) || "KART news")}>
                  <img src="/assets/share.svg" alt="" />
                </button>
                <div
                  className="article-copy selection-surface"
                  ref={selectionAssistant.containerRef}
                  onMouseUp={selectionAssistant.captureSelection}
                >
                  <RemoteState {...articleState}>
                    {(value) => locale === "ko" && value.originalBody
                      ? value.originalBody.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p className="selection-content" key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)
                      : translation?.translatedParagraphs?.length
                      ? <>{translation.translatedParagraphs.map((paragraph, index) => <p className="selection-content" key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}</>
                      : translationPending
                        ? <LoadingSkeleton lines={8} className="article-copy-skeleton" />
                        : <div className="api-state api-error">{locale === "ko" ? "원문을 불러오지 못했습니다." : "The full article translation could not be completed. Any verified summary above remains available."}</div>}
                  </RemoteState>
                  <SelectionAssistant
                    selection={selectionAssistant.selection}
                    prompt={locale === "ko" ? "이 내용이 궁금한가요?" : "Want to know what this means?"}
                    actionLabel={locale === "ko" ? "질문하기" : "Click"}
                    onAsk={(selectedText) => openKAgent({ contextType: "NEWS", referenceId: newsId, selection: { text: selectedText }, prompt: locale === "ko" ? `이 기사에서 “${selectedText}”의 뜻과 투자 맥락을 한국어로 설명해줘.` : `Explain “${selectedText}” and its investment context in this article.` })}
                  />
                </div>
                <div className="article-tags">
                  {article?.relatedStocks.map((stock) => <span key={stock.stockCode}>{stock.stockCode}</span>)}
                </div>
              </article>
            </div>
            <aside className="mentioned">
              <h2>{t("mentioned")}</h2>
              {article?.relatedStocks.map((stock) => <Link to={`/stocks/${stock.stockCode}`} key={stock.stockCode}>{stockName(stock)}</Link>)}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

async function shareArticle(title: string) {
  if (navigator.share) {
    await navigator.share({ title, url: window.location.href });
    return;
  }
  await navigator.clipboard.writeText(window.location.href);
}
