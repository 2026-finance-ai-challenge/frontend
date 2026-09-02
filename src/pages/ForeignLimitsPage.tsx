import { BackLink, Footer, Header } from "../components/Layout";
import { ForeignOwnershipCard, ownershipExhaustion, ownershipTone } from "../components/ForeignOwnershipCard";
import { RemoteState } from "../components/RemoteState";
import { api } from "../api";
import { useRemote } from "../hooks/useRemote";
import { useRegularMarketDay } from "../hooks/useRegularMarketDay";
import { useMarketRefresh } from "../hooks/useMarketRefresh";
import { useLocale } from "../state/LocaleContext";
import type { ForeignLimitMonitor } from "../types";

const STATUTORY_LIMIT_STOCK_COUNT = 33;

export function ForeignLimitsPage() {
  const { locale } = useLocale();
  const regularDay = useRegularMarketDay();
  const state = useRemote(
    (signal) => api<ForeignLimitMonitor[]>("/api/v1/market/foreign-limits", { signal }),
    [regularDay],
  );
  useMarketRefresh(regularDay, state.loading, state.retry);
  const items = [...(state.data ?? [])].sort((a, b) => ownershipExhaustion(b) - ownershipExhaustion(a));

  return (
    <div className="foreign-limits-page">
      <Header white />
      <main className="page-shell foreign-limits-main">
        <BackLink to="/" />
        <div className="foreign-limits-heading">
          <div>
            <h1>{locale === "ko" ? "외국인 보유 한도" : "Foreign ownership limit gauge"}</h1>
            <p>{locale === "ko"
              ? "법정 외국인 보유 한도가 적용되는 지원 종목의 최신 보유 현황입니다."
              : "Live ownership headroom for supported Korean stocks subject to statutory foreign ownership caps."}</p>
          </div>
          <strong><b>{state.data ? items.length : "—"}</b> / {STATUTORY_LIMIT_STOCK_COUNT} {locale === "ko" ? "종목 지원" : "stocks supported"}</strong>
        </div>
        <div className="foreign-limit-statuses" aria-label={locale === "ko" ? "지원 종목 상태" : "Supported stock status"}>
          <span><b className="danger-text">{items.filter((item) => ownershipTone(item) === "danger").length}</b>{locale === "ko" ? "한도 도달" : "At the cap"}</span>
          <span><b className="warning-text">{items.filter((item) => ownershipTone(item) === "warning").length}</b>{locale === "ko" ? "한도 근접" : "Near the cap"}</span>
          <span><b className="safe-text">{items.filter((item) => ownershipTone(item) === "safe").length}</b>{locale === "ko" ? "여유" : "Open"}</span>
        </div>
        <RemoteState {...state} empty={(value) => !value.length}>
          {() => <div className="foreign-limit-index-grid">{items.map((item) => <ForeignOwnershipCard item={item} regularDay={regularDay} key={item.stock.stockCode} />)}</div>}
        </RemoteState>
      </main>
      <Footer />
    </div>
  );
}
