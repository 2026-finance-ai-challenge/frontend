import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { formatContentDate } from '../src/utils/contentDate.ts';

for (const locale of ['en-US', 'ko-KR']) {
  test(`${locale}: 뉴스·공시 시간은 24시간제 KST로 표시한다`, () => {
    const output = formatContentDate('2026-09-03T08:30:00Z', locale);
    assert.match(output, /17:30 KST$/);
    assert.doesNotMatch(output, /AM|PM|오전|오후/);
    assert.match(formatContentDate('2026-09-03T17:30:00+09:00', locale), /17:30 KST$/);
  });

  test(`${locale}: 자정은 다음 한국 날짜의 00시로 표시한다`, () => {
    const output = formatContentDate('2026-09-03T15:00:00Z', locale);
    assert.match(output, /00:00 KST$/);
    assert.match(output, locale === 'ko-KR' ? /9월 4일/ : /Sep 4/);
    assert.doesNotMatch(output, /24:00/);
    const dateOnly = formatContentDate('2026-09-03T15:00:00Z', locale, false);
    assert.match(dateOnly, locale === 'ko-KR' ? /9월 4일/ : /Sep 4/);
    assert.doesNotMatch(dateOnly, /KST|:/);
  });
}

test('누락된 날짜는 임의 시각을 만들지 않는다', () => {
  assert.equal(formatContentDate(null, 'en-US'), 'Not available');
  assert.equal(formatContentDate(undefined, 'ko-KR'), '정보 없음');
  assert.equal(formatContentDate('invalid', 'en-US'), 'invalid');
});

test('뉴스 카드·상세의 메타 정보에 번역 상태 문구를 넣지 않는다', () => {
  for (const file of ['pages/HomePage.tsx', 'pages/NewsPage.tsx', 'pages/SearchPage.tsx', 'components/StockNewsFeed.tsx']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Auto-translated|한글 원문/);
  }
});
