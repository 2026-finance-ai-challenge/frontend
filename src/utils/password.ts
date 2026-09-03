export const PASSWORD_HELP = {
  ko: "8자 이상, 영문·숫자·특수기호를 조합하세요.",
  en: "Min 8 characters, combination of letters, numbers, and symbols",
} as const;

export function isValidPassword(value: string) {
  return /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[\p{P}\p{S}])[^\s\p{C}]{8,128}$/u.test(value);
}
