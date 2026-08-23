import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const results = [
  { name: 'Samsung Electronics', code: '005930', market: 'KOSPI' },
  { name: 'Samsung SDI', code: '006400', market: 'KOSPI' },
  { name: 'Samsung Biologics', code: '207940', market: 'KOSPI' },
]

export function Header() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="KART home">
          <img src="/assets/logo.svg" alt="KART" />
        </Link>
        <form className="global-search" onSubmit={submit}>
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Company, ticker, or filings"
            aria-label="Search companies, tickers, or filings"
          />
          <button type="submit" aria-label="Search">›</button>
          {focused && query && (
            <div className="search-popover">
              <p className="eyebrow">Stocks</p>
              {results.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || item.code.includes(query)).map((item) => (
                <button key={item.code} type="button" onMouseDown={() => navigate(`/stocks/${item.code}`)}>
                  <span className="stock-mark">{item.name[0]}</span>
                  <span><strong>{item.name}</strong><small>{item.code} · {item.market}</small></span>
                  <span className="heart">♡</span>
                </button>
              ))}
              <button className="all-results" type="button" onMouseDown={() => navigate(`/search?q=${encodeURIComponent(query)}`)}>View all results <span>›</span></button>
            </div>
          )}
        </form>
        <nav className="nav-actions" aria-label="Utility navigation">
          <button className="icon-button" aria-label="Notifications">♧</button>
          <button className="language"><span>🇺🇸</span> EN</button>
          <Link className="login-button" to="/login">Log in</Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div><img className="footer-logo" src="/assets/logo-footer.svg" alt="KART" /></div>
        <div><h3>Team</h3><a href="#about">About</a><a href="#people">People</a></div>
        <div><h3>Product</h3><Link to="/news">AI news summary</Link><Link to="/disclosures">Dart filing</Link><a href="#foreign">Foreigner ownership limits</a><Link to="/tax">Check tax rate</Link></div>
      </div>
      <div className="footer-meta"><span>Copyright 2026 KART all rights reserved</span><a href="#privacy">Privacy policy</a><a href="#legal">Legal Disclaimer</a></div>
    </footer>
  )
}

export function MarketBar() {
  return (
    <div className="market-bar page-shell">
      <span><em>KOSPI</em> 3,143.55 <b className="up">+0.82%</b></span>
      <i />
      <span><em>KOSDAQ</em> 1,048.20 <b className="up">+1.14%</b></span>
      <i />
      <span><em>USD/KRW</em> 1,048.20 <b className="down">-0.31%</b></span>
      <i />
      <span><em>Foreign net flow</em> -820B <b className="down">5th</b></span>
      <i />
      <span className="market-open"><b>●</b><span>Market open<br />Aug 14, 9:30 KST</span></span>
    </div>
  )
}
