import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStockChartAxis } from '../src/components/stockChartAxis.ts';

const bars = (...timestamps) => timestamps.map(timestamp => ({ timestamp }));
const close = value => `${value}T06:30:00Z`;

test('1W는 야간과 주말을 건너뛰어 시간봉을 등간격으로 배치한다', () => {
  const items = bars('2026-08-27T05:00:00Z', '2026-08-27T06:00:00Z',
    '2026-08-28T00:00:00Z', '2026-08-28T06:00:00Z', '2026-08-31T00:00:00Z');
  const axis = buildStockChartAxis(items, '1W');
  assert.deepEqual(axis.positions, [0, 250, 500, 750, 1000]);
  assert.deepEqual(axis.labels, [0, 2, 4].map(index => ({ timestamp: items[index].timestamp, x: axis.positions[index] })));
});

for (const period of ['1M', '3M', '1Y']) {
  test(`${period}는 휴장 구간을 압축하고 거래일에만 날짜 라벨을 배치한다`, () => {
    const items = bars(...['2026-08-13', '2026-08-14', '2026-08-18', '2026-08-19', '2026-09-02'].map(close));
    const axis = buildStockChartAxis(items, period);
    assert.deepEqual(axis.positions, [0, 250, 500, 750, 1000]);
    assert.deepEqual(axis.labels, items.map((item, index) => ({ ...item, x: axis.positions[index] })));
  });
}

test('장기 라벨은 실제 봉에서 5개, 1Y는 6개를 선택한다', () => {
  const items = bars(...['2025-09-01', '2025-09-02', '2025-10-13', '2025-12-31',
    '2026-01-02', '2026-02-19', '2026-03-03', '2026-06-01', '2026-08-18', '2026-09-02'].map(close));
  for (const period of ['1M', '3M', '1Y']) {
    const axis = buildStockChartAxis(items, period);
    assert.equal(axis.labels.length, period === '1Y' ? 6 : 5);
    assert.equal(axis.labels[0].timestamp, items[0].timestamp);
    assert.equal(axis.labels.at(-1).timestamp, items.at(-1).timestamp);
    for (const label of axis.labels) {
      assert.equal(label.x, axis.positions[items.findIndex(item => item.timestamp === label.timestamp)]);
    }
    assert.equal(new Set(axis.labels.map(label => label.timestamp)).size, axis.labels.length);
  }
});

test('1D는 데이터가 장중까지만 있어도 09:00~15:30 시간축을 유지한다', () => {
  const items = bars('2026-09-02T00:00:00Z', '2026-09-02T00:10:00.000Z', '2026-09-02T02:30:00Z');
  const axis = buildStockChartAxis(items, '1D');
  assert.equal(axis.positions[0], 0);
  assert.ok(Math.abs(axis.positions[1] - 1000 / 39) < 1e-9);
  assert.ok(Math.abs(axis.positions[2] - 1000 * 150 / 390) < 1e-9);
  assert.deepEqual(axis.labels[0], { timestamp: '2026-09-02T00:00:00.000Z', x: 0 });
  assert.deepEqual(axis.labels.at(-1), { timestamp: '2026-09-02T06:30:00.000Z', x: 1000 });
  assert.equal(axis.labels.length, 8);
});

test('1D는 장중 수집 누락을 시간축 압축으로 감추지 않는다', () => {
  const axis = buildStockChartAxis(bars('2026-09-02T00:00:00Z', '2026-09-02T00:20:00Z', '2026-09-02T06:30:00Z'), '1D');
  assert.ok(Math.abs(axis.positions[1] - 1000 * 20 / 390) < 1e-9);
  assert.equal(axis.positions.at(-1), 1000);
});

test('주간 라벨은 UTC가 아닌 한국 거래일로 묶는다', () => {
  const items = bars('2026-08-27T15:30:00Z', '2026-08-28T00:00:00Z', '2026-08-30T23:30:00Z');
  const axis = buildStockChartAxis(items, '1W');
  assert.deepEqual(axis.labels.map(label => label.timestamp), [items[0].timestamp, items[2].timestamp]);
});

test('빈 데이터와 단일 거래봉에도 유한한 좌표를 반환한다', () => {
  for (const period of ['1D', '1W', '1M', '3M', '1Y']) {
    assert.deepEqual(buildStockChartAxis([], period), { positions: [], labels: [] });
    const items = bars(close('2026-09-02'));
    const axis = buildStockChartAxis(items, period);
    assert.deepEqual(axis.positions, [period === '1D' ? 1000 : 500]);
    assert.ok(axis.labels.every(label => Number.isFinite(label.x)));
  }
});

test('실시간 갱신 및 거래봉 추가 후에도 순서와 등간격을 유지하며 입력을 변형하지 않는다', () => {
  const items = Object.freeze(bars(close('2026-08-28'), close('2026-08-31'), close('2026-09-01'))
    .map(item => Object.freeze({ ...item, closePriceKrw: 100, volume: 0 })));
  const before = structuredClone(items);
  assert.deepEqual(buildStockChartAxis(items, '1M').positions, [0, 500, 1000]);
  const updated = items.map((item, index) => index === 2 ? { ...item, closePriceKrw: 101, volume: 1 } : item);
  assert.deepEqual(buildStockChartAxis(updated, '1M').positions, [0, 500, 1000]);
  const appended = [...updated, { timestamp: close('2026-09-02') }];
  const axis = buildStockChartAxis(appended, '1M');
  const step = 1000 / 3;
  axis.positions.forEach((x, index) => assert.ok(Math.abs(x - index * step) < 1e-9));
  assert.deepEqual(items, before);
});
