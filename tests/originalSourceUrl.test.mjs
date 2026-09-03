import assert from 'node:assert/strict';
import test from 'node:test';
import { originalSourceUrl } from '../src/utils/originalSourceUrl.ts';

test('원문 버튼은 실제 기사·공시의 HTTP(S) 주소를 유지한다', () => {
  for (const url of ['https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260903800675', 'http://news.example.com/story?id=123']) {
    assert.equal(originalSourceUrl(url), url);
  }
});

test('스크립트·데이터 주소·자격증명 포함 주소를 원문 링크로 열지 않는다', () => {
  for (const url of [null, undefined, '', 'javascript:alert(1)', 'data:text/html,test', '//example.com/story', '/news/test', 'https://user:secret@example.com/story']) {
    assert.equal(originalSourceUrl(url), null);
  }
});
