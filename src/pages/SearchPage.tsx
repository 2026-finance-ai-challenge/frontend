import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, queryString } from "../api";
import { BackLink, Header } from "../components/Layout";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock, StockDetail } from "../types";
import { isPublishedFiling, type PublishedFiling } from "../utils/disclosure";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { useLocale } from "../state/LocaleContext";
import { verifiedEnglishText } from "../utils/english";

const filterGroups = [
  { title: "Reporting & Governance", items: [["Periodic Reports", "PERIODIC"], ["Audit Reports", "AUDIT"], ["Fair Trade", "FAIR_TRADE"]] },
  { title: "Capital & Shareholder Returns", items: [["Issuance Docs", "ISSUANCE"], ["Ownership Disclosure", "OWNERSHIP"], ["Asset Securitization", "SECURITIZATION"], ["Investment Funds", "FUND"]] },
  { title: "Corporate Events & Control", items: [["Major Management Matters", "MATERIAL_EVENT"], ["Exchange Notices", "EXCHANGE"], ["Other", "OTHER"]] },
] as const;

type DisclosureType = typeof filterGroups[number]["items"][number][1];
const rangeDays: Record<string, number> = { "1D": 0, "1W": 7, "1M": 31, "3M": 93, "1Y": 366 };

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function SearchPage() {
  const { locale, stockName } = useLocale();
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [range, setRange] = useState("1M");
  const [from, setFrom] = useState(() => localDate(31));
  const [to, setTo] = useState(() => localDate());
  const [types, setTypes] = useState<Set<DisclosureType>>(() => new Set());
  const [stockStart, setStockStart] = useState(0);
  const typeQuery = [...types].sort().join(",");

  const stocksState = useRemote(async (signal) => {
    if (!query) return { items: [] as Array<Stock | StockDetail> };
    const result = await api<{ items: Stock[] }>(`/api/v1/market/stocks/search${queryString({ query, limit: 20 })}`, { signal });
    const items = await Promise.all(result.items.map(async (stock) => {
      try {
        return await api<StockDetail>(`/api/v1/market/stocks/${stock.stockCode}`, { signal });
      } catch {
        return stock;
      }
    }));
    return { items };
  }, [query]);
  const filingsState = useCursorPage(
    (cursor, signal) => query
      ? api<{ items: Filing[]; nextCursor: string | null }>(`/api/v1/disclosures${queryString({ query, from, to, types: typeQuery || null, cursor, limit: 20 })}`, { signal })
      : Promise.resolve({ items: [], nextCursor: null }),
    [query, from, to, typeQuery],
    (item) => item.receiptNumber,
  );
  const newsState = useCursorPage(
    (cursor, signal) => query
      ? api<{ items: NewsArticle[]; nextCursor: string | null }>(`/api/v1/news${queryString({ query, sort: "IMPORTANCE", cursor, limit: 20 })}`, { signal })
      : Promise.resolve({ items: [], nextCursor: null }),
    [query],
    (item) => item.id,
  );
  const liveFilingGroups = useMemo(() => {
		const groups = new Map<string, PublishedFiling[]>();
		for (const filing of (filingsState.data?.items ?? []).filter(isPublishedFiling)) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
    return [...groups.entries()];
  }, [filingsState.data]);
  const stockItems = stocksState.data?.items ?? [];
  const visibleStocks = stockItems.slice(stockStart, stockStart + 4);

  const selectRange = (nextRange: string) => {
    setRange(nextRange);
    setFrom(localDate(rangeDays[nextRange]));
    setTo(localDate());
  };
  const resetFilters = () => {
    setRange(""); setFrom(""); setTo(""); setTypes(new Set());
  };
  const toggleType = (type: DisclosureType) => {
    setTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return <div className="search-page">
    <Header initialQuery={query} />
    <div className="search-hero"><div className="page-shell">
      <BackLink to="/" />
      <div className="search-hero-title"><div>
        <h1>{query ? (locale === "ko" ? `‘${query}’ 검색 결과` : `Search results for ‘${query}’`) : (locale === "ko" ? "한국 기업·공시·뉴스 검색" : "Search Korean companies, filings, and news")}</h1>
        <p>{query ? (locale === "ko" ? `일치 기업 ${stockItems.length}개와 최근 공시·관련 뉴스입니다.` : `${stockItems.length} matching companies, with their recent filings and related news.`) : (locale === "ko" ? "검색창에 기업명, 종목코드 또는 공시 키워드를 입력하세요." : "Enter a company name, ticker, or filing keyword in the search bar.")}</p>
      </div><div className="slider-controls">
        <button type="button" aria-label="Previous companies" disabled={stockStart === 0} onClick={() => setStockStart((current) => Math.max(0, current - 1))}><img src="/assets/carousel-prev.svg" alt="" /></button>
        <button type="button" aria-label="Next companies" disabled={stockStart + 4 >= stockItems.length} onClick={() => setStockStart((current) => current + 1)}><img src="/assets/carousel-next.svg" alt="" /></button>
      </div></div>
      <RemoteState {...stocksState} empty={(value) => Boolean(query) && !value.items.length}>{() => <div className="search-stock-grid">
        {visibleStocks.map((stock) => <article className="search-stock-card" key={stock.stockCode}>
          <Link to={`/stocks/${stock.stockCode}`}><div><h2>{stockName(stock)}</h2><span>{stock.stockCode} · {stock.market}</span></div>
            <strong>{formatNumber(stock.quote?.currentPriceKrw, { style: "currency", currency: "KRW", maximumFractionDigits: 0 })}</strong>
            <p><span>{formatNumber(stock.quote?.changeAmountKrw)}</span><span>{stock.quote?.changeRate == null ? stock.quote?.status || "Unavailable" : `${stock.quote.changeRate >= 0 ? "+" : ""}${stock.quote.changeRate.toFixed(2)}%`}</span></p>
          </Link><WatchlistHeart className="stock-result-heart" itemId={stock.stockCode} itemName={stock.nameEn || stock.nameKo} />
        </article>)}
      </div>}</RemoteState>
    </div></div>

    <main className="page-shell search-content"><section>
      <div className="search-section-title"><h2>{locale === "ko" ? "관련 공시" : "Related disclosures"}</h2></div>
      <section className="filing-filters search-filing-filters">
        <div className="date-filter"><span>{locale === "ko" ? "기간" : "Date range"}</span>
          <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}" value={from} onChange={(event) => { setRange(""); setFrom(event.target.value); }} aria-label="Start date" /><b>–</b>
          <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}" value={to} onChange={(event) => { setRange(""); setTo(event.target.value); }} aria-label="End date" />
          {Object.keys(rangeDays).map((item) => <button type="button" className={range === item ? "active" : ""} onClick={() => selectRange(item)} key={item}>{item}</button>)}
          <button type="button" className="reset" onClick={resetFilters}>{locale === "ko" ? "초기화" : "Reset"}</button>
        </div>
        {filterGroups.map((group) => <div className="checkbox-row" key={group.title}><span>{group.title}</span>
          {group.items.map(([label, type]) => <label key={type}><input type="checkbox" checked={types.has(type)} onChange={() => toggleType(type)} />{label}</label>)}
        </div>)}
      </section>
      <RemoteState {...filingsState} empty={(value) => !value.items.length}>{() => <div className="search-filings">
        {liveFilingGroups.map(([day, rows]) => <section key={day}><header><span>{formatDate(day, false)}</span><span>{locale === "ko" ? `공시 ${rows.length}건` : `${rows.length} filings shown`}</span></header>
          {rows.map((filing) => <Link to={`/disclosures/${filing.receiptNumber}`} key={filing.receiptNumber}>
            <span>{formatDate(filing.detectedAt)}</span><i className={filing.correction ? "red" : "neutral"} /><span><b>{stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo })}</b><small>{filing.stockCode} · {filing.market}</small></span>
            <strong>{locale === "ko" ? filing.titleKo : verifiedEnglishText(filing.titleEn) || "English title is being prepared…"}</strong><span className="filing-row-badges"><IntelligenceBadges sentiment={filing.sentiment} importance={filing.importance} eventType={filing.eventType} /></span>
          </Link>)}
        </section>)}
      </div>}</RemoteState>
      <ViewMoreButton resource="filings" hasMore={Boolean(filingsState.data?.nextCursor)} loading={filingsState.loadingMore} error={filingsState.loadMoreError} onClick={() => void filingsState.loadMore()} />
    </section>

    <section className="related-news"><div className="search-section-title"><h2>{locale === "ko" ? "관련 뉴스" : "Related news"}</h2><span>{locale === "ko" ? `${newsState.data?.items.length ?? 0}건` : `${newsState.data?.items.length ?? 0} shown`}</span></div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>{(value) => <>{value.items.map((item) => <Link to={`/news/${item.id}`} key={item.id}>
        <NewsThumbnail src={item.thumbnailUrl} /><div><div className="tags">
          <span className={item.sentiment === "NEGATIVE" ? "negative" : item.sentiment === "POSITIVE" ? "positive" : "neutral"}><img src={item.sentiment === "NEGATIVE" ? "/assets/trend-down.svg" : item.sentiment === "POSITIVE" ? "/assets/trend-up.svg" : "/assets/trend-neutral.svg"} alt="" />{item.sentiment || "Analysis pending"}</span>
          <span className={item.importance === "MEDIUM" ? "medium" : item.importance === "HIGH" || item.importance === "CRITICAL" ? "priority" : ""}>{item.importance ? `${item.importance} priority` : "Analysis pending"}</span>
          {item.eventType ? <span>{item.eventType}</span> : null}
        </div><h3>{locale === "ko" ? item.originalTitle : verifiedEnglishText(item.englishTitle) || "English title is being prepared…"}</h3><p>{item.publisher} · {formatDate(item.publishedAt)} · {locale === "ko" ? "한글 원문" : "Auto-translated title"}</p></div>
      </Link>)}</>}</RemoteState>
      <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
    </section></main>
  </div>;
}
