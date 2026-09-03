import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalOwnershipLimit, ownershipPrediction, ownershipLegendRows, ownershipPredictionLabel } from '../src/components/ownershipPredictionModel.ts';
import { getOwnershipForecastWindow } from '../src/utils/koreaMarketClock.ts';

const input = {
  subjectToLimit: true,
  now: new Date('2026-09-02T04:00:00Z'),
  ownership: { status: 'AVAILABLE', foreignLimitQuantity: 49, totalListedQuantity: 100 },
  prediction: { status: 'AVAILABLE', minRate: 40, baseRate: 41, maxRate: 42, baseDate: '2026-09-01', targetDate: '2026-09-02', predictionSession: 'INTRADAY' },
};

for (const locale of ['en', 'ko']) {
  test(`${locale} 직전 보유율은 실측 단일 값, 범위는 예측에만 연결한다`, () => {
    const rows = ownershipLegendRows(ownershipPrediction(input), 39.25, locale);
    assert.deepEqual(rows.map(({ kind, value }) => ({ kind, value })), [
      { kind: 'previous', value: '39.25%' },
      { kind: 'range', value: '40.00–42.00%' },
      { kind: 'base', value: '41.00%' },
    ]);
    assert.equal(rows[0].label, locale === 'ko' ? '직전 보유율' : 'Previous');
    assert.equal(rows[1].label, locale === 'ko' ? '예측 범위' : 'Forecast range');
    assert.equal(ownershipLegendRows(ownershipPrediction(input), null, locale)[0].value, '—');
  });
}

test('홈·상세 예측은 실제 법정 한도와 같은 척도로 범위와 기준점을 만든다', () => {
  const result = ownershipPrediction(input);
  assert.deepEqual(result, { minRate: 40, baseRate: 41, maxRate: 42, start: 40 / 49 * 100, base: 41 / 49 * 100, end: 42 / 49 * 100, targetDate: '2026-09-02', session: 'INTRADAY' });
});

test('비제한 종목·미완료·잘못된 거래일 또는 세션의 캐시는 예측으로 노출하지 않는다', () => {
  const cases = [
    { subjectToLimit: false },
    { now: new Date('2026-09-02T07:00:00Z') },
    { prediction: undefined },
    { prediction: { ...input.prediction, status: 'UNAVAILABLE' } },
    { prediction: { ...input.prediction, baseDate: '2026-08-31' } },
    { prediction: { ...input.prediction, targetDate: '2026-09-03' } },
    { prediction: { ...input.prediction, predictionSession: 'NEXT_SESSION' } },
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

test('장중·장외 모두 해당 거래일 예측을 표시하며 주말·휴장일을 건너뛴다', () => {
  for (const [timestamp, targetDate, baseDate, session] of [
    ['2026-09-01T23:59:59Z', '2026-09-02', '2026-09-01', 'NEXT_SESSION'],
    ['2026-09-02T00:00:00Z', '2026-09-02', '2026-09-01', 'INTRADAY'],
    ['2026-09-02T06:29:59Z', '2026-09-02', '2026-09-01', 'INTRADAY'],
    ['2026-09-02T06:30:00Z', '2026-09-03', '2026-09-02', 'NEXT_SESSION'],
    ['2026-09-02T15:01:00Z', '2026-09-03', '2026-09-02', 'NEXT_SESSION'],
    ['2026-09-04T07:00:00Z', '2026-09-07', '2026-09-04', 'NEXT_SESSION'],
    ['2026-09-05T04:00:00Z', '2026-09-07', '2026-09-04', 'NEXT_SESSION'],
    ['2026-09-24T04:00:00Z', '2026-09-28', '2026-09-23', 'NEXT_SESSION'],
    ['2026-10-02T07:00:00Z', '2026-10-06', '2026-10-02', 'NEXT_SESSION'],
  ]) {
    const now = new Date(timestamp);
    assert.deepEqual(getOwnershipForecastWindow(now), { targetDate, session });
    const result = ownershipPrediction({ ...input, now, prediction: { ...input.prediction, baseDate, targetDate, predictionSession: session } });
    assert.ok(result);
    assert.match(ownershipPredictionLabel(result, 'en'), session === 'INTRADAY' ? /Intraday forecast/ : /Next-session forecast/);
    assert.match(ownershipPredictionLabel(result, 'ko'), session === 'INTRADAY' ? /장중 예측/ : /다음 장 예측/);
  }
  assert.equal(getOwnershipForecastWindow(new Date('2026-12-30T07:00:00Z')).targetDate, null);
});
