import { useEffect, useState, type PointerEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "./RemoteState";
import { ViewMoreButton } from "./ViewMoreButton";
import { NewsThumbnail } from "./NewsThumbnail";
import { useCursorPage } from "../hooks/useCursorPage";
import type { NewsArticle } from "../types";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "./IntelligenceBadges";
import { hasVerifiedEnglishTitle, verifiedEnglishText } from "../utils/english";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { generatedNewsInsight, hasCompleteNewsInsight, localizedNewsInsight } from "../utils/newsInsight";

const ITEMS_PER_PAGE = 5;
const POINTER_INSIGHT_MAX_WIDTH = 560;
const POINTER_INSIGHT_SAFE_HEIGHT = 360;

export function StockNewsFeed({ stockCode: stockCodeOverride }: { stockCode?: string } = {}) {
  const { locale } = useLocale();
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
      sort: stockCode ? "LATEST" : "IMPORTANCE",
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
                {locale === "ko" ? newsFilterKo(item) : item}
              </button>
            ),
          )}
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label={locale === "ko" ? "이전" : "Previous"} disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            <img src="/assets/carousel-prev.svg" alt="" />
          </button>
          <button type="button" aria-label={locale === "ko" ? "다음" : "Next"} disabled={!canGoNext} onClick={() => setPage((current) => current + 1)}>
            <img src="/assets/carousel-next.svg" alt="" />
          </button>
        </div>
      </div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>
      {(value) => <div className="news-list">
        {value.items.filter(hasVerifiedEnglishTitle).slice(pageStart, pageStart + ITEMS_PER_PAGE).map((item) => (
          <NewsFeedRow item={item} returnTo={returnTo} key={item.id} />
        ))}
      </div>}
      </RemoteState>
      <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
    </>
  );
}

function newsFilterKo(value: string) {
  return ({
    All: "전체",
    "High priority": "중요 뉴스",
    Positive: "긍정",
    Negative: "부정",
    "My watchlist": "관심종목",
  } as Record<string, string>)[value] || value;
}

function NewsFeedRow({ item, returnTo }: { item: NewsArticle; returnTo: string }) {
  const { locale, t } = useLocale();
  const [hovered, setHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const cachedInsight = localizedNewsInsight(item, locale);
  const cached = hasCompleteNewsInsight(cachedInsight);
  const translation = useAutomaticTranslation(
    `/api/v1/news/${item.id}/translation?locale=${locale}`,
    hovered && !cached,
  );
  const generated = generatedNewsInsight(translation.data, locale);
  const insight = generated && hasCompleteNewsInsight(generated) ? generated : cachedInsight;
  const ready = hasCompleteNewsInsight(insight);
  const moveTooltip = (event: PointerEvent<HTMLAnchorElement>) => {
    const width = Math.min(POINTER_INSIGHT_MAX_WIDTH, window.innerWidth - 32);
    setPointer({
      x: Math.max(16, Math.min(event.clientX + 18, window.innerWidth - width - 16)),
      y: Math.max(16, Math.min(event.clientY + 18, window.innerHeight - POINTER_INSIGHT_SAFE_HEIGHT)),
    });
  };

  return (
    <Link
      to={`/news/${item.id}`}
      state={{ returnTo }}
      className="news-row"
      onPointerEnter={(event) => {
        setHovered(true);
        moveTooltip(event);
      }}
      onPointerMove={moveTooltip}
      onPointerLeave={() => setHovered(false)}
    >
      <NewsThumbnail src={item.thumbnailUrl} />
      <div>
        <IntelligenceBadges sentiment={item.sentiment} importance={item.importance} eventType={item.eventType} />
        <h2>{locale === "ko" ? item.originalTitle : verifiedEnglishText(item.englishTitle) || ""}</h2>
        <p>{item.publisher} · {formatDate(item.publishedAt)}</p>
      </div>
      {hovered ? (
        <aside
          className="news-pointer-insight"
          style={{ left: pointer.x, top: pointer.y }}
          aria-live="polite"
        >
          {[t("what"), t("why"), t("impact")].map((label, index) => {
            const value = [insight.what, insight.why, insight.impact][index];
            return <p key={label}><b>{label}</b>{ready && value ? <span>{value}</span> : <LoadingSkeleton className="insight-loading" />}</p>;
          })}
        </aside>
      ) : null}
    </Link>
  );
}
