import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import {
  AgentHistoryView,
  AgentOverflowMenu,
} from "../components/AgentHistory";
import { StockNewsFeed, TrendTag } from "../components/StockNewsFeed";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { openKAgent } from "../agentEvents";
import { api } from "../api";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { NewsArticle, StockDetail, TranslationResult } from "../types";

const AGENT_OPENING_ANSWER =
  "KT has reached its 49% cap, so buy orders from foreign investors will be rejected. SK Telecom sits at 46.10% of a 49% cap — about 94% used — and could reach the cap intraday. KEPCO and KOGAS both have substantial room.";

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

function StockNewsHeader() {
  const stockState = useRemote((signal) => api<StockDetail>("/api/v1/market/stocks/005930", { signal }), []);
  const stock = stockState.data;
  return (
    <div className="news-stock-hero">
      <Header />
      <div className="page-shell mini-stock">
        <BackLink to="/stocks/005930" />
        <div>
          <h1>
            {stock?.nameEn || stock?.nameKo || "Samsung Electronics"}{" "}
            <WatchlistHeart
              itemId="samsung-electronics"
              itemName={stock?.nameEn || stock?.nameKo || "Samsung Electronics"}
            />
          </h1>
          <span className="mini-price">
            <strong>{formatNumber(stock?.quote.currentPriceKrw, { style: "currency", currency: "KRW", maximumFractionDigits: 0 })}</strong>
            <small>
              {formatNumber(stock?.quote.changeAmountKrw)} <img src="/assets/price-down.svg" alt="" /> {stock?.quote.changeRate == null ? "Unavailable" : `${stock.quote.changeRate.toFixed(2)}%`}
            </small>
          </span>
        </div>
        <p>005930&nbsp;&nbsp; · &nbsp;&nbsp;{stock?.market || "—"}</p>
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
        <Link className="mini-insight" to="/stocks/005930?insights=1">
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
  return (
    <div className="news-page">
      <StockNewsHeader />
      <main className="page-shell news-feed">
        <div className="stock-tabs">
          <Link to="/stocks/005930">Chart</Link>
          <button className="active">News</button>
          <Link to="/disclosures">Disclosure</Link>
        </div>
        <StockNewsFeed />
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
              <p>{article?.publisher || "—"} · {formatDate(article?.publishedAt)} · {article?.englishTitle ? "Auto-translated" : "Translation pending"}</p>
            </div>
            <img src={article?.thumbnailUrl || "/assets/news-expo.png"} alt="" />
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
                {translationState.data?.status !== "READY" ? <button type="button" onClick={() => void api<TranslationResult>(`/api/v1/news/${newsId}/translation`, { method: "POST" }).then(translationState.setData)}>Generate English translation &amp; insight</button> : null}
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
                <button className="article-share" aria-label="Share article">
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

function AgentPanel({ close }: { close: () => void }) {
  const [history, setHistory] = useState(false);
  const [phase, setPhase] = useState<
    "panel" | "user" | "thinking" | "typing" | "complete"
  >("panel");
  const [typedAnswer, setTypedAnswer] = useState("");

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setPhase("complete");
      setTypedAnswer(AGENT_OPENING_ANSWER);
      return;
    }

    let typingTimer: number | undefined;
    const showUserTimer = window.setTimeout(() => setPhase("user"), 420);
    const showThinkingTimer = window.setTimeout(
      () => setPhase("thinking"),
      980,
    );
    const startTypingTimer = window.setTimeout(() => {
      setPhase("typing");
      let characterIndex = 0;
      typingTimer = window.setInterval(() => {
        characterIndex += 1;
        setTypedAnswer(AGENT_OPENING_ANSWER.slice(0, characterIndex));
        if (characterIndex >= AGENT_OPENING_ANSWER.length) {
          window.clearInterval(typingTimer);
          setPhase("complete");
        }
      }, 18);
    }, 1750);

    return () => {
      window.clearTimeout(showUserTimer);
      window.clearTimeout(showThinkingTimer);
      window.clearTimeout(startTypingTimer);
      if (typingTimer !== undefined) window.clearInterval(typingTimer);
    };
  }, []);

  const showUserMessage = phase !== "panel";
  const showAnswer = phase === "typing" || phase === "complete";

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
      className="agent-panel article-agent-panel"
      aria-label="K-Agent chat"
      data-phase={phase}
    >
      <button className="agent-close" onClick={close}>
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
        <img src="/assets/agent-context.svg" alt="" /> Selected from the article
        · “ants”
      </div>
      <div className="chat">
        {showUserMessage ? (
          <p className="user-message user-message-enter">
            What is the definition of Ttattable?
          </p>
        ) : null}
        {phase === "thinking" ? (
          <div className="agent-thinking" role="status" aria-live="polite">
            <span className="agent-thinking-label">K-Agent is thinking</span>
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {showAnswer ? (
          <div className="ai-message ai-message-enter">
            <p className="typewriter-answer" aria-label={AGENT_OPENING_ANSWER}>
              <span aria-hidden="true">{typedAnswer}</span>
              {phase === "typing" ? (
                <span className="typing-cursor" aria-hidden="true" />
              ) : null}
            </p>
            {phase === "complete" ? (
              <>
                <blockquote className="answer-detail-enter">
                  <b>Market Sentiment Shift</b>
                  <p>- SEOUL, South Korea — Samsung Electronics</p>
                  <p>- accelerating its efforts to create a more connected</p>
                </blockquote>
                <p className="answer-detail-enter">
                  so buy orders from foreign investors will be rejected. SK
                  Telecom sits at 46.10% of a 49% cap.
                </p>
                <p className="answer-detail-enter">
                  Source: <u>KRX foreign ownership snapshot, 15:30 KST</u>
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {phase === "complete" ? (
        <div className="faq answer-detail-enter">
          <span>Frequently asked</span>
          <button>Why is the KOSPI down today?</button>
          <button>Which stocks are near their foreign ownership cap?</button>
        </div>
      ) : null}
      <div className="chat-input">
        Ask anything about this market{" "}
        <button>
          <img src="/assets/agent-send.svg" alt="Send" />
        </button>
      </div>
    </aside>
  );
}
