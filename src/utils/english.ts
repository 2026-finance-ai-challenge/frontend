const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const KOREAN_CURRENCY_ROMANIZATION = /\b(?:eok|jo)(?:[ -]?won)?\b|\bman[ -]?won\b/i;

export function isVerifiedEnglish(value: unknown): boolean {
  if (typeof value === "string") {
    return !HANGUL.test(value) && !KOREAN_CURRENCY_ROMANIZATION.test(value);
  }
  if (Array.isArray(value)) return value.every(isVerifiedEnglish);
  if (value && typeof value === "object") {
    return Object.values(value).every(isVerifiedEnglish);
  }
  return true;
}

export function verifiedEnglishText(value: string | null | undefined) {
  return value && isVerifiedEnglish(value) ? value : null;
}
