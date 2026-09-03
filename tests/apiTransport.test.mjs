import assert from 'node:assert/strict';
import test from 'node:test';
import { backendFetch, BackendUnavailableError, safeReturnPath } from '../src/apiTransport.ts';

test('업무 오류·인증 거부는 서버 장애로 바꾸지 않는다', async () => {
  for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) {
    const result = await backendFetch('', '/test', {}, async () => new Response('{}', { status, headers: { 'Content-Type': 'application/problem+json' } }));
    assert.equal(result.status, status);
  }
});
test('통신 실패만 서버 연결 장애로 분리한다', async () => {
  await assert.rejects(backendFetch('', '/test', {}, async () => { throw new TypeError('Failed to fetch'); }), BackendUnavailableError);
});
test('화면 이동으로 취소한 요청은 장애가 아니다', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(backendFetch('', '/test', { signal: controller.signal }, async () => { throw controller.signal.reason; }), { name: 'AbortError' });
});
test('게이트웨이 오류도 백엔드가 응답하면 해당 기능의 오류로 남긴다', async () => {
  let calls = 0;
  const response = await backendFetch('', '/test', {}, async () => ++calls === 1 ? new Response('upstream', { status: 502 }) : new Response('[]', { status: 200 }));
  assert.equal(response.status, 502); assert.equal(calls, 2);
});
test('게이트웨이와 연결 확인이 모두 실패해야 전체 장애로 이동한다', async () => {
  await assert.rejects(backendFetch('', '/test', {}, async () => new Response('unavailable', { status: 502 })), BackendUnavailableError);
});
test('복귀 경로에 외부 URL·역슬래시·오류 페이지 반복을 허용하지 않는다', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/server-unavailable', null]) assert.equal(safeReturnPath(value), '/');
  assert.equal(safeReturnPath('/stocks/005930?tab=news'), '/stocks/005930?tab=news');
});
