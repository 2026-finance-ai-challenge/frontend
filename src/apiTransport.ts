export const API_FAILURE_EVENT = 'kart:api-failure'
export type ApiFailure = 'session-expired' | 'backend-unreachable'

export function reportApiFailure(kind: ApiFailure) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(API_FAILURE_EVENT, { detail: kind }))
}

export class BackendUnavailableError extends Error {
  constructor() { super('The backend server could not be reached.'); this.name = 'BackendUnavailableError' }
}

export async function backendReachable(base: string, request: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await request(`${base}/api/v1/market/indices`, { signal: AbortSignal.timeout(5000), cache: 'no-store', credentials: 'omit' })
    // 정상 응답뿐 아니라 구조화된 업무 오류도 서버와 통신됐다는 증거다.
    return response.ok || (response.headers.get('Content-Type') || '').includes('json')
  } catch { return false }
}

export async function backendFetch(base: string, path: string, init: RequestInit, request: typeof fetch = fetch): Promise<Response> {
  let response: Response
  try {
    response = await request(`${base}${path}`, init)
  } catch (error) {
    if (init.signal?.aborted && init.signal.reason?.name !== 'TimeoutError') throw error
    if (!(error instanceof TypeError) && !(error instanceof Error && error.name === 'TimeoutError')) throw error
    reportApiFailure('backend-unreachable')
    throw new BackendUnavailableError()
  }
  if ([502, 503, 504].includes(response.status)
    && !(response.headers.get('Content-Type') || '').includes('json')
    && !await backendReachable(base, request)) {
    reportApiFailure('backend-unreachable')
    throw new BackendUnavailableError()
  }
  return response
}

export function safeReturnPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    && !value.startsWith('/server-unavailable') ? value : '/'
}
