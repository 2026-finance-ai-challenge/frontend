import test from "node:test";
import assert from "node:assert/strict";
import { isVerifiedEnglish } from "../src/utils/english.ts";

test("인명 Jo와 Samjeonnix는 통화 단위로 오인하지 않는다", () => {
  assert.equal(isVerifiedEnglish("Jo joins the shortlist; Samjeonnix shares rise"), true);
  assert.equal(isVerifiedEnglish("Funding reaches 3 jo"), false);
  assert.equal(isVerifiedEnglish("Raises 344 eok won"), false);
  assert.equal(isVerifiedEnglish("English 제목"), false);
});
