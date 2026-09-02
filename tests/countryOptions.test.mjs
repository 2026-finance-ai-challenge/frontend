import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countryOptions } from '../src/utils/countryOptions.ts';

for (const locale of ['en', 'ko']) {
  test(`${locale} 국가 선택은 선택 가능 국가 우선, 같은 그룹은 이름순이다`, () => {
    const countries = Object.freeze([
      { countryCode: 'GB', countryName: 'United Kingdom' },
      { countryCode: 'AU', countryName: 'Australia' },
      { countryCode: 'US', countryName: 'United States' },
      { countryCode: 'CA', countryName: 'Canada' },
    ].map(Object.freeze));
    const before = structuredClone(countries);
    const result = countryOptions(countries, locale);
    assert.deepEqual(result.map(item => item.countryCode), ['US', 'AU', 'CA', 'GB']);
    assert.deepEqual(result.map(item => item.selectable), [true, false, false, false]);
    assert.deepEqual(countries, before);
  });
}

test('국가가 없거나 미국이 API에 없으면 항목을 임의로 생성하지 않는다', () => {
  assert.deepEqual(countryOptions([], 'en'), []);
  assert.deepEqual(countryOptions([{ countryCode: 'CA', countryName: 'Canada' }], 'en'),
    [{ countryCode: 'CA', countryName: 'Canada', selectable: false }]);
});
