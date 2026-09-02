export const PASSWORD_HELP = {
  ko: "특수기호를 포함해 8~128자로 입력하세요. 대문자는 필수가 아닙니다.",
  en: "Use 8–128 characters including a symbol. Uppercase is optional.",
} as const;

export function isValidPassword(value: string) {
  return /^(?=.*[\p{P}\p{S}])[^\s\p{C}]{8,128}$/u.test(value);
}
