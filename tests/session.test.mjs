import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionVault } from '../src/session.ts'

const pair = { accessToken: 'test-access', accessExpiresAt: '', user: { id: 'qa', loginId: 'tester' } }
test('세무 상태 갱신은 현재 계정만 변경하고 로그아웃을 되돌리지 않는다', () => {
  const vault = new SessionVault(async () => pair)
  vault.accept(pair)
  vault.updateUser({ ...pair.user, taxVerificationStatus: 'VERIFIED' })
  assert.equal(vault.user.taxVerificationStatus, 'VERIFIED')
  vault.updateUser({ id: 'other', taxVerificationStatus: 'NOT_STARTED' })
  assert.equal(vault.user.taxVerificationStatus, 'VERIFIED')
  vault.updateUser({ ...pair.user, taxVerificationStatus: 'IN_PROGRESS' })
  assert.equal(vault.user.taxVerificationStatus, 'IN_PROGRESS')
  vault.clear(); vault.updateUser(pair.user)
  assert.equal(vault.user, null)
})
test('reload bootstrap restores the profile once from the server without a JS refresh token', async () => {
  let requests = 0
  const vault = new SessionVault(async (action, body) => {
    assert.equal(action, 'refresh'); assert.equal(body, undefined)
    requests++; await Promise.resolve(); return pair
  })
  await Promise.all([vault.restore(), vault.restore(), vault.refresh()])
  await vault.restore()
  assert.equal(requests, 1); assert.equal(vault.user.id, 'qa')
  assert.equal('refreshToken' in vault, false)
})
test('only an authentication rejection clears the current user', async () => {
  let status = 503
  const vault = new SessionVault(async () => { throw { status } })
  vault.accept(pair)
  await assert.rejects(vault.refresh()); assert.equal(vault.user.id, 'qa')
  status = 401
  assert.equal(await vault.refresh(), false); assert.equal(vault.user, null)
})
test('failed bootstrap can be retried and failed logout does not pretend success', async () => {
  let failed = true
  const vault = new SessionVault(async () => { if (failed) throw new Error('offline'); return pair })
  await assert.rejects(vault.restore()); failed = false; await vault.restore()
  failed = true; await assert.rejects(vault.logout()); assert.equal(vault.user.id, 'qa')
  failed = false; await vault.logout(); assert.equal(vault.user, null)
})
test('an in-flight refresh cannot restore a locally revoked identity', async () => {
  let resolve
  const vault = new SessionVault(() => new Promise((done) => { resolve = done }))
  const pending = vault.refresh(); vault.clear(); resolve(pair)
  assert.equal(await pending, false); assert.equal(vault.user, null)
})
test('login, refresh and logout share the same exclusive session lock', async () => {
  const calls = []; let active = 0
  let queue = Promise.resolve()
  const lock = (work) => { const result = queue.then(work); queue = result.catch(() => {}); return result }
  const vault = new SessionVault(async (action) => {
    assert.equal(active++, 0); calls.push(action); await Promise.resolve(); active--
    return action === 'logout' ? undefined : pair
  }, lock)
  await vault.login('tester', 'unused')
  await Promise.all([vault.refresh(), vault.logout()])
  assert.deepEqual(calls, ['login', 'refresh', 'logout']); assert.equal(vault.user, null)
})
