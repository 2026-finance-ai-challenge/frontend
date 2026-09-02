import test from 'node:test'
import assert from 'node:assert/strict'
import { mapConcurrent } from '../src/utils/mapConcurrent.ts'

test('personalized requests preserve order with bounded concurrency', async () => {
  let active = 0; let max = 0
  const result = await mapConcurrent([1, 2, 3, 4, 5], 2, async (item) => {
    active++; max = Math.max(max, active); await Promise.resolve(); active--; return item * 2
  })
  assert.deepEqual(result, [2, 4, 6, 8, 10]); assert.equal(max, 2)
})
test('a partial API failure is reported rather than becoming an invented empty result', async () => {
  await assert.rejects(mapConcurrent([1, 2], 2, async () => { throw new Error('unavailable') }), /unavailable/)
})
