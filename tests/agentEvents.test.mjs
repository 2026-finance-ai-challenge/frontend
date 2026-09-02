import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OPEN_AGENT_EVENT, openKAgent, openTaxEligibility } from '../src/agentEvents.ts';

function captureEvents(t) {
  const events = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  window.addEventListener(OPEN_AGENT_EVENT, event => events.push(event));
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  });
  return events;
}

test('세율 진입점은 공통 K-Agent의 세무 컨텍스트를 한 번 연다', (t) => {
  const events = captureEvents(t);
  openTaxEligibility();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, OPEN_AGENT_EVENT);
  assert.deepEqual(events[0].detail, { contextType: 'TAX_GUIDE' });
});

test('기존 일반·뉴스·공시 K-Agent 컨텍스트는 그대로 유지한다', (t) => {
  const events = captureEvents(t);
  openKAgent();
  openKAgent({ contextType: 'NEWS', referenceId: 'news-id', prompt: 'Explain' });
  openKAgent({ contextType: 'FILING', referenceId: 'filing-id' });
  assert.deepEqual(events.map(event => event.detail), [
    { contextType: 'GENERAL' },
    { contextType: 'NEWS', referenceId: 'news-id', prompt: 'Explain' },
    { contextType: 'FILING', referenceId: 'filing-id' },
  ]);
});
