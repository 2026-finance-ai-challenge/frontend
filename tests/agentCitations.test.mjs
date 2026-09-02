import assert from "node:assert/strict";
import test from "node:test";
import { filingPath, citationHref, citationTitle, answerWithCitationMarkers } from "../src/agentCitations.ts";

const receipt = "20260902800513";
const legacy = { id: "C1", title: "Filing", url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}` };
test("EN/KR 공시 버튼은 각 언어의 실제 제목만 사용한다", () => {
  const citation = { ...legacy, title: "옛 한글 섹션", titleEn: "Other Notice (Notice)", titleKo: "기타안내사항(안내공시)" };
  assert.equal(citationTitle(citation, "en"), "Other Notice (Notice)");
  assert.equal(citationTitle(citation, "ko"), "기타안내사항(안내공시)");
  assert.equal(citationTitle({ ...citation, titleEn: null }, "en"), null);
  const news = { ...citation, sourceType: "NEWS", url: "https://news.example.com/article" };
  assert.equal(citationTitle(news, "en"), citation.titleEn);
  assert.equal(citationTitle(news, "ko"), citation.titleKo);
});
test("filing citations and saved DART citations navigate within the service", () => {
  assert.equal(filingPath(legacy), `/disclosures/${receipt}`);
  assert.equal(filingPath({ ...legacy, sourceType: "FILING", referenceId: receipt, url: null }), `/disclosures/${receipt}`);
  assert.equal(filingPath({ ...legacy, url: `https://dart.fss.or.kr.evil.test/?rcpNo=${receipt}` }), null);
  assert.equal(citationHref({ ...legacy, url: "javascript:alert(1)" }), null);
});
test("saved raw and Markdown filing URLs are replaced by citation markers", () => {
  assert.equal(answerWithCitationMarkers(`Source: ${legacy.url}`, [legacy]), "Source: [C1]");
  assert.equal(answerWithCitationMarkers(`[Filing](${legacy.url})`, [legacy]), "Filing [C1]");
  assert.equal(answerWithCitationMarkers("Date: 2026-09-05 [C1]", [legacy]), "Date: 2026-09-05 [C1]");
});
