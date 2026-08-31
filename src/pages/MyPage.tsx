import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, session } from "../api";
import { BackLink, Header } from "../components/Layout";
import { RemoteState, formatDate, formatNumber } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { Filing, NewsArticle, Stock } from "../types";

type Recent = { itemType: "STOCK" | "NEWS" | "FILING"; referenceId: string; stockCode: string | null; viewedAt: string };
type FeedItem = { type: "NEWS"; date: string; news: NewsArticle } | { type: "FILING"; date: string; filing: Filing };

export function MyPage() {
  const profile = useProfile();
  const watchlist = useRemote((signal) => profile ? api<{ items: Stock[] }>("/api/v1/market/stocks?watchlist=true&limit=75", { signal }) : Promise.resolve({ items: [] }), [profile]);
  const recent = useRemote((signal) => profile ? api<Recent[]>("/api/v1/me/recently-viewed?limit=12", { signal }) : Promise.resolve([]), [profile]);
  const feed = useRemote(async (signal) => {
    if (!profile) return [] as FeedItem[];
    const watched = await api<{ items: Stock[] }>("/api/v1/market/stocks?watchlist=true&limit=20", { signal });
    const pages = await Promise.all(watched.items.flatMap((stock) => [
      api<{ items: NewsArticle[] }>(`/api/v1/news?stockCode=${stock.stockCode}&limit=2`, { signal }),
      api<{ items: Filing[] }>(`/api/v1/disclosures?stockCode=${stock.stockCode}&limit=2`, { signal }),
    ]));
    return pages.flatMap((page, index): FeedItem[] => index % 2 === 0
      ? (page.items as NewsArticle[]).map((news) => ({ type: "NEWS", date: news.publishedAt, news }))
      : (page.items as Filing[]).map((filing) => ({ type: "FILING", date: filing.detectedAt, filing })))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [profile]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  useEffect(() => {
    setSelected(new Set(watchlist.data?.items.slice(0, 3).map((item) => item.stockCode) || []));
  }, [watchlist.data]);

  if (!profile) return <div className="my-page"><Header white /><main className="page-shell my-shell"><BackLink to="/" /><div className="api-state"><b>Sign in required</b><span>Your watchlist, history, and personalized feed are private.</span><Link to="/login?returnTo=%2Fmy">Log in</Link></div></main></div>;
  const visibleStocks = watchlist.data?.items.slice(0, watchlistExpanded ? 9 : 6) || [];
  const removeSelected = async () => {
    await Promise.all([...selected].map((stockCode) => api(`/api/v1/me/watchlist/${stockCode}`, { method: "DELETE" })));
    setSelected(new Set());
    watchlist.retry();
  };

  return <div className="my-page"><Header white /><main className="page-shell my-shell"><BackLink to="/" />
    <section className="profile-row"><img src="/assets/profile.png" alt="" /><div><h1>{profile.loginId}</h1><div><span><img src="/assets/flag-us.svg" alt="" /> {profile.nationality}</span><span className="safe">Tax status: {profile.taxVerificationStatus}</span><span>{profile.investorType}</span></div></div><Link to="/tax">Complete tax filing <img src="/assets/chevron-right-gold.svg" alt="" /></Link></section>
    <DashboardSection title="Recently viewed" description="Stocks, news and filings you opened, newest first."><RemoteState {...recent} empty={(value) => !value.length}>{(items) => <ActivityList items={items.map((item): Activity => ({ type: item.itemType, id: item.referenceId, title: item.stockCode ? `${item.itemType} · ${item.stockCode}` : item.itemType, date: item.viewedAt }))} />}</RemoteState></DashboardSection>
    <DashboardSection title="My watchlist" description="Add companies with the heart button in search or on a company page."><RemoteState {...watchlist} empty={(value) => !value.items.length}>{() => <div className="watchlist"><header><span><img src="/assets/checkbox-checked.svg" alt="" /> {selected.size} selected</span><button aria-label="Delete selected" disabled={!selected.size} onClick={() => void removeSelected()}><img src="/assets/trash.svg" alt="" /></button></header><div className="watch-head"><span>Company</span><span>Price(KRW)</span><span>Change</span><span>%</span><span>Regulatory status</span></div>{visibleStocks.map((stock) => <WatchRow stock={stock} selected={selected.has(stock.stockCode)} toggle={() => setSelected((current) => { const next = new Set(current); if (next.has(stock.stockCode)) next.delete(stock.stockCode); else next.add(stock.stockCode); return next; })} key={stock.stockCode} />)}{!watchlistExpanded && (watchlist.data?.items.length || 0) > 6 ? <button type="button" className="watchlist-more" onClick={() => setWatchlistExpanded(true)}>View more watchlist<img src="/assets/chevron-right-gold.svg" alt="" /></button> : null}</div>}</RemoteState></DashboardSection>
    <DashboardSection title="Integrated Intelligence Feed" description="News and filings filtered to your watchlist only."><RemoteState {...feed} empty={(value) => !value.length}>{(items) => <ActivityList items={items.map((item): Activity => item.type === "NEWS" ? { type: "NEWS", id: item.news.id, title: item.news.englishTitle || item.news.originalTitle, date: item.date } : { type: "FILING", id: item.filing.receiptNumber, title: item.filing.titleEn || item.filing.titleKo, date: item.date })} />}</RemoteState></DashboardSection>
    <DashboardSection title="Account security" description="Change your password, close other sessions, or permanently delete your account."><AccountSecurity /></DashboardSection>
  </main></div>;
}

function AccountSecurity() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    try {
      await api("/api/v1/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm: confirm }) });
      setCurrentPassword(""); setNewPassword(""); setConfirm(""); setMessage("Password updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Password could not be changed."); }
  };
  const logoutAll = async () => {
    setMessage(""); setError("");
    try { await api("/api/v1/auth/logout-all", { method: "POST" }); setMessage("All sessions except this screen have been closed. Log in again to continue securely."); session.clear(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Sessions could not be closed."); }
  };
  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    try { await api("/api/v1/me", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) }); session.clear(); window.location.assign("/"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Account could not be deleted."); }
  };
  return <div className="account-security"><form onSubmit={(event) => void changePassword(event)}><h3>Change password</h3><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" required /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoComplete="new-password" required /><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" required /><button disabled={!currentPassword || !newPassword || newPassword !== confirm}>Update password</button></form><div><h3>Sessions</h3><p>Close every active session. You will need to log in again.</p><button type="button" onClick={() => void logoutAll()}>Log out all devices</button></div><form className="danger-zone" onSubmit={(event) => void deleteAccount(event)}><h3>Delete account</h3><p>This immediately disables the account and starts the server retention process.</p><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Enter password to confirm" autoComplete="current-password" required /><button disabled={!deletePassword}>Delete my account</button></form>{message ? <p className="auth-success" role="status">{message}</p> : null}{error ? <p className="auth-error" role="alert">{error}</p> : null}</div>;
}

function WatchRow({ stock, selected, toggle }: { stock: Stock; selected: boolean; toggle: () => void }) {
  const quote = stock.quote;
  const rate = stock.foreignOwnership?.limitExhaustionRate;
  const status = rate === null || rate === undefined ? "Unavailable" : rate >= 100 ? "Near reached" : rate >= 90 ? "Near cap" : "Open";
  const changeAmount = quote?.changeAmountKrw;
  const changeRate = quote?.changeRate;
  const amountTone = changeAmount == null ? "" : changeAmount >= 0 ? "safe-text" : "danger-text";
  const rateTone = changeRate == null ? "watch-change" : changeRate >= 0 ? "safe watch-change" : "danger watch-change";
  return <div className="watch-row"><div className="watch-company"><button className={`watch-check ${selected ? "checked" : ""}`} onClick={toggle} aria-label={`${stock.nameEn || stock.nameKo} ${selected ? "unselect" : "select"}`}>{selected ? <img src="/assets/checkbox-checked.svg" alt="" /> : null}</button><Link to={`/stocks/${stock.stockCode}`}><b>{stock.nameEn || stock.nameKo}</b><small>{stock.stockCode} · {stock.market}</small></Link></div><span>{formatNumber(quote?.currentPriceKrw)}</span><span className={amountTone}>{formatNumber(changeAmount)}</span><span className={rateTone}>{changeRate == null ? null : <img src={changeRate >= 0 ? "/assets/trend-up.svg" : "/assets/price-down.svg"} alt="" />}{changeRate == null ? "Unavailable" : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`}</span><span className={status === "Near reached" ? "stock-danger watch-status" : status === "Near cap" ? "warning-chip watch-status" : "watch-status"}>{status}</span></div>;
}

type Activity = { type: string; id: string; title: string; date: string };
function ActivityList({ items }: { items: Activity[] }) {
  return <div className="activity-list">{items.map((item) => <Link to={item.type === "NEWS" ? `/news/${item.id}` : item.type === "FILING" ? `/disclosures/${item.id}` : `/stocks/${item.id}`} key={`${item.type}-${item.id}`}><div><span>{item.type}</span><b>{item.title}</b></div><small>{formatDate(item.date)}</small></Link>)}</div>;
}

function DashboardSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="dashboard-section"><div className="dashboard-title"><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>;
}
