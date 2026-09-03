export type AgentCitation = {
  id: string;
  sourceType?: string;
  referenceId?: string;
  title: string;
  titleEn?: string | null;
  titleKo?: string | null;
  url: string | null;
};

export function citationTitle(citation: AgentCitation, locale: string): string | null {
  if (filingPath(citation) || citation.sourceType === "NEWS") return (locale === "ko" ? citation.titleKo : citation.titleEn) || null;
  return citation.title;
}

export function filingPath(citation: AgentCitation): string | null {
  if (citation.sourceType === "FILING" && /^\d{14}$/.test(citation.referenceId || "")) {
    return `/disclosures/${citation.referenceId}`;
  }
  if (/^\/disclosures\/\d{14}$/.test(citation.url || "")) return citation.url;
  try {
    const url = new URL(citation.url || "");
    const receipt = url.searchParams.get("rcpNo");
    // 이전 대화의 공식 공시 주소도 검증된 접수번호로 내부 이동시킨다.
    if (url.protocol === "https:" && url.hostname === "dart.fss.or.kr" && /^\d{14}$/.test(receipt || "")) {
      return `/disclosures/${receipt}`;
    }
  } catch { /* 주소가 없는 출처는 텍스트로 표시한다. */ }
  return null;
}

export function citationHref(citation: AgentCitation): string | null {
  const internal = filingPath(citation);
  if (internal) return internal;
  try {
    const url = new URL(citation.url || "");
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

export function answerWithCitationMarkers(content: string, citations: AgentCitation[]): string {
  let result = content;
  for (const citation of citations) {
    const path = filingPath(citation);
    if (!path) continue;
    const receipt = path.split("/").at(-1)!;
    const addresses = new Set([citation.url, path, `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`, `http://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`]);
    for (const address of addresses) {
      if (!address) continue;
      const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`\\[([^\\]]*)\\]\\(${escaped}\\)`, "g"), `$1 [${citation.id}]`);
      result = result.split(address).join(`[${citation.id}]`);
    }
  }
  return result;
}
