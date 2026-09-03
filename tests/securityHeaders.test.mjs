import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
const policy = config.headers
  .flatMap((entry) => entry.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value ?? ''

test('배포 CSP는 인증 후 생성한 문서 미리보기 Blob만 렌더링할 수 있다', () => {
  assert.match(policy, /img-src[^;]*\bblob:/)
  assert.match(policy, /frame-src[^;]*\bblob:/)
  assert.match(policy, /object-src 'none'/)
  assert.doesNotMatch(policy, /script-src[^;]*blob:/)
})
