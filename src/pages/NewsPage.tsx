import { useState } from "react";
import { Link } from "react-router-dom";
import { BackLink, Header } from "../components/Layout";
import { WatchlistHeart } from "../components/WatchlistHeart";

const newsItems = [
  [
    "/assets/news-phone.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
  [
    "/assets/news-office.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Low priority",
    "Listing",
  ],
  [
    "/assets/news-expo.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "Medium priority",
    "Foreign selling",
  ],
  [
    "/assets/news-dark.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Medium priority",
    "Listing",
  ],
  [
    "/assets/news-phone.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
];

function TrendTag({ type }: { type: string }) {
  const negative = type === "Negative";
  return (
    <span className={negative ? "negative" : "positive"}>
      <img
        src={negative ? "/assets/trend-down.svg" : "/assets/trend-up.svg"}
        alt=""
      />
      {type}
    </span>
  );
}

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
  const [filter, setFilter] = useState("All");
  return (
    <div className="news-page">
      <StockNewsHeader />
      <main className="page-shell news-feed">
        <div className="stock-tabs">
          <Link to="/stocks/005930">Chart</Link>
          <button className="active">News</button>
          <Link to="/disclosures">Disclosure</Link>
        </div>
        <div className="feed-controls">
          <div>
            {[
              "All",
              "High priority",
              "Positive",
              "Negative",
              "My watchlist",
            ].map((item) => (
              <button
                onClick={() => setFilter(item)}
                className={filter === item ? "active" : ""}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="carousel-controls">
            <button aria-label="Previous">
              <img src="/assets/carousel-prev.svg" alt="" />
            </button>
            <button aria-label="Next">
              <img src="/assets/carousel-next.svg" alt="" />
            </button>
          </div>
        </div>
        <div className="news-list">
          {newsItems.map((item, index) => (
            <Link
              to="/news/fy2025-dividend"
              className="news-row"
              key={`${item[1]}-${index}`}
            >
              <img src={item[0]} alt="" />
              <div>
                <div className="tags">
                  <TrendTag type={item[2]} />
                  <span
                    className={item[3].startsWith("High") ? "priority" : ""}
                  >
                    {item[3]}
                  </span>
                  <span>{item[4]}</span>
                </div>
                <h2>{item[1]}</h2>
                <p>Yonhap Infomax · Aug 14, 14:20 KST · Auto-translated</p>
                <p>
                  Selling pressure came mostly from institutions, while ants
                  absorbed much of the supply for a fourth straight day. Trading
                  concentrated in the bellwether chip names, while several
                  small-cap names with limited free float — what local traders
                  call sold-out stocks — swung sharply.
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export function NewsDetailPage() {
  const [agent, setAgent] = useState(false);
  const [selected, setSelected] = useState(true);
  return (
    <div className={`article-page ${agent ? "agent-open" : ""}`}>
      <div className="article-main">
        <Header />
        <main className="page-shell article-shell">
          <BackLink to="/news" />
          <section className="article-hero">
            <div>
              <div className="tags">
                <TrendTag type="Negative" />
                <span>Medium priority</span>
                <span>Foreign selling</span>
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
                  <mark
                    onClick={() => {
                      setSelected(true);
                      setAgent(true);
                    }}
                  >
                    connected
                  </mark>{" "}
                  devices and explore new ways to combine hardware, software and
                  artificial intelligence. The company says its long-term
                  ambition is to transform technology from a collection of
                  individual products into a more unified experience.
                </p>
                <p>
                  This article is a fictional dummy article created for design
                  and layout purposes.
                </p>
                {selected && (
                  <button
                    className="selection-popup"
                    onClick={() => setAgent(true)}
                  >
                    Want to know what this mean? <b>Click</b>
                  </button>
                )}
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
      {agent && <AgentPanel close={() => setAgent(false)} />}
    </div>
  );
}

function AgentPanel({ close }: { close: () => void }) {
  return (
    <aside className="agent-panel">
      <button className="agent-close" onClick={close}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>AI Financial Intelligence</p>
        </div>
        <img className="agent-overflow" src="/assets/overflow.svg" alt="" />
      </header>
      <div className="context-chip">
        <img src="/assets/agent-context.svg" alt="" /> Selected from the article
        · “ants”
      </div>
      <div className="chat">
        <p className="user-message">What is the definition of Tittatable?</p>
        <div className="ai-message">
          <p>
            KT has reached its 49% cap, so buy orders from foreign investors
            will be rejected. SK Telecom sits at 46.10% of a 49% cap — about 94%
            used — and could reach the cap intraday. KEPCO and KOGAS both have
            substantial room.
          </p>
          <blockquote>
            <b>Data Point Reference:</b>
            <p>- SEOUL, South Korea — Samsung Electronics</p>
            <p>- accelerating its efforts to create a more connected</p>
          </blockquote>
          <p>
            so buy orders from foreign investors will be rejected. SK Telecom
            sits at 46.10% of a 49% cap.
          </p>
          <p>
            Source: <u>KRX foreign ownership snapshot, 15:30 KST</u>
          </p>
        </div>
      </div>
      <div className="faq">
        <span>Frequently asked</span>
        <button>Why is the KOSPI down today?</button>
        <button>Which stocks are near their foreign ownership cap?</button>
      </div>
      <div className="chat-input">
        Ask anything about this market{" "}
        <button>
          <img src="/assets/agent-send.svg" alt="Send" />
        </button>
      </div>
    </aside>
  );
}
