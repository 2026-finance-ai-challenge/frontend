import assert from "node:assert/strict";
import test from "node:test";
import { loadChatState } from "../src/agentRecovery.ts";

for (const status of ["PENDING", "PROCESSING", "FAILED", "COMPLETED", "STOPPED"]) {
  test(`대화 재진입은 ${status} 상태를 복원하며 생성을 요청하지 않는다`, async () => {
    const generation = { id: "generation", status, errorCode: status === "FAILED" ? "AI_SERVICE_UNAVAILABLE" : null, retryable: status === "FAILED" };
    const messages = [{ id: "question", content: "질문" }];
    const paths = [];
    const read = async (path) => { paths.push(path); return path.endsWith("/latest") ? { generation } : messages; };
    assert.deepEqual(await loadChatState(read, "room", new AbortController().signal), { generation, messages });
    assert.deepEqual(paths, ["/api/v1/me/chats/room/generations/latest", "/api/v1/me/chats/room/messages"]);
  });
}

test("다른 대화방으로 이동한 뒤 도착한 이전 요청은 상태를 덮어쓰지 않는다", async () => {
  const controller = new AbortController();
  let reads = 0;
  await assert.rejects(loadChatState(async () => {
    reads += 1;
    controller.abort();
    return { generation: null };
  }, "old-room", controller.signal), { name: "AbortError" });
  assert.equal(reads, 1);
});

test("생성 이력이 없는 대화도 원래 메시지를 그대로 복원한다", async () => {
  const result = await loadChatState(async (path) => path.endsWith("/latest") ? { generation: null } : [], "empty-room", new AbortController().signal);
  assert.deepEqual(result, { generation: null, messages: [] });
});
