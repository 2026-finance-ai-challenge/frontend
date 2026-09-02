const KOREA_TIME_ZONE = "Asia/Seoul";

// 평일 KRX 휴장일. 다음 연도 거래 일정이 공지되면 갱신한다.
const KRX_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-02",
  "2026-05-01",
  "2026-05-05",
  "2026-05-25",
  "2026-06-03",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
  "2026-12-31",
]);

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

type KoreaMarketSnapshot = {
  dateTime: string;
  tradingDate: string;
  isOpen: boolean;
  label: "Market open" | "Market closed";
  timeLabel: string;
};

export function getKoreaMarketSnapshot(now = new Date()): KoreaMarketSnapshot {
  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const isWeekday = parts.weekday !== "Sat" && parts.weekday !== "Sun";
  const regularSession = minutes >= 9 * 60 && minutes < 15 * 60 + 30;
  const isOpen =
    isWeekday && !KRX_HOLIDAYS.has(dateKey) && regularSession;

  return {
    dateTime: now.toISOString(),
    tradingDate: dateKey,
    isOpen,
    label: isOpen ? "Market open" : "Market closed",
    timeLabel: `${displayFormatter.format(now)} KST`,
  };
}
