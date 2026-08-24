import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const results = [
  { name: "Samsung Electronics", code: "005930", market: "KOSPI", saved: true },
  { name: "Samsung SDI", code: "005930", market: "KOSPI", saved: true },
  { name: "Samsung Biologics", code: "005930", market: "KOSPI", saved: false },
  { name: "Samsung C&T", code: "005930", market: "KOSPI", saved: false },
  {
    name: "Samsung Electronics",
    code: "005930",
    market: "KOSPI",
    saved: false,
  },
];

type HeaderProps = {
  authenticated?: boolean;
  initialQuery?: string;
  white?: boolean;
};

export function Header({
  authenticated = false,
  initialQuery = "",
  white = false,
}: HeaderProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className={`site-header ${white ? "is-white" : ""}`}>
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="KART home">
          <img src="/assets/logo.svg" alt="KART" />
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
                .map((item, index) => (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    onMouseDown={() => navigate(`/stocks/${item.code}`)}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.code} · {item.market}
                      </small>
                    </span>
                    <img
                      className="search-heart"
                      src={
                        item.saved
                          ? "/assets/heart-filled.svg"
                          : "/assets/heart-outline.svg"
                      }
                      alt={
                        item.saved
                          ? "Saved to watchlist"
                          : "Not saved to watchlist"
                      }
                    />
                  </button>
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
          <Link to="/disclosures">Dart filing</Link>
          <a href="#foreign">Foreigner ownership limits</a>
          <Link to="/tax">Check tax rate</Link>
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
