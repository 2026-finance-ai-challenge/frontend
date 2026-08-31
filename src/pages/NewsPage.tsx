import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { StockNewsFeed, TrendTag } from "../components/StockNewsFeed";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { openKAgent } from "../agentEvents";
import { api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import type { NewsArticle, StockDetail } from "../types";

type TermExplanation = {
  selectedText: string;
  normalizedTerm: string;
  definition: string;
  contextualMeaning: string;
  confidence: number;
  reviewRequired: boolean;
  sufficientEvidence: boolean;
  refusalReason: string | null;
};

function StockNewsHeader({ stockCode }: { stockCode: string }) {
  const stockState = useRemote((signal) => api<StockDetail>(`/api/v1/market/stocks/${stockCode}`, { signal }), [stockCode]);
  const stock = stockState.data;
  const changeRate = stock?.quote.changeRate;
  return (
    <div className="news-stock-hero">
      <Header />
      <div className="page-shell mini-stock">
        <BackLink to={`/stocks/${stockCode}`} />
        <div>
          <h1>
            {stock?.nameEn || stock?.nameKo || "Loading stock…"}{" "}
            <WatchlistHeart
              itemId={stockCode}
              itemName={stock?.nameEn || stock?.nameKo || stockCode}
            />
          </h1>
          <span className="mini-price">
            <strong>{formatNumber(stock?.quote.currentPriceKrw, { style: "currency", currency: "KRW", maximumFractionDigits: 0 })}</strong>
            <small className={changeRate == null ? "" : changeRate >= 0 ? "is-positive" : ""}>
              {stock?.quote.changeAmountKrw == null ? "Unavailable" : `${stock.quote.changeAmountKrw >= 0 ? "+" : ""}${formatNumber(stock.quote.changeAmountKrw)}`} {changeRate == null ? null : <img src={changeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />} {changeRate == null ? "Unavailable" : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`}
            </small>
          </span>
        </div>
        <p>{stockCode}&nbsp;&nbsp; · &nbsp;&nbsp;{stock?.market || "—"}</p>
        <p>{stock?.quote.status || "Loading"} · {formatDate(stock?.quote.asOf)} · Converted at {formatNumber(stock?.exchangeRate.krwPerUnit)} KRW/USD</p>
        <div className="mini-metrics">
          <span>
            High<b>{formatNumber(stock?.quote.highPriceKrw)}</b>
          </span>
          <span>
            Low<b>{formatNumber(stock?.quote.lowPriceKrw)}</b>
          </span>
          <span>
            Volume<b>{formatNumber(stock?.quote.volume, { notation: "compact" })}</b>
          </span>
          <span>
            Open<b>{formatNumber(stock?.quote.openPriceKrw)}</b>
          </span>
        </div>
        <div className="stock-badges">
          {stock?.subjectToForeignAcquisitionLimit ? <span className="stock-danger">
            <img src="/assets/status-warning.svg" alt="" />
            {stock.foreignOwnership.limitExhaustionRate == null ? "Foreign limit unavailable" : `${stock.foreignOwnership.limitExhaustionRate.toFixed(1)}% foreign limit used`}
          </span> : null}
          {stock?.quote.viActive || stock?.quote.singlePriceTrading ? <span className="warning-chip">
            <img src="/assets/timer.svg" alt="" />
            VI active
          </span> : null}
        </div>
        <Link className="mini-insight" to={`/stocks/${stockCode}?insights=1`}>
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

export function NewsPage() {
  const [params] = useSearchParams();
  const stockCode = params.get("stockCode") || "";
  return (
    <div className="news-page">
      {stockCode ? <StockNewsHeader stockCode={stockCode} /> : <Header white />}
      <main className="page-shell news-feed">
        {stockCode ? <div className="stock-tabs">
          <Link to={`/stocks/${stockCode}`}>Chart</Link>
          <button className="active">News</button>
          <Link to={`/stocks/${stockCode}?tab=disclosure`}>Disclosure</Link>
        </div> : <><BackLink to="/" /><h1>Market news</h1></>}
        <StockNewsFeed stockCode={stockCode || undefined} />
      </main>
    </div>
  );
}

export function NewsDetailPage() {
  const location = useLocation();
  const { newsId = "" } = useParams();
  const profile = useProfile();
  const articleState = useRemote((signal) => api<NewsArticle>(`/api/v1/news/${newsId}`, { signal }), [newsId]);
  const translationState = useAutomaticTranslation(`/api/v1/news/${newsId}/translation`, Boolean(newsId));
  const [selectedText, setSelectedText] = useState("");
  const [termExplanation, setTermExplanation] = useState<TermExplanation | null>(null);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/news";
  const article = articleState.data;
  const translation = translationState.data?.status === "READY" ? translationState.data.result : null;
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
              <div className="tags">
                <TrendTag type={article?.sentiment || "NEUTRAL"} />
                <span className="warning-chip">{article?.importance ? `${article.importance} priority` : "Analysis pending"}</span>
                {article?.eventType ? <span className="info-tag">{article.eventType}</span> : null}
              </div>
              <h1>
                {article?.englishTitle || article?.originalTitle || "Loading article…"}
              </h1>
              <p>{article?.publisher || "—"} · {formatDate(article?.publishedAt)} · {translation ? "Auto-translated" : translationPending ? "Translation loading" : "Translation unavailable"}</p>
            </div>
            <NewsThumbnail src={article?.thumbnailUrl} />
          </section>
          <div className="article-grid">
            <div>
              <section className="ai-summary">
                <h2>
                  AI Insight summary{" "}
                  <img src="/assets/agent-badge.svg" alt="AI" />
                </h2>
                {(translation ? [["What", translation.what], ["Why", translation.why], ["Impact", translation.impact]] : [["What", null], ["Why", null], ["Impact", null]]).map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1] || (translationPending ? "Translation and grounded insight are loading…" : "Grounded insight is unavailable for this source.")}</span>
                  </p>
                ))}
                {translationError ? <small className="translation-status-error">{translationError.message}</small> : null}
              </section>
              <article className="article-body" onMouseUp={() => {
                const text = window.getSelection()?.toString().trim() || "";
                if (text.length >= 2 && text.length <= 500) setSelectedText(text);
              }}>
                <button
                  className="selection-hint"
                  onClick={() => setSelectedText("")}
                >
                  <img src="/assets/selection-info.svg" alt="" /> Drag over any
                  highlighted term to look it up.
                </button>
                <button type="button" className="article-share" aria-label="Share article" onClick={() => void shareArticle(article?.englishTitle || article?.originalTitle || "KART news")}>
                  <img src="/assets/share.svg" alt="" />
                </button>
                <RemoteState {...articleState}>
                  {(value) => translation?.translatedParagraphs?.length
                    ? <>{translation.translatedParagraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}</>
                    : translationPending
                      ? <div className="api-state api-loading" role="status">Translating the source and preparing What / Why / Impact…</div>
                      : <><p>{value.originalBody || value.originalExcerpt || "Article body is unavailable from the source."}</p><small className="translation-source-notice">Original Korean source shown because an English translation is unavailable.</small></>}
                </RemoteState>
                {selectedText ? <div className="selection-popup article-selection-action">
                  <span>Explain “{selectedText.slice(0, 60)}”</span>
                  <button type="button" onClick={() => void api<TermExplanation>(`/api/v1/news/${newsId}/term-explanations`, { method: "POST", body: JSON.stringify({ selectedText }) }).then(setTermExplanation)}>Explain this term</button>
                  <button type="button" onClick={() => openKAgent({ contextType: "NEWS", referenceId: newsId, prompt: `Explain “${selectedText.slice(0, 500)}” in this article.` })}>Ask AI</button>
                </div> : null}
                {termExplanation ? <blockquote><b>{termExplanation.normalizedTerm}</b><p>{termExplanation.sufficientEvidence ? termExplanation.definition : termExplanation.refusalReason}</p><p>{termExplanation.contextualMeaning}</p><small>{Math.round(termExplanation.confidence * 100)}% confidence{termExplanation.reviewRequired ? " · Review recommended" : ""}</small></blockquote> : null}
                <div className="article-tags">
                  {article?.relatedStocks.map((stock) => <span key={stock.stockCode}>{stock.stockCode}</span>)}
                </div>
              </article>
            </div>
            <aside className="mentioned">
              <h2>Mentioned</h2>
              {article?.relatedStocks.map((stock) => <Link to={`/stocks/${stock.stockCode}`} key={stock.stockCode}>{stock.nameEn || stock.nameKo}</Link>)}
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
