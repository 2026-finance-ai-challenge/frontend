import assert from "node:assert/strict";
import test from "node:test";
import { filingPath, citationHref, citationTitle, contextHref, answerWithCitationMarkers } from "../src/agentCitations.ts";

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
test("news citations and linked chat headers prefer verified internal routes", () => {
  const newsId = "ecab4bdf-4cf4-4131-bcaf-dc4076facb64";
  assert.equal(citationHref({ id: "N1", sourceType: "NEWS", referenceId: newsId, title: "News", url: "https://publisher.example/article" }), `/news/${newsId}`);
  assert.equal(contextHref("NEWS", newsId), `/news/${newsId}`);
  assert.equal(contextHref("FILING", receipt), `/disclosures/${receipt}`);
  assert.equal(contextHref("GENERAL", null), null);
});
test("saved raw and Markdown filing URLs are removed from the body when source buttons exist", () => {
  assert.equal(answerWithCitationMarkers(`Source: ${legacy.url}`, [legacy]), "Source:");
  assert.equal(answerWithCitationMarkers(`[Filing](${legacy.url})`, [legacy]), "Filing");
  assert.equal(answerWithCitationMarkers("Date: 2026-09-05 [c1]", [legacy]), "Date: 2026-09-05");
});

test("언어 전환은 공시 버튼 제목만 바꾸고 저장된 대화와 인용 경로는 보존한다", () => {
  const message = Object.freeze({ content: "해제일은 9월 5일입니다. [C1]", citation: Object.freeze({ ...legacy, titleEn: "Release notice", titleKo: "해제 안내" }) });
  const before = JSON.stringify(message);
  for (const locale of ["en", "ko", "en"]) {
    assert.equal(citationTitle(message.citation, locale), locale === "en" ? "Release notice" : "해제 안내");
    assert.equal(citationHref(message.citation), `/disclosures/${receipt}`);
    assert.equal(answerWithCitationMarkers(message.content, [message.citation]), "해제일은 9월 5일입니다.");
  }
  assert.equal(JSON.stringify(message), before);
});
