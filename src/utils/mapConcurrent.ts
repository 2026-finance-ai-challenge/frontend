export async function mapConcurrent<T, R>(items: readonly T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  let failure: unknown
  let failed = false
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (!failed && cursor < items.length) {
      const index = cursor++
      try { results[index] = await mapper(items[index]) }
      catch (error) { failed = true; failure = error }
    }
  }))
  if (failed) throw failure
  return results
}
