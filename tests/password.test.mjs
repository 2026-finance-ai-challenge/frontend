import test from "node:test";
import assert from "node:assert/strict";
import { isValidPassword } from "../src/utils/password.ts";

test("8자 이상 영문·숫자·특수기호 조합을 허용하고 대문자는 강제하지 않는다", () => {
  for (const value of ["abcdef1!", "ABCDEF1!", "한글비밀번호a1!", "a".repeat(126) + "1!"]) {
    assert.equal(isValidPassword(value), true);
  }
});

test("짧은 값·특수기호 누락·공백·제어문자·128자 초과를 거절한다", () => {
  for (const value of ["abcdefg!", "1234567!", "한글비밀번호입력!", "abcdef!", "abcdefgh", "한글비밀번호입력값", "abcdefg ", "abcdefg!\n", "abcdef!\0", "a".repeat(128) + "!"]) {
    assert.equal(isValidPassword(value), false);
  }
});
