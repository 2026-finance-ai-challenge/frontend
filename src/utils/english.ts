const NON_ENGLISH_SCRIPT = /[ㄱ-ㅎㅏ-ㅣ가-힣\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const KOREAN_CURRENCY_ROMANIZATION = /\b(?:eok|jo)(?:[ -]?won)?\b|\bman[ -]?won\b/i;

export function isVerifiedEnglish(value: unknown): boolean {
  if (typeof value === "string") {
    return !NON_ENGLISH_SCRIPT.test(value) && !KOREAN_CURRENCY_ROMANIZATION.test(value);
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

export function hasVerifiedEnglishTitle(value: { englishTitle?: string | null; titleEn?: string | null }) {
  return Boolean(verifiedEnglishText(value.englishTitle ?? value.titleEn));
}
