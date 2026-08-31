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
import type { NewsArticle, StockDetail, TranslationResult } from "../types";

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
            <small className={(stock?.quote.changeRate ?? 0) >= 0 ? "is-positive" : ""}>
              {stock?.quote.changeAmountKrw == null ? "Unavailable" : `${stock.quote.changeAmountKrw >= 0 ? "+" : ""}${formatNumber(stock.quote.changeAmountKrw)}`} <img src={(stock?.quote.changeRate ?? 0) >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" /> {stock?.quote.changeRate == null ? "Unavailable" : `${stock.quote.changeRate >= 0 ? "+" : ""}${stock.quote.changeRate.toFixed(2)}%`}
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
  const translationState = useRemote((signal) => api<TranslationResult>(`/api/v1/news/${newsId}/translation`, { signal }), [newsId]);
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
  useEffect(() => {
    if (translationState.data?.status !== "PENDING" && translationState.data?.status !== "PROCESSING") return;
    const timer = window.setTimeout(translationState.retry, 2500);
    return () => window.clearTimeout(timer);
  }, [translationState.data?.status, translationState.retry]);

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
              <p>{article?.publisher || "—"} · {formatDate(article?.publishedAt)} · {article?.englishTitle ? "Auto-translated" : "Original language"}</p>
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
                {(translation ? [["What", translation.what], ["Why", translation.why], ["Impact", translation.impact]] : [["What", article?.what], ["Why", article?.why], ["Impact", article?.impact]]).map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1] || "Grounded insight is not ready."}</span>
                  </p>
                ))}
                {translationState.data?.status !== "READY" ? <button type="button" disabled={translationState.data?.status === "PENDING" || translationState.data?.status === "PROCESSING"} onClick={() => void api<TranslationResult>(`/api/v1/news/${newsId}/translation`, { method: "POST" }).then(translationState.setData)}>{translationState.data?.status === "PENDING" || translationState.data?.status === "PROCESSING" ? "Translation processing…" : "Generate English translation & insight"}</button> : null}
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
                  {(value) => <>{(translation?.translatedParagraphs || value.englishBody?.split("\n\n") || value.originalBody?.split("\n\n") || [value.originalExcerpt || "Article body is unavailable from the source."]).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}</>}
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
