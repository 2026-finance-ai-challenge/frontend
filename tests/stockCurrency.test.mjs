import assert from 'node:assert/strict';
import test from 'node:test';
import { stockCurrency } from '../src/utils/stockCurrency.ts';
import { sentimentTone } from '../src/utils/sentiment.ts';

test('EN은 USD와 KRW, KR은 KRW와 USD 순서로 표시한다', () => {
  assert.equal(stockCurrency(250000, 1250, 'en'), '$200.00');
  assert.equal(stockCurrency(250000, 1250, 'en', false), '₩250,000');
  assert.equal(stockCurrency(250000, 1250, 'ko'), '₩250,000');
  assert.match(stockCurrency(250000, 1250, 'ko', false), /200\.00/);
  assert.equal(stockCurrency(-500, 1250, 'en', true, true), '-$0.40');
  assert.equal(stockCurrency(0, 1250, 'en', true, true), '+$0.00');
});
test('환율 누락 시 원화에 달러 기호를 붙이지 않는다', () => {
  for (const rate of [null, undefined, 0, -1, NaN]) assert.equal(stockCurrency(250000, rate, 'en'), 'Unavailable');
});
test('공시 점과 배지는 동일한 감성 분류로 결정한다', () => {
  assert.equal(sentimentTone('POSITIVE'), 'positive');
  assert.equal(sentimentTone('negative'), 'negative');
  for (const value of [null, undefined, 'NEUTRAL', 'UNKNOWN']) assert.equal(sentimentTone(value), 'neutral');
});
