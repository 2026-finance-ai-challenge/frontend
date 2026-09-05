import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chatHistoryEmptyMessage } from "../src/chatHistory.ts";

test("대화가 없을 때 검색 결과 문구가 아닌 대화 전용 빈 상태를 표시한다", () => {
  assert.equal(chatHistoryEmptyMessage("ko", ""), "아직 대화가 없습니다.");
  assert.equal(chatHistoryEmptyMessage("en", ""), "No conversations yet.");
});

test("검색 결과가 없을 때만 검색 전용 빈 상태를 표시한다", () => {
  assert.equal(chatHistoryEmptyMessage("ko", "삼성"), "검색과 일치하는 대화가 없습니다.");
  assert.equal(chatHistoryEmptyMessage("en", "Samsung"), "No conversations match your search.");
});

test("채팅 패널은 배경 문서의 스크롤을 잠그지 않는 비모달 오버레이다", async () => {
  const [floatingSource, historySource, taxSource, styles] = await Promise.all([
    readFile(new URL("../src/components/KAgentFloating.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/AgentHistory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/TaxEligibilityPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(floatingSource, /agent-drawer-open/);
  assert.doesNotMatch(styles, /body\.agent-drawer-open/);
  assert.doesNotMatch(floatingSource, /aria-modal="true"/);
  assert.doesNotMatch(historySource, /aria-modal="true"/);
  assert.doesNotMatch(taxSource, /aria-modal="true"/);
  assert.match(styles, /\.agent-panel\s*\{[\s\S]*?position:\s*fixed;/);
}
);
