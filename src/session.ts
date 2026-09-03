import type { Profile } from './types'

export type BrowserSession = { accessToken: string; accessExpiresAt: string; user: Profile }
type Listener = () => void
type Request = (action: string, body?: unknown) => Promise<BrowserSession | undefined>
type Lock = <T>(work: () => Promise<T>) => Promise<T>

export class SessionVault {
  private accessToken: string | null = null
  private profile: Profile | null = null
  private listeners = new Set<Listener>()
  private refreshPromise: Promise<boolean> | null = null
  private restored = false
  private revision = 0
  private request: Request
  private lock: Lock

  constructor(request: Request, lock: Lock = (work) => work()) {
    this.request = request
    this.lock = lock
  }

  get user(): Profile | null { return this.profile }
  get bearer(): string | null { return this.accessToken }

  updateUser(profile: Profile): void {
    if (!this.accessToken || this.profile?.id !== profile.id) return
    this.profile = profile
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  accept(pair: BrowserSession): void {
    this.accessToken = pair.accessToken
    this.profile = pair.user
    this.restored = true
    this.listeners.forEach((listener) => listener())
  }

  clear(): void {
    this.revision += 1
    this.accessToken = null
    this.profile = null
    this.listeners.forEach((listener) => listener())
  }

  async restore(): Promise<void> {
    if (!this.restored) await this.refresh()
  }

  async login(loginId: string, password: string): Promise<Profile> {
    return this.lock(async () => {
      const pair = await this.request('login', { loginId, password })
      if (!pair) throw new Error('The login response was incomplete.')
      this.revision += 1
      this.accept(pair)
      return pair.user
    })
  }

  async refresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise
    const revision = this.revision
    this.refreshPromise = this.lock(async () => {
      if (revision !== this.revision) return false
      try {
        const pair = await this.request('refresh')
        if (!pair) throw new Error('The session response was incomplete.')
        if (revision !== this.revision) return false
        this.accept(pair)
        return true
      } catch (error) {
        // 통신 장애를 로그아웃으로 바꾸지 않는다. 서버가 인증을 거부한 경우만 만료 처리한다.
        if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
          if (revision === this.revision) this.clear()
          this.restored = true
          return false
        }
        throw error
      }
    }).finally(() => { this.refreshPromise = null })
    return this.refreshPromise
  }

  async logout(): Promise<void> {
    // 갱신과 로그아웃을 같은 탭 간 잠금 안에서 실행해 쿠키 재발급 경합을 막는다.
    await this.lock(async () => {
      await this.request('logout')
      this.clear()
    })
  }
}
