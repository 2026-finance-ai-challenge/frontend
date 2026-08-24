import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { WatchlistHeart } from "./WatchlistHeart";

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

function readHeaderSurface(header: HTMLElement): HeaderSurface {
  const previousVisibility = header.style.visibility;
  header.style.visibility = "hidden";
  const sampleY = Math.min(window.innerHeight - 1, header.offsetHeight + 1);
  const elementBelow = document.elementFromPoint(16, sampleY);
  header.style.visibility = previousVisibility;

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
  const [surface, setSurface] = useState<HeaderSurface>(
    white ? "white" : "cream",
  );
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
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
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
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
        <Link className="brand" to="/" aria-label="KART home">
          <img className="brand-menu" src="/assets/logo-menu.svg" alt="" />
          <img
            className="brand-wordmark"
            src="/assets/logo-wordmark.svg"
            alt="KART"
          />
        </Link>
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
      {focused && query && (
        <button className="agent-launcher" aria-label="Open K-Agent">
          <img src="/assets/agent-launcher.svg" alt="" />
        </button>
      )}
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
      <span className="market-open">
        <img src="/assets/market-open.svg" alt="" />
        <span>
          Market open
          <br />
          Aug 14, 9:30 KST
        </span>
      </span>
    </div>
  );
}
