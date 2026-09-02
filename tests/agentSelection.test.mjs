import assert from "node:assert/strict";
import test from "node:test";
import { chatSubmissionBody, selectionSectionId } from "../src/agentSelection.ts";

const id = "8909bccd-237e-4d02-b14f-993e1bf7bd8c";
test("뉴스는 실제 기사 문맥에 선택문을 보내며 공시 섹션 ID를 만들지 않는다", () => {
  assert.deepEqual(chatSubmissionBody("news", "Explain", {text: "Dividend outlook"}), {
    clientMessageId: "news", content: "Explain", selectedSectionId: null, selectedText: "Dividend outlook",
  });
});
test("공시 선택은 같은 실제 섹션 내부에 있어야 한다", () => {
  assert.equal(selectionSectionId(id, id), id);
  assert.equal(selectionSectionId(id, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), null);
  assert.equal(selectionSectionId(id, null), null);
  assert.equal(selectionSectionId(null, null), null);
  assert.equal(selectionSectionId("table", "table"), null);
});
test("최초 Ask는 양언어 선택문과 섹션 ID를 별도 필드로 전달한다", () => {
  for (const text of ["Release date 2026.09.05", "해제일 2026.09.05"]) {
    assert.deepEqual(chatSubmissionBody("request", "Explain", {sectionId: id, text}), {
      clientMessageId: "request", content: "Explain", selectedSectionId: id, selectedText: text,
    });
  }
});
test("후속 일반 질문에 이전 선택문을 재사용하지 않는다", () => {
  assert.equal(chatSubmissionBody("next", "Follow-up").selectedText, null);
  assert.equal(chatSubmissionBody("next", "Follow-up").selectedSectionId, null);
});

test("사이트 언어는 보내지 않고 질문과 선택문을 분리해서 보존한다", () => {
  for (const content of ["한국어 질문", "English question"]) {
    const request = chatSubmissionBody("request", content, {text:"인용문 quoted evidence"});
    assert.equal(Object.hasOwn(request, "answerLocale"), false);
    assert.equal(request.content, content);
    assert.equal(request.selectedText, "인용문 quoted evidence");
  }
});
