import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '../api'
import { API_FAILURE_EVENT, backendReachable, safeReturnPath, type ApiFailure } from '../apiTransport'
import { useLocale } from '../state/LocaleContext'

export function ApiFailureBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const handle = (event: Event) => {
      const failure = (event as CustomEvent<ApiFailure>).detail
      if (location.pathname === '/server-unavailable') return
      const returnTo = encodeURIComponent(location.pathname + location.search + location.hash)
      if (failure === 'session-expired' && location.pathname !== '/login') navigate(`/login?returnTo=${returnTo}`, { replace: true })
      if (failure === 'backend-unreachable') navigate(`/server-unavailable?returnTo=${returnTo}`, { replace: true })
    }
    window.addEventListener(API_FAILURE_EVENT, handle)
    return () => window.removeEventListener(API_FAILURE_EVENT, handle)
  }, [location, navigate])
  return location.pathname === '/server-unavailable' ? <ServerUnavailable /> : children
}

function ServerUnavailable() {
  const { locale } = useLocale()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const retry = async () => {
    setChecking(true); setFailed(false)
    if (await backendReachable(API_BASE)) navigate(safeReturnPath(params.get('returnTo')), { replace: true })
    else setFailed(true)
    setChecking(false)
  }
  return <main className="server-unavailable page-shell">
    <img src="/assets/logo-wordmark.svg" alt="KART" />
    <h1>{locale === 'ko' ? '서버에 연결할 수 없습니다' : 'Unable to connect to the server'}</h1>
    <p>{locale === 'ko' ? '현재 서버와 통신할 수 없습니다. 잠시 후 다시 시도해 주세요. 진행 중인 작업을 중복 요청하지 않습니다.' : 'We cannot reach the server right now. Please try again shortly. Your operation will not be submitted again automatically.'}</p>
    <button className="login-button" disabled={checking} onClick={() => void retry()}>{checking ? (locale === 'ko' ? '연결 확인 중…' : 'Checking connection…') : (locale === 'ko' ? '다시 연결' : 'Reconnect')}</button>
    {failed ? <p role="alert">{locale === 'ko' ? '아직 연결되지 않습니다. 네트워크 상태도 확인해 주세요.' : 'Still unable to connect. Please also check your network.'}</p> : null}
  </main>
}
