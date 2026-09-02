import type { ApiProblem, InvestorType, Profile } from './types'
import { SessionVault, type BrowserSession } from './session'
import { PendingRefresh } from './pendingRefresh'

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env
const configuredBase = typeof runtimeEnv?.VITE_API_BASE_URL === 'string'
  ? runtimeEnv.VITE_API_BASE_URL.trim()
  : undefined
export const API_BASE = (configuredBase ?? (runtimeEnv?.DEV ? '' : 'https://api.kartkr.cloud')).replace(/\/$/, '')
export const REALTIME_API_BASE = API_BASE || 'https://api.kartkr.cloud'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter?: string

  constructor(problem: ApiProblem) {
    super(problem.message || problem.detail || problem.title || 'The request could not be completed.')
    this.name = 'ApiError'
    this.status = problem.status || 500
    this.code = problem.code || 'UNKNOWN_ERROR'
    this.retryAfter = problem.retryAfter
  }
}

const pendingRefresh = new PendingRefresh(() => localStorage)
export const session = new SessionVault(async (action, body) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/browser/${action}`, {
    method: 'POST', credentials: 'include',
    keepalive: action === 'refresh',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', 'X-KART-CSRF': '1' },
    body: JSON.stringify(action === 'refresh' ? { requestId: pendingRefresh.begin() } : body ?? {}),
  })
  if (!response.ok) {
    if (response.status === 401) pendingRefresh.finish()
    throw new ApiError(await problemFrom(response))
  }
  const result = response.status === 204 ? undefined : await response.json() as BrowserSession
  pendingRefresh.finish()
  return result
}, async (work) => typeof navigator !== 'undefined' && navigator.locks
  ? await navigator.locks.request('kart-browser-session', work) : await work())

async function problemFrom(response: Response): Promise<ApiProblem> {
  const retryAfter = response.headers.get('Retry-After') || undefined
  try {
    const body = await response.json() as ApiProblem
    return { ...body, status: response.status, retryAfter }
  } catch {
    return { status: response.status, message: response.statusText, retryAfter }
  }
}

export async function api<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (session.bearer) headers.set('Authorization', `Bearer ${session.bearer}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'omit' })
  if (response.status === 401 && allowRefresh && session.bearer
    && headers.get('Authorization') !== `Bearer ${session.bearer}`) {
    return api<T>(path, init, false)
  }
  if (response.status === 401 && allowRefresh && await session.refresh()) {
    return api<T>(path, init, false)
  }
  if (!response.ok) throw new ApiError(await problemFrom(response))
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function queryString(values: Record<string, string | number | boolean | null | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.size ? `?${params.toString()}` : ''
}

export async function login(loginId: string, password: string): Promise<Profile> {
  return session.login(loginId, password)
}

export async function signup(input: {
  loginId: string
  password: string
  passwordConfirm: string
  nationality: string
  investorType: InvestorType
  termsAccepted: boolean
  privacyAccepted: boolean
}): Promise<Profile> {
  return api<Profile>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  }, false)
}
