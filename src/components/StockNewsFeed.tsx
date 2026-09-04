import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "./RemoteState";
import { NewsThumbnail } from "./NewsThumbnail";
import { useCursorPage } from "../hooks/useCursorPage";
import type { NewsArticle } from "../types";
import { useLocale } from "../state/LocaleContext";
import { IntelligenceBadges } from "./IntelligenceBadges";
import { hasVerifiedEnglishTitle, verifiedEnglishText } from "../utils/english";
import { useAutomaticTranslation } from "../hooks/useAutomaticTranslation";
import { useTouchInsight } from "../hooks/useTouchInsight";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { generatedNewsInsight, hasCompleteNewsInsight, localizedNewsInsight } from "../utils/newsInsight";

const POINTER_INSIGHT_MAX_WIDTH = 560;
const POINTER_INSIGHT_SAFE_HEIGHT = 360;

export function StockNewsFeed({ stockCode: stockCodeOverride }: { stockCode?: string } = {}) {
  const { locale } = useLocale();
  const [filter, setFilter] = useState("All");
  const loadTrigger = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    const trigger = loadTrigger.current;
    if (!trigger || newsState.loading || newsState.loadingMore || newsState.loadMoreError || !newsState.data?.nextCursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void newsState.loadMore();
    }, { rootMargin: "400px" });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [newsState.data?.nextCursor, newsState.loading, newsState.loadingMore, newsState.loadMoreError, newsState.loadMore]);

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
      </div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>
      {(value) => <div className="news-list">
        {value.items.filter(hasVerifiedEnglishTitle).map((item) => (
          <NewsFeedRow item={item} returnTo={returnTo} key={item.id} />
        ))}
      </div>}
      </RemoteState>
      <div ref={loadTrigger} className="news-load-trigger" />
      {newsState.loadingMore ? <div className="news-list" role="status" aria-label={locale === "ko" ? "뉴스를 불러오는 중" : "Loading news"}>
        {[0, 1].map((key) => <div className="news-row" key={key}><LoadingSkeleton lines={4} /><LoadingSkeleton lines={5} /></div>)}
      </div> : null}
      {newsState.loadMoreError ? <div role="alert"><p>{newsState.loadMoreError.message}</p><button type="button" className="login-button" onClick={() => void newsState.loadMore()}>{locale === "ko" ? "다시 불러오기" : "Retry loading"}</button></div> : null}
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
  const touchInsight = useTouchInsight();
  const { locale, t } = useLocale();
  const [hovered, setHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const cachedInsight = localizedNewsInsight(item, locale);
  const cached = hasCompleteNewsInsight(cachedInsight);
  const translation = useAutomaticTranslation(
    `/api/v1/news/${item.id}/translation?locale=${locale}`,
    (hovered || touchInsight.active) && !cached,
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
      className={`news-row${touchInsight.active ? " is-scroll-active" : ""}`}
      onPointerEnter={(event) => {
        if (touchInsight.touch) return;
        setHovered(true);
        moveTooltip(event);
      }}
      onPointerMove={moveTooltip}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <NewsThumbnail src={item.thumbnailUrl} />
      <div ref={touchInsight.anchor}>
        <IntelligenceBadges sentiment={item.sentiment} importance={item.importance} eventType={item.eventType} />
        <h2>{locale === "ko" ? item.originalTitle : verifiedEnglishText(item.englishTitle) || ""}</h2>
        <p>{item.publisher} · {formatDate(item.publishedAt)}</p>
      </div>
      {hovered || touchInsight.active ? (
        <aside
          className={touchInsight.touch ? "news-inline-insight" : "news-pointer-insight"}
          style={touchInsight.touch ? undefined : { left: pointer.x, top: pointer.y }}
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
