import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, queryString } from "../api";
import { BackLink, Header } from "../components/Layout";
import { NewsThumbnail } from "../components/NewsThumbnail";
import { RemoteState, formatDate } from "../components/RemoteState";
import { ViewMoreButton } from "../components/ViewMoreButton";
import { WatchlistHeart } from "../components/WatchlistHeart";
import { useCursorPage } from "../hooks/useCursorPage";
import { useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock, StockDetail } from "../types";
import { isPublishedFiling, type PublishedFiling } from "../utils/disclosure";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { useLocale } from "../state/LocaleContext";
import { hasVerifiedEnglishTitle, verifiedEnglishText } from "../utils/english";
import { FilingSentimentDot } from "../components/FilingSentimentDot";
import { FitText } from "../components/FitText";
import { adaptiveTextClass } from "../utils/text";
import { stockCurrency } from "../utils/stockCurrency";
import { mapConcurrent } from "../utils/mapConcurrent";
import { FilingFilters, type FilingFiltersValue } from "./DisclosurePage";

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
  const [filters, setFilters] = useState<FilingFiltersValue>(() => ({ from: localDate(30), to: localDate(), types: [] }));
  const { from, to, types } = filters;
  const [stockPage, setStockPage] = useState({ query, start: 0 });
  const typeQuery = [...types].sort().join(",");

  const stocksState = useRemote(async (signal) => {
    if (!query) return { items: [] as Array<Stock | StockDetail> };
    const result = await api<{ items: Stock[] }>(`/api/v1/market/stocks/search${queryString({ query, limit: 75 })}`, { signal });
    const items = await mapConcurrent(result.items, 4, async (stock) => {
      try {
        return await api<StockDetail>(`/api/v1/market/stocks/${stock.stockCode}`, { signal });
      } catch {
        return stock;
      }
    });
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
		for (const filing of (filingsState.data?.items ?? []).filter(isPublishedFiling).filter(hasVerifiedEnglishTitle)) groups.set(filing.filedDate, [...(groups.get(filing.filedDate) ?? []), filing]);
    return [...groups.entries()];
  }, [filingsState.data]);
  const stockItems = stocksState.data?.items ?? [];
  const stockEnd = Math.max(0, stockItems.length - 4);
  const stockStart = stockPage.query === query ? Math.min(stockPage.start, stockEnd) : 0;
  const previousDisabled = stockStart === 0;
  const nextDisabled = stockStart >= stockEnd;
  const visibleStocks = stockItems.slice(stockStart, stockStart + 4);

  return <div className="search-page">
    <Header initialQuery={query} />
    <div className="search-hero"><div className="page-shell">
      <BackLink to="/" />
      <div className="search-hero-title"><div>
        <h1>{query ? (locale === "ko" ? `‘${query}’ 검색 결과` : `Search results for ‘${query}’`) : (locale === "ko" ? "한국 기업·공시·뉴스 검색" : "Search Korean companies, filings, and news")}</h1>
        <p>{query ? (locale === "ko" ? `일치 기업 ${stockItems.length}개와 최근 공시·관련 뉴스입니다.` : `${stockItems.length} matching companies, with their recent filings and related news.`) : (locale === "ko" ? "검색창에 기업명, 종목코드 또는 공시 키워드를 입력하세요." : "Enter a company name, ticker, or filing keyword in the search bar.")}</p>
      </div><div className="slider-controls">
        <button type="button" aria-label={locale === "ko" ? "이전 종목" : "Previous companies"} disabled={previousDisabled} onClick={() => setStockPage({ query, start: Math.max(0, stockStart - 1) })}><img className={previousDisabled ? "" : "is-reversed"} src={previousDisabled ? "/assets/carousel-prev.svg" : "/assets/carousel-next.svg"} alt="" /></button>
        <button type="button" aria-label={locale === "ko" ? "다음 종목" : "Next companies"} disabled={nextDisabled} onClick={() => setStockPage({ query, start: Math.min(stockEnd, stockStart + 1) })}><img className={nextDisabled ? "is-reversed" : ""} src={nextDisabled ? "/assets/carousel-prev.svg" : "/assets/carousel-next.svg"} alt="" /></button>
      </div></div>
      <RemoteState {...stocksState} empty={(value) => Boolean(query) && !value.items.length}>{() => <div className="search-stock-grid">
        {visibleStocks.map((stock) => <article className="search-stock-card" key={stock.stockCode}>
          <Link to={`/stocks/${stock.stockCode}`}><div className="search-stock-identity"><h2><FitText className="search-stock-name" value={stockName(stock)} /></h2><span>{stock.stockCode} · {stock.market}</span></div>
            <div className="search-stock-values"><div><strong>{stockCurrency(stock.quote?.currentPriceKrw, "exchangeRate" in stock ? stock.exchangeRate.krwPerUnit : null, locale)}</strong><small>{stockCurrency(stock.quote?.currentPriceKrw, "exchangeRate" in stock ? stock.exchangeRate.krwPerUnit : null, locale, false)}</small></div>
            <p className={stock.quote?.changeRate == null ? "" : stock.quote.changeRate < 0 ? "is-down" : "is-up"}><span>{stockCurrency(stock.quote?.changeAmountKrw, "exchangeRate" in stock ? stock.exchangeRate.krwPerUnit : null, locale, true, true)}</span><span>{stock.quote?.changeRate == null ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${stock.quote.changeRate >= 0 ? "+" : ""}${stock.quote.changeRate.toFixed(2)}%`}</span></p></div>
          </Link><WatchlistHeart className="stock-result-heart" itemId={stock.stockCode} itemName={stock.nameEn || stock.nameKo} />
        </article>)}
      </div>}</RemoteState>
    </div></div>

    <main className="page-shell search-content"><section>
      <div className="search-section-title"><h2>{locale === "ko" ? "관련 공시" : "Related disclosures"}</h2></div>
      <FilingFilters value={filters} onChange={setFilters} />
      <RemoteState {...filingsState} empty={(value) => !value.items.length}>{() => <div className="search-filings disclosure-rows">
        {liveFilingGroups.map(([day, rows]) => <section key={day}><header><span>{formatDate(day, false)}</span><span>{locale === "ko" ? `공시 ${rows.length}건` : `${rows.length} filings shown`}</span></header>
          {rows.map((filing) => <Link to={`/disclosures/${filing.receiptNumber}`} key={filing.receiptNumber}>
            <span>{formatDate(filing.detectedAt)}</span><FilingSentimentDot sentiment={filing.sentiment} /><span><FitText className="filing-issuer" value={stockName({ nameEn: filing.issuerNameEn, nameKo: filing.issuerNameKo })} /><small>{filing.stockCode} · {filing.market}</small></span>
            <strong className={adaptiveTextClass(locale === "ko" ? filing.titleKo : verifiedEnglishText(filing.titleEn) || "", "filing-title")}><span>{locale === "ko" ? filing.titleKo : verifiedEnglishText(filing.titleEn) || ""}</span></strong><span className="filing-row-badges"><IntelligenceBadges variant="filing" sentiment={filing.sentiment} importance={filing.importance} eventType={filing.eventType} /></span>
          </Link>)}
        </section>)}
      </div>}</RemoteState>
      <ViewMoreButton resource="filings" hasMore={Boolean(filingsState.data?.nextCursor)} loading={filingsState.loadingMore} error={filingsState.loadMoreError} onClick={() => void filingsState.loadMore()} />
    </section>

    <section className="related-news"><div className="search-section-title"><h2>{locale === "ko" ? "관련 뉴스" : "Related news"}</h2><span>{locale === "ko" ? `${newsState.data?.items.length ?? 0}건` : `${newsState.data?.items.length ?? 0} shown`}</span></div>
      <RemoteState {...newsState} empty={(value) => !value.items.length}>{(value) => <>{value.items.filter(hasVerifiedEnglishTitle).map((item) => <Link to={`/news/${item.id}`} key={item.id}>
        <NewsThumbnail src={item.thumbnailUrl} /><div><IntelligenceBadges sentiment={item.sentiment} importance={item.importance} eventType={item.eventType} /><h3>{locale === "ko" ? item.originalTitle : verifiedEnglishText(item.englishTitle) || ""}</h3><p>{item.publisher} · {formatDate(item.publishedAt)}</p></div>
      </Link>)}</>}</RemoteState>
      <ViewMoreButton resource="news" hasMore={Boolean(newsState.data?.nextCursor)} loading={newsState.loadingMore} error={newsState.loadMoreError} onClick={() => void newsState.loadMore()} />
    </section></main>
  </div>;
}
