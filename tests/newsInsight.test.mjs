import test from "node:test";
import assert from "node:assert/strict";
import { generatedNewsBody, generatedNewsInsight } from "../src/utils/newsInsight.ts";

const summary = { what: "An investment was announced.", why: "Capacity expansion.", impact: "Not stated." };

test("완료 뉴스 본문은 금액·문자 표현으로 재판정하거나 수정하지 않는다", () => {
  const paragraphs = ["₩700, 7,000 won; original label 高."];
  const translation = {status: "READY", targetLocale: "en", result: {...summary, translatedParagraphs: paragraphs, bodyReady: true}};
  assert.equal(generatedNewsBody(translation, "en"), paragraphs);
  assert.equal(generatedNewsBody(translation, "ko"), null);
  assert.equal(generatedNewsBody({...translation, status: "PROCESSING"}, "en"), null);
  assert.equal(generatedNewsBody({...translation, status: "FAILED"}, "en"), null);
  assert.equal(generatedNewsBody({...translation, result: {...translation.result, bodyReady: false}}, "en"), null);
  assert.equal(generatedNewsBody({...translation, result: {...translation.result, translatedParagraphs: [" "]}}, "en"), null);
});

test("양언어 요약 검증이 끝나면 본문 처리 중에도 표시한다", () => {
  const result = { ...summary, summaryReady: true, bodyReady: false };
  assert.equal(generatedNewsInsight({ status: "PROCESSING", targetLocale: "en", result }, "en"), result);
});

test("완성되지 않은 요약과 전환 전 언어의 결과는 표시하지 않는다", () => {
  assert.equal(generatedNewsInsight({ status: "PROCESSING", targetLocale: "en", result: summary }, "en"), null);
  assert.equal(generatedNewsInsight({ status: "READY", targetLocale: "en", result: summary }, "ko"), null);
  assert.equal(generatedNewsInsight({ status: "READY", targetLocale: "en", result: { what: "Incomplete" } }, "en"), null);
});

test("본문 실패에도 이미 검증한 요약을 유지하고 구버전 완료 캐시도 표시한다", () => {
  const result = { ...summary, summaryReady: true, bodyReady: false };
  assert.equal(generatedNewsInsight({ status: "FAILED", targetLocale: "en", result }, "en"), result);
  assert.equal(generatedNewsInsight({ status: "READY", targetLocale: "en", result: summary }, "en"), summary);
});
