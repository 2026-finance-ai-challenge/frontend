import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import {
  AgentHistoryView,
  AgentOverflowMenu,
} from "../components/AgentHistory";
import { StockNewsFeed, TrendTag } from "../components/StockNewsFeed";
import { WatchlistHeart } from "../components/WatchlistHeart";

const AGENT_OPENING_ANSWER =
  "KT has reached its 49% cap, so buy orders from foreign investors will be rejected. SK Telecom sits at 46.10% of a 49% cap — about 94% used — and could reach the cap intraday. KEPCO and KOGAS both have substantial room.";

function StockNewsHeader() {
  return (
    <div className="news-stock-hero">
      <Header />
      <div className="page-shell mini-stock">
        <BackLink to="/stocks/005930" />
        <div>
          <h1>
            Samsung Electronics{" "}
            <WatchlistHeart
              itemId="samsung-electronics"
              itemName="Samsung Electronics"
            />
          </h1>
          <span className="mini-price">
            <strong>₩288,020</strong>
            <small>
              -1,000 <img src="/assets/price-down.svg" alt="" /> -1.2%
            </small>
          </span>
        </div>
        <p>005930&nbsp;&nbsp; · &nbsp;&nbsp;KOSPI</p>
        <p>Market closed · Aug 14, 15:30 KST · Converted at 1,318.40 KRW/USD</p>
        <div className="mini-metrics">
          <span>
            High<b>123,000</b>
          </span>
          <span>
            Low<b>123,000</b>
          </span>
          <span>
            Volume<b>20.1M</b>
          </span>
          <span>
            Prev close<b>192.06</b>
          </span>
        </div>
        <div className="stock-badges">
          <span className="stock-danger">
            <img src="/assets/status-warning.svg" alt="" />
            Near reached
          </span>
          <span className="warning-chip">
            <img src="/assets/timer.svg" alt="" />
            VI Triggered (01:43)
          </span>
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
  const [agent, setAgent] = useState(false);
  const [selected, setSelected] = useState(true);
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/news";

  return (
    <div className={`article-page ${agent ? "agent-open" : ""}`}>
      <div className="article-main">
        <Header />
        <main className="page-shell article-shell">
          <BackLink to={returnTo} />
          <section className="article-hero">
            <div>
              <div className="tags">
                <TrendTag type="Negative" />
                <span className="warning-chip">Medium priority</span>
                <span className="info-tag">Foreign selling</span>
              </div>
              <h1>
                Samsung Electronics confirms
                <br />
                FY2025 dividend payout, unchanged
                <br />
                from prior year
              </h1>
              <p>Yonhap Infomax · Aug 14, 14:20 KST · Auto-translated</p>
            </div>
            <img src="/assets/news-expo.png" alt="Samsung exhibition booth" />
          </section>
          <div className="article-grid">
            <div>
              <section className="ai-summary">
                <h2>
                  AI Insight summary{" "}
                  <img src="/assets/agent-badge.svg" alt="AI" />
                </h2>
                {[
                  [
                    "What",
                    "KOSPI closed 0.4% lower as foreign investors sold a net ₩820B.",
                  ],
                  [
                    "Why",
                    "Chip earnings expectations were revised down ahead of guidance.",
                  ],
                  [
                    "Impact",
                    "Breadth matters more than the index level; watch whether net buying returns before quarter-end.",
                  ],
                ].map((row) => (
                  <p key={row[0]}>
                    <b>{row[0]}</b>
                    <span>{row[1]}</span>
                  </p>
                ))}
              </section>
              <article className="article-body">
                <button
                  className="selection-hint"
                  onClick={() => setSelected(!selected)}
                >
                  <img src="/assets/selection-info.svg" alt="" /> Drag over any
                  highlighted term to look it up.
                </button>
                <button className="article-share" aria-label="Share article">
                  <img src="/assets/share.svg" alt="" />
                </button>
                <p>
                  SEOUL, South Korea — Samsung Electronics is accelerating its
                  efforts to create a more connected and intelligent digital
                  ecosystem, with a focus on integrating artificial intelligence
                  across its diverse range of products and services.
                </p>
                <blockquote>
                  <b>Market Sentiment Shift</b>
                  <p>
                    SEOUL, South Korea — Samsung Electronics is accelerating its
                    efforts to create a more connected and intelligent digital
                    ecosystem, with a focus on integrating artificial
                    intelligence across.
                  </p>
                </blockquote>
                <p>
                  The company said its latest strategy centers on making
                  everyday technology more personalized and responsive. From
                  smartphones and home appliances to semiconductor technologies,
                  Samsung aims to create seamless connections between devices
                  while reducing the complexity of managing multiple digital
                  products.
                </p>
                <p>
                  “Technology should work naturally in the background and make
                  people’s everyday lives easier,” a Samsung Electronics
                  representative said. “Our goal is to create experiences that
                  are not only smarter, but also more meaningful for users.”
                </p>
                <p>
                  Samsung has continued to expand its presence across consumer
                  electronics and semiconductor markets. The company operates
                  through its DX (Device eXperience) and DS (Device Solutions)
                  divisions, covering products ranging from smartphones and
                  televisions to advanced semiconductor solutions.
                </p>
                <p>
                  The company is also expected to increase investment in
                  artificial intelligence and next-generation semiconductor
                  technologies as demand for AI-related products continues to
                  grow. Industry analysts believe these technologies could play
                  an important role in Samsung’s future competitiveness.
                </p>
                <p>
                  Looking ahead, Samsung Electronics plans to strengthen its
                  ecosystem of{" "}
                  <span className="highlight-term-wrapper">
                    <button
                      type="button"
                      className="highlighted-term"
                      aria-expanded={selected}
                      aria-controls={selected ? "article-term-tooltip" : undefined}
                      onClick={() => setSelected((current) => !current)}
                    >
                      connected
                    </button>
                    {selected ? (
                      <button
                        type="button"
                        id="article-term-tooltip"
                        className="selection-popup"
                        onClick={() => setAgent(true)}
                      >
                        <img src="/assets/tooltip-arrow.svg" alt="" />
                        <span>Want to know what this mean?</span>
                        <b>Click</b>
                      </button>
                    ) : null}
                  </span>{" "}
                  devices and explore new ways to combine hardware, software and
                  artificial intelligence. The company says its long-term
                  ambition is to transform technology from a collection of
                  individual products into a more unified experience.
                </p>
                <p>
                  This article is a fictional dummy article created for design
                  and layout purposes.
                </p>
                <div className="article-tags">
                  <span>KODAQ</span>
                  <span>Tech</span>
                  <span>Retail</span>
                </div>
              </article>
            </div>
            <aside className="mentioned">
              <h2>Mentioned</h2>
              <Link to="/stocks/005930">Samsung Electronics</Link>
              <span>TSMC</span>
            </aside>
          </div>
        </main>
      </div>
      {agent ? <AgentPanel close={() => setAgent(false)} /> : null}
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
