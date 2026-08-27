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
import type { Stock } from "../types";

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
          <button className="icon-button" aria-label="Notifications">
            <img src="/assets/notification.svg" alt="" />
          </button>
          <button className="language">
            <img src="/assets/flag-us.svg" alt="United States" /> EN
          </button>
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
                (item.to !== "/#foreign" &&
                  location.pathname.startsWith(item.to)) ||
                (location.pathname === "/" && item.to === "/disclosures");

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
          <a href="#about">About</a>
          <a href="#people">People</a>
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

  useEffect(() => {
    const timer = window.setInterval(
      () => setMarket(getKoreaMarketSnapshot()),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<typeof indices>("/api/v1/market/indices", { signal: controller.signal })
      .then(setIndices)
      .catch(() => setIndices([]));
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
        <em>USD/KRW</em> Available on stock detail
      </span>
      <i />
      <span>
        <em>Market data</em> {indices[0]?.status || "Unavailable"}
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
