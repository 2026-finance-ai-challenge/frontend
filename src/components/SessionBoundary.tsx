import { useEffect, useState, type ReactNode } from 'react'
import { session } from '../api'
import { useLocale } from '../state/LocaleContext'

export function SessionBoundary({ children }: { children: ReactNode }) {
  const { locale } = useLocale()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    void session.restore().then(() => { if (active) setReady(true) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [attempt])
  if (ready) return children
  return <main className="session-loading" aria-busy={!failed}>
    {failed ? <><p role="alert">{locale === 'ko' ? '로그인 상태를 확인하지 못했습니다. 연결 후 다시 시도하세요.' : 'Unable to restore your session. Check your connection and try again.'}</p>
      <button className="auth-primary" onClick={() => setAttempt((value) => value + 1)}>{locale === 'ko' ? '다시 시도' : 'Try again'}</button></>
      : <><div className="session-skeleton" /><p role="status">{locale === 'ko' ? '로그인 상태 확인 중…' : 'Restoring your session…'}</p></>}
  </main>
}
