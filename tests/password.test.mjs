import test from "node:test";
import assert from "node:assert/strict";
import { isValidPassword } from "../src/utils/password.ts";

test("8자 특수기호 비밀번호는 대문자나 숫자 조합 없이 허용한다", () => {
  for (const value of ["abcdefg!", "1234567!", "한글비밀번호입력!", "a".repeat(127) + "!"]) {
    assert.equal(isValidPassword(value), true);
  }
});

test("짧은 값·특수기호 누락·공백·제어문자·128자 초과를 거절한다", () => {
  for (const value of ["abcdef!", "abcdefgh", "한글비밀번호입력값", "abcdefg ", "abcdefg!\n", "abcdef!\0", "a".repeat(128) + "!"]) {
    assert.equal(isValidPassword(value), false);
  }
});
