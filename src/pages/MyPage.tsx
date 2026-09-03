import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, session, ApiError } from "../api";
import { BackLink, Header } from "../components/Layout";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock } from "../types";
import { useLocale } from "../state/LocaleContext";
import { TaxEligibilityLink } from "../components/TaxEligibilityLink";
import { DefaultAvatar } from "../components/DefaultAvatar";
import { IntelligenceBadges } from "../components/IntelligenceBadges";
import { useWatchlist } from "../state/WatchlistContext";
import { isValidPassword, PASSWORD_HELP } from "../utils/password";
import { mapConcurrent } from "../utils/mapConcurrent";

type Recent = { itemType: "STOCK" | "NEWS" | "FILING"; referenceId: string; stockCode: string | null; viewedAt: string };
type Activity = { type: "NEWS" | "FILING" | "STOCK"; id: string; titleEn: string; titleKo: string; date: string; sentiment?: string | null; importance?: string | null; eventType?: string | null };

function newsActivity(news: NewsArticle, date = news.publishedAt): Activity | null {
  return news.englishTitle ? { type: "NEWS", id: news.id, titleEn: news.englishTitle, titleKo: news.originalTitle, date, sentiment: news.sentiment, importance: news.importance, eventType: news.eventType } : null;
}
function filingActivity(filing: Filing, date = filing.detectedAt): Activity | null {
  return filing.titleEn ? { type: "FILING", id: filing.receiptNumber, titleEn: filing.titleEn, titleKo: filing.titleKo, date, sentiment: filing.sentiment, importance: filing.importance, eventType: filing.eventType } : null;
}

export function MyPage() {
  const { locale } = useLocale();
  const profile = useProfile();
  const userId = profile?.id;
  const { remove: removeWatchlist } = useWatchlist();
  const watchlist = useRemote((signal) => userId ? api<{ items: Stock[] }>("/api/v1/market/stocks?watchlist=true&limit=75", { signal }) : Promise.resolve({ items: [] }), [userId]);
  const fx = useRemote((signal) => api<{ krwPerUnit: number | null }>("/api/v1/market/exchange-rates/USD", { signal }), []);
  const recent = useRemote(async (signal) => {
    if (!userId) return [];
    const items = await api<Recent[]>("/api/v1/me/recently-viewed?limit=30", { signal });
    const resolved = await mapConcurrent(items, 4, async (item): Promise<Activity | null> => {
      try {
        if (item.itemType === "NEWS") return newsActivity(await api<NewsArticle>(`/api/v1/news/${item.referenceId}`, { signal }), item.viewedAt);
        if (item.itemType === "FILING") return filingActivity(await api<Filing>(`/api/v1/disclosures/${item.referenceId}`, { signal }), item.viewedAt);
        const stock = await api<Stock>(`/api/v1/market/stocks/${item.referenceId}`, { signal });
        return { type: "STOCK", id: stock.stockCode, titleEn: stock.nameEn, titleKo: stock.nameKo, date: item.viewedAt };
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      }
    });
    return resolved.filter((item): item is Activity => item !== null);
  }, [userId]);
  const feed = useRemote(async (signal) => {
    if (!userId || !watchlist.data?.items.length) return [];
    const [news, filingPages] = await Promise.all([
      api<{ items: NewsArticle[] }>("/api/v1/news?watchlist=true&limit=20", { signal }),
      mapConcurrent(watchlist.data.items, 4, (stock) => api<{ items: Filing[] }>(`/api/v1/disclosures?stockCode=${stock.stockCode}&limit=10`, { signal })),
    ]);
    const items = [...news.items.map((item) => newsActivity(item)), ...filingPages.flatMap((page) => page.items.map((item) => filingActivity(item)))].filter((item): item is Activity => item !== null);
    return [...new Map(items.map((item) => [`${item.type}-${item.id}`, item])).values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [userId, watchlist.data]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  if (!profile) return <div className="my-page"><Header white /><main className="page-shell my-shell"><BackLink to="/" /><div className="api-state"><b>{locale === "ko" ? "로그인이 필요합니다" : "Sign in required"}</b><span>{locale === "ko" ? "관심종목, 열람 기록과 맞춤 피드는 비공개 정보입니다." : "Your watchlist, history, and personalized feed are private."}</span><Link className="login-button" to="/login?returnTo=%2Fmy">{locale === "ko" ? "로그인" : "Log in"}</Link></div></main></div>;
  const visibleStocks = watchlist.data?.items.slice(0, watchlistExpanded ? undefined : 6) || [];
  const removeSelected = async () => {
    setRemoving(true); setRemoveError("");
    try {
      await mapConcurrent([...selected], 4, async (stockCode) => {
        await removeWatchlist(stockCode);
        setSelected((current) => { const next = new Set(current); next.delete(stockCode); return next; });
      });
      setSelected(new Set());
    } catch (error) { setRemoveError(error instanceof Error ? error.message : "Unable to update watchlist."); }
    finally { setRemoving(false); watchlist.retry(); }
  };
  const taxStatus = ({
    NOT_STARTED: locale === "ko" ? "세무 등록 전" : "Tax filing not started",
    VERIFIED: locale === "ko" ? "세무 검증 완료" : "Tax verified",
    REVIEW_REQUIRED: locale === "ko" ? "세무 검토 필요" : "Tax review required",
    REJECTED: locale === "ko" ? "세무 재제출 필요" : "Tax resubmission required",
  } as Record<string, string>)[profile.taxVerificationStatus] || (locale === "ko" ? "세무 상태 확인 필요" : "Tax status unavailable");
  return <div className="my-page"><Header white /><main className="page-shell my-shell"><BackLink to="/" />
    <section className="profile-row"><DefaultAvatar /><div><h1>{profile.loginId}</h1><div><span>{profile.nationality === "US" ? <img src="/assets/flag-us.svg" alt="" /> : null}{profile.nationality === "US" ? locale === "ko" ? "미국" : "United States" : profile.nationality}</span><span className={profile.taxVerificationStatus === "VERIFIED" ? "safe" : ""}>{taxStatus}</span><span>{profile.investorType === "INDIVIDUAL" ? locale === "ko" ? "개인 투자자" : "Individual" : locale === "ko" ? "기관·법인" : "Institutional"}</span></div></div><TaxEligibilityLink>{locale === "ko" ? "세무 등록 완료하기" : "Complete tax filing"} <img src="/assets/chevron-right-white.svg" alt="" /></TaxEligibilityLink></section>
    <DashboardSection title={locale === "ko" ? "최근 본 항목" : "Recently viewed"} description={locale === "ko" ? "최근 열어 본 종목, 뉴스와 공시를 순서대로 표시합니다." : "Your recent activity, automatically organized for quick access."}><RemoteState {...recent} empty={(value) => !value.length}>{(items) => <ActivityList items={items} />}</RemoteState></DashboardSection>
    <DashboardSection title={locale === "ko" ? "내 관심종목" : "My watchlist"} description={locale === "ko" ? "검색 또는 종목 화면의 하트 버튼으로 기업을 추가하세요." : "Add companies with the heart button in search or on a company page."}>
      {removeError ? <p role="alert" className="auth-error">{removeError}</p> : null}
      <RemoteState {...watchlist} empty={(value) => !value.items.length}>{(value) => <div className="watchlist"><header><label className="watch-select-all"><input type="checkbox" checked={value.items.length > 0 && selected.size === value.items.length} onChange={(event) => setSelected(new Set(event.target.checked ? value.items.map((item) => item.stockCode) : []))} disabled={removing} /> {selected.size}{locale === "ko" ? "개 선택" : " selected"}</label><button aria-label={locale === "ko" ? "선택 항목 삭제" : "Delete selected"} disabled={!selected.size || removing} onClick={() => void removeSelected()}><img src="/assets/trash.svg" alt="" /></button></header><div className="watch-table"><div className="watch-head"><span>{locale === "ko" ? "기업" : "Company"}</span><span>{locale === "ko" ? "가격 (KRW)" : "Price (USD)"}</span><span>{locale === "ko" ? "변동" : "Change"}</span><span>%</span><span>{locale === "ko" ? "규제 상태" : "Regulatory status"}</span></div>{visibleStocks.map((stock) => <WatchRow stock={stock} usdKrw={fx.data?.krwPerUnit ?? null} selected={selected.has(stock.stockCode)} toggle={() => setSelected((current) => { const next = new Set(current); if (next.has(stock.stockCode)) next.delete(stock.stockCode); else next.add(stock.stockCode); return next; })} key={stock.stockCode} />)}</div>{!watchlistExpanded && value.items.length > 6 ? <button type="button" className="watchlist-more" onClick={() => setWatchlistExpanded(true)}>{locale === "ko" ? "관심종목 더 보기" : "View more watchlist"}<img src="/assets/chevron-right-gold.svg" alt="" /></button> : null}</div>}</RemoteState>
    </DashboardSection>
    <DashboardSection title={locale === "ko" ? "통합 인텔리전스 피드" : "Integrated intelligence feed"} description={locale === "ko" ? "관심종목과 관련된 뉴스와 공시만 표시합니다." : "News and filings filtered to your watchlist only."}><RemoteState {...feed} empty={(value) => !value.length}>{(items) => <ActivityList items={items} />}</RemoteState></DashboardSection>
    <DashboardSection title={locale === "ko" ? "계정 보안" : "Account security"} description={locale === "ko" ? "비밀번호 변경, 세션 종료 또는 계정 삭제를 관리합니다." : "Change your password, close sessions, or delete your account."}><AccountSecurity /></DashboardSection>
  </main></div>;
}

function AccountSecurity() {
  const { locale } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    if (!isValidPassword(newPassword)) { setError(PASSWORD_HELP[locale]); return; }
    try {
      await api("/api/v1/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm: confirm }) });
      setCurrentPassword(""); setNewPassword(""); setConfirm(""); setMessage(locale === "ko" ? "비밀번호가 변경되었습니다." : "Password updated.");
      session.clear();
    } catch (reason) { setError(locale === "ko" ? "비밀번호를 변경하지 못했습니다." : reason instanceof Error ? reason.message : "Password could not be changed."); }
  };
  const logoutAll = async () => {
    setMessage(""); setError("");
    try { await api("/api/v1/auth/logout-all", { method: "POST" }); session.clear(); }
    catch (reason) { setError(locale === "ko" ? "세션을 종료하지 못했습니다." : reason instanceof Error ? reason.message : "Sessions could not be closed."); }
  };
  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    try { await api("/api/v1/me", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) }); session.clear(); window.location.assign("/"); }
    catch (reason) { setError(locale === "ko" ? "계정을 삭제하지 못했습니다." : reason instanceof Error ? reason.message : "Account could not be deleted."); }
  };
  return <div className="account-security"><form onSubmit={(event) => void changePassword(event)}><h3>{locale === "ko" ? "비밀번호 변경" : "Change password"}</h3><small>{PASSWORD_HELP[locale]}</small><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder={locale === "ko" ? "현재 비밀번호" : "Current password"} autoComplete="current-password" required /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={locale === "ko" ? "새 비밀번호" : "New password"} autoComplete="new-password" required /><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={locale === "ko" ? "새 비밀번호 확인" : "Confirm new password"} autoComplete="new-password" required /><button disabled={!currentPassword || !isValidPassword(newPassword) || newPassword !== confirm}>{locale === "ko" ? "비밀번호 변경" : "Update password"}</button></form><div><h3>{locale === "ko" ? "세션" : "Sessions"}</h3><p>{locale === "ko" ? "모든 활성 세션을 종료합니다. 다시 로그인해야 합니다." : "Close every active session. You will need to log in again."}</p><button type="button" onClick={() => { setError(""); void session.logout().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to log out.")); }}>{locale === "ko" ? "로그아웃" : "Log out"}</button><button type="button" onClick={() => void logoutAll()}>{locale === "ko" ? "모든 기기에서 로그아웃" : "Log out all devices"}</button></div><form className="danger-zone" onSubmit={(event) => void deleteAccount(event)}><h3>{locale === "ko" ? "계정 삭제" : "Delete account"}</h3><p>{locale === "ko" ? "계정을 즉시 비활성화하고 서버 보존 절차를 시작합니다." : "This immediately disables the account and starts the server retention process."}</p><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder={locale === "ko" ? "확인을 위해 비밀번호 입력" : "Enter password to confirm"} autoComplete="current-password" required /><button disabled={!deletePassword}>{locale === "ko" ? "내 계정 삭제" : "Delete my account"}</button></form>{message ? <p className="auth-success" role="status">{message}</p> : null}{error ? <p className="auth-error" role="alert">{error}</p> : null}</div>;
}

function WatchRow({ stock, selected, toggle, usdKrw }: { stock: Stock; selected: boolean; toggle: () => void; usdKrw: number | null }) {
  const { locale, stockName } = useLocale();
  const quote = stock.quote;
  const rate = stock.foreignOwnership?.limitExhaustionRate;
  const statusKey = rate === null || rate === undefined ? "unavailable" : rate >= 100 ? "danger" : rate >= 90 ? "warning" : "open";
  const status = locale === "ko" ? ({ unavailable: "정보 없음", danger: "한도 도달", warning: "한도 근접", open: "여유" } as const)[statusKey] : ({ unavailable: "Unavailable", danger: "Near reached", warning: "Near cap", open: "Open" } as const)[statusKey];
  const changeAmount = quote?.changeAmountKrw;
  const changeRate = quote?.changeRate;
  const amountTone = changeAmount == null ? "" : changeAmount >= 0 ? "safe-text" : "danger-text";
  const rateTone = changeRate == null ? "watch-change" : changeRate >= 0 ? "safe watch-change" : "danger watch-change";
  return <div className="watch-row"><div className="watch-company"><button className={`watch-check ${selected ? "checked" : ""}`} onClick={toggle} aria-pressed={selected} aria-label={`${stockName(stock)} ${locale === "ko" ? selected ? "선택 해제" : "선택" : selected ? "unselect" : "select"}`}>{selected ? <img src="/assets/checkbox-checked.svg" alt="" /> : null}</button><Link to={`/stocks/${stock.stockCode}`}><b>{stockName(stock)}</b><small>{stock.stockCode} · {stock.market}</small></Link></div><Money value={quote?.currentPriceKrw} usdKrw={usdKrw} /><span className={amountTone}><Money value={changeAmount} usdKrw={usdKrw} /></span><span className={rateTone}>{changeRate == null ? null : <img src={changeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />}{changeRate == null ? (locale === "ko" ? "정보 없음" : "Unavailable") : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`}</span><span className={statusKey === "danger" ? "stock-danger watch-status" : statusKey === "warning" ? "warning-chip watch-status" : "watch-status"}>{status}</span></div>;
}

function Money({ value, usdKrw }: { value: number | null | undefined; usdKrw: number | null }) {
  const { locale } = useLocale();
  const won = value == null ? formatNumber(null) : `₩${formatNumber(value)}`;
  const usd = value == null || !usdKrw ? formatNumber(null) : `$${formatNumber(value / usdKrw, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <span className="watch-money">{locale === "ko" ? won : usd}<small>{locale === "ko" ? usd : won}</small></span>;
}

function ActivityList({ items }: { items: Activity[] }) {
  const { locale } = useLocale();
  const [page, setPage] = useState(0);
  const start = Math.min(page * 5, Math.max(0, Math.ceil(items.length / 5) - 1) * 5);
  return <div className="activity-carousel"><div className="carousel-controls">
    <button type="button" disabled={start === 0} aria-label={locale === "ko" ? "이전 항목" : "Previous items"} onClick={() => setPage((value) => Math.max(0, value - 1))}><img src="/assets/carousel-prev.svg" alt="" /></button>
    <button type="button" disabled={start + 5 >= items.length} aria-label={locale === "ko" ? "다음 항목" : "Next items"} onClick={() => setPage((value) => value + 1)}><img src="/assets/carousel-next.svg" alt="" /></button>
  </div><div className="activity-list">{items.slice(start, start + 5).map((item) => <Link to={item.type === "NEWS" ? `/news/${item.id}` : item.type === "FILING" ? `/disclosures/${item.id}` : `/stocks/${item.id}`} key={`${item.type}-${item.id}`}><div className="activity-copy"><span>{item.type === "NEWS" ? locale === "ko" ? "뉴스" : "News" : item.type === "FILING" ? locale === "ko" ? "공시" : "Disclosure" : locale === "ko" ? "종목" : "Company"}</span><b>{locale === "ko" ? item.titleKo : item.titleEn}</b><small>{formatDate(item.date)}</small></div>{item.type !== "STOCK" ? <IntelligenceBadges sentiment={item.sentiment} importance={item.importance} eventType={item.eventType} variant={item.type === "FILING" ? "filing" : "news"} /> : null}</Link>)}</div></div>;
}

function DashboardSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="dashboard-section"><div className="dashboard-title"><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>;
}
