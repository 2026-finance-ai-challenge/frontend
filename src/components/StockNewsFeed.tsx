import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "./RemoteState";
import { useRemote } from "../hooks/useRemote";
import type { NewsArticle } from "../types";

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

export function TrendTag({ type }: { type: string }) {
  const negative = type.toUpperCase() === "NEGATIVE";

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

export function StockNewsFeed() {
  const [filter, setFilter] = useState("All");
  const { pathname } = useLocation();
  const { stockCode } = useParams();
  const newsState = useRemote(
    (signal) => api<{ items: NewsArticle[] }>(`/api/v1/news${queryString({
      stockCode,
      importance: filter === "High priority" ? "HIGH" : null,
      sentiment: filter === "Positive" || filter === "Negative" ? filter.toUpperCase() : null,
      watchlist: filter === "My watchlist" || null,
      limit: 20,
    })}`, { signal }),
    [stockCode, filter],
  );
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=news`
    : pathname;

  return (
    <>
      <div className="feed-controls">
        <div>
          {["All", "High priority", "Positive", "Negative", "My watchlist"].map(
            (item) => (
              <button
                type="button"
                onClick={() => setFilter(item)}
                className={filter === item ? "active" : ""}
                key={item}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label="Previous">
            <img src="/assets/carousel-prev.svg" alt="" />
          </button>
          <button type="button" aria-label="Next">
            <img src="/assets/carousel-next.svg" alt="" />
          </button>
        </div>
      </div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>
      {(value) => <div className="news-list">
        {value.items.map((item) => (
          <Link
            to={`/news/${item.id}`}
            state={{ returnTo }}
            className="news-row"
            key={item.id}
          >
            <img src={item.thumbnailUrl || "/assets/news-phone.png"} alt="" />
            <div>
              <div className="tags">
                <TrendTag type={item.sentiment || "NEUTRAL"} />
                <span className={item.importance === "HIGH" || item.importance === "CRITICAL" ? "priority" : ""}>
                  {item.importance ? `${item.importance} priority` : "Analysis pending"}
                </span>
                {item.eventType ? <span>{item.eventType}</span> : null}
              </div>
              <h2>{item.englishTitle || item.originalTitle}</h2>
              <p>{item.publisher} · {formatDate(item.publishedAt)} · {item.englishTitle ? "Auto-translated" : "Translation pending"}</p>
              <p>{item.originalExcerpt || "Source excerpt unavailable."}</p>
            </div>
          </Link>
        ))}
      </div>}
      </RemoteState>
    </>
  );
}
