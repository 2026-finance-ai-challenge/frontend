import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalOwnershipLimit, ownershipPrediction } from '../src/components/ownershipPredictionModel.ts';
import { getKoreaMarketSnapshot } from '../src/utils/koreaMarketClock.ts';

const input = {
  subjectToLimit: true,
  regularDay: '2026-09-02',
  ownership: { status: 'AVAILABLE', foreignLimitQuantity: 49, totalListedQuantity: 100 },
  quote: { marketSession: 'REGULAR', asOf: '2026-09-02T04:00:00Z' },
  prediction: { status: 'AVAILABLE', minRate: 40, baseRate: 41, maxRate: 42, baseDate: '2026-09-02' },
};

test('홈·상세 예측은 실제 법정 한도와 같은 척도로 범위와 기준점을 만든다', () => {
  const result = ownershipPrediction(input);
  assert.deepEqual(result, { minRate: 40, baseRate: 41, maxRate: 42, start: 40 / 49 * 100, base: 41 / 49 * 100, end: 42 / 49 * 100 });
});

test('장외·비제한 종목·미완료·전일 캐시는 예측 영역을 숨긴다', () => {
  const cases = [
    { regularDay: null }, { subjectToLimit: false }, { quote: undefined },
    ...['CLOSED', 'PRE_MARKET', 'AFTER_HOURS', null].map(marketSession => ({ quote: { ...input.quote, marketSession } })),
    { quote: { ...input.quote, asOf: '2026-09-01T04:00:00Z' } },
    { quote: { ...input.quote, asOf: 'invalid' } },
    { prediction: undefined },
    { prediction: { ...input.prediction, status: 'UNAVAILABLE' } },
    { prediction: { ...input.prediction, baseDate: '2026-09-01' } },
    { ownership: { ...input.ownership, status: 'UNAVAILABLE' } },
  ];
  for (const value of cases) assert.equal(ownershipPrediction({ ...input, ...value }), null);
});

test('누락·비유한·역전된 범위나 잘못된 법정 한도는 추정해 그리지 않는다', () => {
  for (const field of ['minRate', 'baseRate', 'maxRate']) {
    for (const value of [null, undefined, NaN, Infinity]) {
      assert.equal(ownershipPrediction({ ...input, prediction: { ...input.prediction, [field]: value } }), null);
    }
  }
  for (const rates of [{ minRate: -1 }, { minRate: 43 }, { baseRate: 43 }, { maxRate: 101 }]) {
    assert.equal(ownershipPrediction({ ...input, prediction: { ...input.prediction, ...rates } }), null);
  }
  for (const quantities of [{ foreignLimitQuantity: 0 }, { foreignLimitQuantity: null },
    { foreignLimitQuantity: 101 }, { totalListedQuantity: 0 }, { totalListedQuantity: Infinity }]) {
    const ownership = { ...input.ownership, ...quantities };
    assert.equal(legalOwnershipLimit(ownership), null);
    assert.equal(ownershipPrediction({ ...input, ownership }), null);
  }
});

test('한도 초과 예측은 좌표만 자르고 원래 수치는 유지한다', () => {
  const result = ownershipPrediction({ ...input, prediction: { ...input.prediction, minRate: 48, baseRate: 49, maxRate: 50 } });
  assert.equal(result.base, 100);
  assert.equal(result.end, 100);
  assert.equal(result.maxRate, 50);
  const flat = ownershipPrediction({ ...input, prediction: { ...input.prediction, minRate: 41, baseRate: 41, maxRate: 41 } });
  assert.equal(flat.start, flat.end);
});

test('개장·마감 전환과 주말·휴장일은 한국 거래 시간 기준으로 판정한다', () => {
  for (const [timestamp, expected] of [
    ['2026-09-01T23:59:59Z', false], ['2026-09-02T00:00:00Z', true],
    ['2026-09-02T06:29:59Z', true], ['2026-09-02T06:30:00Z', false],
    ['2026-09-05T04:00:00Z', false], ['2026-09-24T04:00:00Z', false],
  ]) {
    const market = getKoreaMarketSnapshot(new Date(timestamp));
    assert.equal(market.isOpen, expected);
    const result = ownershipPrediction({ ...input, regularDay: market.isOpen ? market.tradingDate : null });
    assert.equal(Boolean(result), expected);
  }
});
