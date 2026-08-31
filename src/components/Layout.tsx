import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { WatchlistHeart } from "./WatchlistHeart";
import { getKoreaMarketSnapshot } from "../utils/koreaMarketClock";
import { api, queryString } from "../api";
import { useProfile } from "../hooks/useRemote";
import type { NotificationInbox, NotificationItem, Stock } from "../types";

type HeaderProps = {
  initialQuery?: string;
  white?: boolean;
};

type HeaderSurface = "cream" | "white" | "dark";

const primaryNavigation = [
  { label: "AI News Summary", to: "/news" },
  { label: "Dart filings", to: "/disclosures" },
  { label: "Foreigner ownership limits", to: "/#foreign" },
  { label: "Check my tax rate", to: "/tax" },
  { label: "My page & Watchlist", to: "/my" },
];

function readHeaderSurface(header: HTMLElement): HeaderSurface {
  const sampleY = Math.min(window.innerHeight - 1, header.offsetHeight + 1);
  const elementBelow = document.elementFromPoint(16, sampleY);

  let current = elementBelow;
  while (current && current !== document.documentElement) {
    const color = window.getComputedStyle(current).backgroundColor;
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (channels && channels.length >= 3 && (channels[3] ?? 1) > 0) {
      const [red, green, blue] = channels;
      if (red < 80 && green < 80 && blue < 80) return "dark";
      if (red > 252 && green > 252 && blue > 252) return "white";
      return "cream";
    }
    current = current.parentElement;
  }

  return "white";
}

export function Header({
  initialQuery = "",
  white = false,
}: HeaderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationInbox | null>(null);
  const [notificationsError, setNotificationsError] = useState("");
  const [surface, setSurface] = useState<HeaderSurface>(
    white ? "white" : "cream",
  );
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchTimerRef = useRef<number | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useProfile();
  const notificationTarget = (item: NotificationItem) => {
    if (item.referenceType === "NEWS" && item.referenceId) return `/news/${item.referenceId}`;
    if (item.referenceType === "FILING" && item.referenceId) return `/disclosures/${item.referenceId}`;
    if (item.referenceType === "STOCK" && item.referenceId) return `/stocks/${item.referenceId}`;
    if (item.referenceType === "TAX") return "/tax";
    return "/my";
  };
  const openNotifications = async () => {
    if (!profile) {
      navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (!nextOpen) return;
    setNotificationsError("");
    try {
      setNotifications(await api<NotificationInbox>("/api/v1/me/notifications?limit=20"));
    } catch (reason) {
      setNotificationsError(reason instanceof Error ? reason.message : "Notifications could not be loaded.");
    }
  };
  const readNotification = async (item: NotificationItem) => {
    if (!item.read) {
      await api(`/api/v1/me/notifications/${item.id}/read`, { method: "PUT" });
      setNotifications((current) => current ? {
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, read: true, readAt: new Date().toISOString() } : candidate),
      } : current);
    }
    setNotificationsOpen(false);
    navigate(notificationTarget(item));
  };
  const readAllNotifications = async () => {
    await api("/api/v1/me/notifications/read-all", { method: "PUT" });
    setNotifications((current) => current ? { ...current, unreadCount: 0, items: current.items.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date().toISOString() })) } : current);
  };
  useEffect(() => () => window.clearTimeout(searchTimerRef.current), []);
  useEffect(() => {
    let frame = 0;
    const updateSurface = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (headerRef.current) {
          setSurface(readHeaderSurface(headerRef.current));
        }
      });
    };

    updateSurface();
    window.addEventListener("scroll", updateSurface, { passive: true });
    window.addEventListener("resize", updateSurface);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateSurface);
      window.removeEventListener("resize", updateSurface);
    };
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    menuRef.current?.focus({ preventScroll: true });
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!location.hash) return;

    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    window.clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      api<{ items: Stock[] }>(
        `/api/v1/market/stocks/search${queryString({ query: value.trim(), limit: 5 })}`,
        { signal: controller.signal },
      )
        .then(({ items }) => setResults(items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 180);
  };
  const scrollHomeToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      location.pathname !== "/" ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (location.hash) navigate("/", { replace: true });
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <>
      <div className="site-header-slot" aria-hidden="true" />
      <header
        ref={headerRef}
        className={`site-header is-${surface}`}
        data-surface={surface}
      >
      <div className="nav-shell">
        <div className="brand">
          <button
            ref={menuButtonRef}
            className="brand-menu-button"
            type="button"
            aria-label="Open primary navigation"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation-menu"
            onClick={() => setMenuOpen(true)}
          >
            <img className="brand-menu" src="/assets/logo-menu.svg" alt="" />
          </button>
          <Link
            className="brand-home"
            to="/"
            aria-label="KART home"
            onClick={scrollHomeToTop}
          >
            <img
              className="brand-wordmark"
              src="/assets/logo-wordmark.svg"
              alt="KART"
            />
          </Link>
        </div>
        <form
          className={`global-search ${focused && query ? "is-active" : ""}`}
          onSubmit={submit}
        >
          <img className="search-icon" src="/assets/search.svg" alt="" />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Company, ticker, or filings"
            aria-label="Search companies, tickers, or filings"
          />
          <button type="submit" aria-label="Search">
            <img src="/assets/search-submit.svg" alt="" />
          </button>
          {focused && query && (
            <div className="search-popover">
              {results.map((item) => (
                  <div
                    className="search-result-row"
                    key={item.stockCode}
                  >
                    <button
                      className="search-result-link"
                      type="button"
                      onClick={() => navigate(`/stocks/${item.stockCode}`)}
                    >
                      <strong>{item.nameEn || item.nameKo}</strong>
                      <small>
                        {item.stockCode} · {item.market}
                      </small>
                    </button>
                    <WatchlistHeart
                      className="search-heart-button"
                      iconClassName="search-heart"
                      itemId={item.stockCode}
                      itemName={item.nameEn || item.nameKo}
                      keepFocus
                    />
                  </div>
                ))}
              {!searching && results.length === 0 ? (
                <p className="search-empty">No supported stock found.</p>
              ) : null}
              <button
                className="all-results"
                type="button"
                onMouseDown={() =>
                  navigate(`/search?q=${encodeURIComponent(query)}`)
                }
              >
                View all results for ‘{query}’
              </button>
            </div>
          )}
        </form>
        <nav className="nav-actions" aria-label="Utility navigation">
          <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => void openNotifications()}>
            <img src="/assets/notification.svg" alt="" />
            {notifications?.unreadCount ? <span>{notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}</span> : null}
          </button>
          {notificationsOpen ? <div className="notification-popover">
            <header><b>Notifications</b><button type="button" onClick={() => void readAllNotifications()} disabled={!notifications?.unreadCount}>Mark all read</button></header>
            {notificationsError ? <p className="auth-error">{notificationsError}</p> : null}
            {!notificationsError && notifications?.items.length === 0 ? <p className="search-empty">No notifications yet.</p> : null}
            {notifications?.items.map((item) => <button type="button" className={item.read ? "is-read" : ""} onClick={() => void readNotification(item)} key={item.id}><span><b>{item.title}</b><small>{item.body}</small></span><time>{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></button>)}
          </div> : null}
          <span className="language" aria-label="Languages: English and Korean">
            <img src="/assets/flag-us.svg" alt="United States" /> EN <i>/</i> KR
          </span>
          {profile ? (
            <Link className="profile-link" to="/my" aria-label="Open my page">
              <img src="/assets/profile.png" alt="" />
            </Link>
          ) : (
            <Link className="login-button" to="/login">
              Log in
            </Link>
          )}
        </nav>
      </div>
      {menuOpen ? (
        <nav
          ref={menuRef}
          className="primary-navigation-menu"
          id="primary-navigation-menu"
          aria-label="Primary navigation"
          tabIndex={-1}
        >
          <button
            className="primary-navigation-close"
            type="button"
            aria-label="Close primary navigation"
            onClick={() => {
              setMenuOpen(false);
              menuButtonRef.current?.focus();
            }}
          >
            <img src="/assets/gnb-close.svg" alt="" />
          </button>
          <div className="primary-navigation-links">
            {primaryNavigation.map((item) => {
              const active =
                item.to !== "/#foreign" &&
                location.pathname.startsWith(item.to);

              return (
                <Link
                  className={active ? "is-active" : ""}
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <img
            className="footer-logo"
            src="/assets/logo-footer.svg"
            alt="KART"
          />
        </div>
        <div>
          <h3>Team</h3>
          <a href="https://github.com/2026-finance-ai-challenge" target="_blank" rel="noreferrer">About</a>
          <a href="https://github.com/orgs/2026-finance-ai-challenge/people" target="_blank" rel="noreferrer">People</a>
        </div>
        <div>
          <h3>Product</h3>
          <Link to="/news">AI news summary</Link>
          <Link to="/disclosures">Dart filings</Link>
          <a href="#foreign">Foreigner ownership limits</a>
          <Link to="/tax">Check my tax rate</Link>
        </div>
      </div>
      <div className="footer-meta">
        <span>Copyright 2026 KART all rights reserved</span>
        <Link to="/legal/privacy">Privacy policy</Link>
        <Link to="/legal/fsc-disclaimer">FSC Information Disclaimer</Link>
      </div>
    </footer>
  );
}

export function BackLink({ to }: { to: string }) {
  return (
    <Link className="back-link" to={to}>
      <img src="/assets/back.svg" alt="" />
      Back
    </Link>
  );
}

export function MarketBar() {
  const [market, setMarket] = useState(() => getKoreaMarketSnapshot());
  const [indices, setIndices] = useState<Array<{
    indexCode: string;
    indexName: string;
    currentValue: number | null;
    changeRate: number | null;
    status: string;
  }>>([]);
  const [exchangeRate, setExchangeRate] = useState<{
    currency: string;
    krwPerUnit: number | null;
    status: string;
    asOf: string | null;
    source: string;
  } | null>(null);
  const [foreignFlow, setForeignFlow] = useState<{
    tradingDate: string | null;
    netPurchaseAmountKrw: number | null;
    consecutiveDays: number;
    status: string;
    asOf: string | null;
    source: string;
  } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMarket(getKoreaMarketSnapshot()),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      api<typeof indices>("/api/v1/market/indices", { signal: controller.signal })
        .then(setIndices)
        .catch(() => setIndices([])),
      api<NonNullable<typeof exchangeRate>>("/api/v1/market/exchange-rates/USD", { signal: controller.signal })
        .then(setExchangeRate)
        .catch(() => setExchangeRate(null)),
      api<NonNullable<typeof foreignFlow>>("/api/v1/market/foreign-net-flow", { signal: controller.signal })
        .then(setForeignFlow)
        .catch(() => setForeignFlow(null)),
    ]);
    return () => controller.abort();
  }, []);

  const kospi = indices.find((item) => item.indexCode === "KOSPI" || item.indexName === "KOSPI");
  const kosdaq = indices.find((item) => item.indexCode === "KOSDAQ" || item.indexName === "KOSDAQ");
  const renderIndex = (item: typeof kospi, label: string) => <span>
    <em>{label}</em> {item?.currentValue === null || item?.currentValue === undefined ? "Unavailable" : item.currentValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
    {item?.changeRate !== null && item?.changeRate !== undefined ? <b className={item.changeRate >= 0 ? "up" : "down"}>{item.changeRate >= 0 ? "+" : ""}{item.changeRate.toFixed(2)}%</b> : null}
  </span>;

  return (
    <div className="market-bar page-shell">
      {renderIndex(kospi, "KOSPI")}
      <i />
      {renderIndex(kosdaq, "KOSDAQ")}
      <i />
      <span>
        <em>USD/KRW</em> {exchangeRate?.krwPerUnit == null
          ? "Unavailable"
          : exchangeRate.krwPerUnit.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
      <i />
      <span>
        <em>Foreign net flow</em> {formatFlow(foreignFlow?.netPurchaseAmountKrw)}
        {foreignFlow?.netPurchaseAmountKrw != null && foreignFlow.consecutiveDays > 0
          ? <b className={foreignFlow.netPurchaseAmountKrw >= 0 ? "up" : "down"}>
              {foreignFlow.consecutiveDays}{ordinalSuffix(foreignFlow.consecutiveDays)} net {foreignFlow.netPurchaseAmountKrw >= 0 ? "buying" : "selling"}
            </b>
          : null}
      </span>
      <i />
      <span
        className={`market-open ${market.isOpen ? "is-open" : "is-closed"}`}
        aria-live="polite"
      >
        <img src="/assets/market-open.svg" alt="" />
        <span>
          {market.label}
          <br />
          <time dateTime={market.dateTime}>{market.timeLabel}</time>
        </span>
      </span>
    </div>
  );
}

function formatFlow(value: number | null | undefined) {
  if (value === null || value === undefined) return "Unavailable";
  const absolute = Math.abs(value);
  const divisor = absolute >= 1_000_000_000_000 ? 1_000_000_000_000 : 1_000_000_000;
  const suffix = divisor === 1_000_000_000_000 ? "T" : "B";
  return `${value >= 0 ? "+" : "-"}${(absolute / divisor).toFixed(absolute / divisor >= 100 ? 0 : 1)}${suffix}`;
}

function ordinalSuffix(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return "th";
  return value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
}
