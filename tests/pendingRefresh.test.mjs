import test from 'node:test'
import assert from 'node:assert/strict'
import { PendingRefresh } from '../src/pendingRefresh.ts'

test('a lost refresh response reuses only the pending request ID across page instances', () => {
  const data = new Map()
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
  const first = new PendingRefresh(() => storage).begin()
  const reloaded = new PendingRefresh(() => storage)
  assert.equal(reloaded.begin(), first)
  assert.equal(data.size, 1)
  assert.match(first, /^[0-9a-f-]{36}$/)
  reloaded.finish()
  assert.notEqual(new PendingRefresh(() => storage).begin(), first)
})
test('blocked persistent storage still supports a single tab without storing credentials', () => {
  const pending = new PendingRefresh(() => { throw new Error('blocked') })
  const first = pending.begin()
  assert.equal(pending.begin(), first)
  pending.finish()
  assert.notEqual(pending.begin(), first)
})
test('a damaged request ID is replaced instead of blocking session restoration', () => {
  let stored = '-'.repeat(36)
  const pending = new PendingRefresh(() => ({ getItem: () => stored, setItem: (_key, value) => { stored = value }, removeItem: () => {} }))
  const id = pending.begin()
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  assert.equal(stored, id)
})
