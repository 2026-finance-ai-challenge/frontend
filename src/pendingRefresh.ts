type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export class PendingRefresh {
  private memory: string | null = null
  private storage: () => StoragePort
  private key = 'kart-refresh-request-id'
  constructor(storage: () => StoragePort) { this.storage = storage }
  begin(): string {
    try { this.memory = this.storage().getItem(this.key) || this.memory } catch { /* 저장소 차단 시 현재 탭에서만 요청을 합친다. */ }
    if (!this.memory || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.memory)) this.memory = crypto.randomUUID()
    // 인증 토큰이 아닌 요청 식별자만 저장해 갱신 응답 유실을 복구한다.
    try { this.storage().setItem(this.key, this.memory) } catch { /* 비공개 브라우징에서도 로그인은 허용한다. */ }
    return this.memory
  }
  finish(): void {
    this.memory = null
    try { this.storage().removeItem(this.key) } catch { /* 메모리 요청 식별자는 이미 제거했다. */ }
  }
}
