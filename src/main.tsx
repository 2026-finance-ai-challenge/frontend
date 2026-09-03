import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { WatchlistProvider } from './state/WatchlistContext'
import { LocaleProvider } from './state/LocaleContext'
import './styles.css'
import './interaction-motion.css'
import { SessionBoundary } from './components/SessionBoundary'
import { ApiFailureBoundary } from './components/ApiFailureBoundary'

// 초기 진입·새로고침에서도 브라우저가 이전 위치를 복원하지 않게 한다.
window.history.scrollRestoration = 'manual'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ApiFailureBoundary>
        <SessionBoundary>
        <WatchlistProvider>
          <App />
        </WatchlistProvider>
        </SessionBoundary>
        </ApiFailureBoundary>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
