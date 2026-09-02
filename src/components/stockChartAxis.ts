type TimedBar = { timestamp: string };
type ChartAxisLabel = { timestamp: string; x: number };
type StockChartAxis = { positions: number[]; labels: ChartAxisLabel[] };

const WIDTH = 1000;
const HOUR_MS = 60 * 60_000;

export function buildStockChartAxis(items: readonly TimedBar[], period: string): StockChartAxis {
  if (!items.length) return { positions: [], labels: [] };

  if (period === "1D") {
    const koreaClock = new Date(Date.parse(items[0].timestamp) + 9 * HOUR_MS);
    const sessionStart = Date.UTC(koreaClock.getUTCFullYear(), koreaClock.getUTCMonth(), koreaClock.getUTCDate());
    const xForTime = (time: number) => Math.min(WIDTH, Math.max(0,
      (time - sessionStart) / (6.5 * HOUR_MS) * WIDTH,
    ));
    return {
      positions: items.map((item) => xForTime(Date.parse(item.timestamp))),
      labels: [0, 1, 2, 3, 4, 5, 6, 6.5].map((hours) => {
        const time = sessionStart + hours * HOUR_MS;
        return { timestamp: new Date(time).toISOString(), x: xForTime(time) };
      }),
    };
  }

  // 휴장일·야간을 채우지 않고 실제 거래봉 순서로 모든 차트 요소의 좌표를 공유한다.
  const positions = items.map((_, index) => items.length === 1 ? WIDTH / 2 : index / (items.length - 1) * WIDTH);
  const labelAt = (index: number): ChartAxisLabel => ({ timestamp: items[index].timestamp, x: positions[index] });
  if (period === "1W") {
    const seen = new Set<string>();
    const labels: ChartAxisLabel[] = [];
    items.forEach((item, index) => {
      const tradingDate = new Date(Date.parse(item.timestamp) + 9 * HOUR_MS).toISOString().slice(0, 10);
      if (seen.has(tradingDate)) return;
      seen.add(tradingDate);
      labels.push(labelAt(index));
    });
    return { positions, labels };
  }

  // 날짜 라벨도 경과 시간이 아닌 실제 거래봉에서 선택한다.
  const count = Math.min(period === "1Y" ? 6 : 5, items.length);
  const labels = Array.from({ length: count }, (_, index) =>
    labelAt(Math.round(index * (items.length - 1) / Math.max(count - 1, 1))),
  );
  return { positions, labels };
}
