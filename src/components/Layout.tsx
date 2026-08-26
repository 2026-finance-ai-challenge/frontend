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

const results = [
  {
    id: "samsung-electronics-primary",
    watchlistId: "samsung-electronics",
    name: "Samsung Electronics",
    code: "005930",
    market: "KOSPI",
  },
  {
    id: "samsung-sdi",
    watchlistId: "samsung-sdi",
    name: "Samsung SDI",
    code: "005930",
    market: "KOSPI",
  },
  {
    id: "samsung-biologics",
    watchlistId: "samsung-biologics",
    name: "Samsung Biologics",
    code: "005930",
    market: "KOSPI",
  },
  {
    id: "samsung-ct",
    watchlistId: "samsung-ct",
    name: "Samsung C&T",
    code: "005930",
    market: "KOSPI",
  },
  {
    id: "samsung-electronics-secondary",
    watchlistId: "samsung-electronics",
    name: "Samsung Electronics",
    code: "005930",
    market: "KOSPI",
  },
];

type HeaderProps = {
  authenticated?: boolean;
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
  authenticated = false,
  initialQuery = "",
  white = false,
}: HeaderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [surface, setSurface] = useState<HeaderSurface>(
    white ? "white" : "cream",
  );
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
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
            onChange={(event) => setQuery(event.target.value)}
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
              {results
                .filter(
                  (item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.code.includes(query),
                )
                .map((item) => (
                  <div
                    className="search-result-row"
                    key={item.id}
                  >
                    <button
                      className="search-result-link"
                      type="button"
                      onClick={() => navigate(`/stocks/${item.code}`)}
                    >
                      <strong>{item.name}</strong>
                      <small>
                        {item.code} · {item.market}
                      </small>
                    </button>
                    <WatchlistHeart
                      className="search-heart-button"
                      iconClassName="search-heart"
                      itemId={item.watchlistId}
                      itemName={item.name}
                      keepFocus
                    />
                  </div>
                ))}
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
          {authenticated ? (
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
        <a href="#privacy">Privacy policy</a>
        <a href="#legal">Legal Disclaimer</a>
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

  useEffect(() => {
    const timer = window.setInterval(
      () => setMarket(getKoreaMarketSnapshot()),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="market-bar page-shell">
      <span>
        <em>KOSPI</em> 3,143.55 <b className="up">+0.82%</b>
      </span>
      <i />
      <span>
        <em>KOSDAQ</em> 1,048.20 <b className="up">+1.14%</b>
      </span>
      <i />
      <span>
        <em>USD/KRW</em> 1,048.20 <b className="down">-0.31%</b>
      </span>
      <i />
      <span>
        <em>Foreign net flow</em> -820B <b className="down">5th</b>
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
