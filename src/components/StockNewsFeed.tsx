import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "./RemoteState";
import { ViewMoreButton } from "./ViewMoreButton";
import { NewsThumbnail } from "./NewsThumbnail";
import { useCursorPage } from "../hooks/useCursorPage";
import type { NewsArticle } from "../types";

const ITEMS_PER_PAGE = 5;

export function TrendTag({ type }: { type: string }) {
  const normalized = type.toUpperCase();
  const negative = normalized === "NEGATIVE";
  const positive = normalized === "POSITIVE";

  return (
    <span className={negative ? "negative" : positive ? "positive" : "neutral"}>
      <img
        src={negative ? "/assets/trend-down.svg" : positive ? "/assets/trend-up.svg" : "/assets/trend-neutral.svg"}
        alt=""
      />
      {type}
    </span>
  );
}

export function StockNewsFeed({ stockCode: stockCodeOverride }: { stockCode?: string } = {}) {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(0);
  const { pathname } = useLocation();
  const { stockCode: routeStockCode } = useParams();
  const stockCode = stockCodeOverride || routeStockCode;
  const newsState = useCursorPage(
    (cursor, signal) => api<{ items: NewsArticle[]; nextCursor: string | null }>(`/api/v1/news${queryString({
      stockCode,
      importance: filter === "High priority" ? "HIGH" : null,
      sentiment: filter === "Positive" || filter === "Negative" ? filter.toUpperCase() : null,
      watchlist: filter === "My watchlist" || null,
      cursor,
      limit: 20,
    })}`, { signal }),
    [stockCode, filter],
    (item) => item.id,
  );
  const returnTo = pathname.startsWith("/stocks/")
    ? `${pathname}?tab=news`
    : pathname;
  useEffect(() => setPage(0), [filter, stockCode]);
  const itemCount = newsState.data?.items.length ?? 0;
  const pageStart = page * ITEMS_PER_PAGE;
  const canGoNext = pageStart + ITEMS_PER_PAGE < itemCount;

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
          <button type="button" aria-label="Previous" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            <img src="/assets/carousel-prev.svg" alt="" />
          </button>
          <button type="button" aria-label="Next" disabled={!canGoNext} onClick={() => setPage((current) => current + 1)}>
            <img src="/assets/carousel-next.svg" alt="" />
          </button>
        </div>
      </div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>
      {(value) => <div className="news-list">
        {value.items.slice(pageStart, pageStart + ITEMS_PER_PAGE).map((item) => (
          <Link
            to={`/news/${item.id}`}
            state={{ returnTo }}
            className="news-row"
            key={item.id}
          >
            <NewsThumbnail src={item.thumbnailUrl} />
            <div>
              <div className="tags">
                <TrendTag type={item.sentiment || "NEUTRAL"} />
                <span className={item.importance === "HIGH" || item.importance === "CRITICAL" ? "priority" : ""}>
                  {item.importance ? `${item.importance} priority` : "Analysis pending"}
                </span>
                {item.eventType ? <span>{item.eventType}</span> : null}
              </div>
              <h2>{item.englishTitle}</h2>
              <p>{item.publisher} · {formatDate(item.publishedAt)} · Auto-translated title</p>
            </div>
          </Link>
        ))}
      </div>}
      </RemoteState>
      <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
    </>
  );
}
