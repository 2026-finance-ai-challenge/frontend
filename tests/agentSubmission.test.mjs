import assert from "node:assert/strict";
import test from "node:test";
import { createSubmissionGate } from "../src/agentSubmission.ts";

test("Ask 전송은 상태 갱신 전 연속 호출과 effect 재실행에도 한 번만 진행한다", () => {
  const gate = createSubmissionGate();
  assert.equal(gate.start("ask-id"), true);
  assert.equal(gate.start("ask-id"), false);
  assert.equal(gate.start("double-click-id"), false);
  gate.finish();
  assert.equal(gate.start("ask-id"), false);
  assert.equal(gate.start("next-question-id"), true);
});
