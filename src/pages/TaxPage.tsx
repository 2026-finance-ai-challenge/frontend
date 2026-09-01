import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Layout";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { SupportedCountry, TaxDocument } from "../types";
import { useLocale } from "../state/LocaleContext";

type Eligibility = {
  countryCode: string;
  countryName: string;
  investorType: string;
  treatyDataAvailable: boolean;
  domesticDefaultRate: number;
  treatyDividendRate: number | null;
  potentialQualifyingCorporateRate: number | null;
  minimumOwnershipPercent: number | null;
  sourceUrl: string;
  domesticSourceUrl: string;
  requiredDocuments: string[];
  caveats: string[];
  asOf: string;
};

export function TaxPage() {
  const { locale } = useLocale();
  const profile = useProfile();
  const countries = useRemote((signal) => api<SupportedCountry[]>("/api/v1/tax/countries", { signal }), []);
  const documents = useRemote((signal) => profile ? api<TaxDocument[]>("/api/v1/me/tax-documents", { signal }) : Promise.resolve([]), [profile]);
  const [country, setCountry] = useState("US");
  const [investor, setInvestor] = useState("INDIVIDUAL");
  const [result, setResult] = useState<Eligibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const supported = countries.data || [];
    if (supported.some((item) => item.countryCode === "US") && country !== "US") setCountry("US");
  }, [countries.data, country]);
  return (
    <div className="tax-page">
      <Header white />
      <main className="tax-chat page-shell">
        <Link className="back-link" to="/">
          <img src="/assets/close.svg" alt="" /> {locale === "ko" ? "닫기" : "Close"}
        </Link>
        <header className="tax-agent-head">
          <img src="/assets/agent-badge.svg" alt="" />
          <div>
            <h1>K-Agent</h1>
            <p>{locale === "ko" ? "AI 금융 인텔리전스" : "AI Financial Intelligence"}</p>
          </div>
          <img className="tax-overflow" src="/assets/overflow.svg" alt="" />
        </header>
        <div className="tax-conversation">
          <div className="user-bubble">{locale === "ko" ? "세율 확인을 시작했습니다" : "Tax assessment started"}</div>
          <section className="tax-message">
            <p>
              {locale === "ko" ? "한국과 조세조약이 체결된 국가의 거주자는 배당소득 원천징수세율 감면 대상일 수 있습니다. 거주 국가를 선택해 주세요." : "If a tax treaty is in place with Korea, you may be eligible for a reduced withholding tax rate on dividend income. What is your nationality?"}
            </p>
          </section>
          <section className="tax-message tax-form-message">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                void api<Eligibility>("/api/v1/tax/eligibility", {
                  method: "POST",
                  body: JSON.stringify({ residencyCountry: country, investorType: investor }),
                }).then(setResult).catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "Tax data could not be checked.");
                }).finally(() => setBusy(false));
              }}
            >
              <label>
                {locale === "ko" ? "거주 국가" : "Country of residence"}
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  {(countries.data || []).map((item) => (
                    <option disabled={item.countryCode !== "US"} value={item.countryCode} key={item.countryCode}>
                      {item.countryName}{item.countryCode === "US" ? "" : locale === "ko" ? " · 준비 중" : " · Coming soon"}
                    </option>
                  ))}
                </select>
                <small>{locale === "ko" ? "현재 검증된 세율 확인은 미국 거주자만 지원합니다." : "Verified eligibility is currently available for United States residents only."}</small>
              </label>
              <label>
                {locale === "ko" ? "투자자 유형" : "Investor type"}
                <select
                  value={investor}
                  onChange={(event) => setInvestor(event.target.value)}
                >
                  <option value="INDIVIDUAL">{locale === "ko" ? "개인" : "Individual"}</option>
                  <option value="CORPORATE">{locale === "ko" ? "법인" : "Corporate"}</option>
                </select>
              </label>
              <button disabled={busy || !countries.data?.length}>{busy ? (locale === "ko" ? "확인 중…" : "Checking…") : (locale === "ko" ? "내 세율 확인" : "Check my rate")}</button>
            </form>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
          </section>

          {result ? (
            <>
              <div className="user-bubble">
                {result.countryName}, {result.investorType}
              </div>
              <section className="tax-message result">
                <h2>
                  <img src="/assets/agent-badge.svg" alt="" /> {locale === "ko" ? "검증된 조세조약 데이터" : "Verified treaty data"}
                </h2>
                <p>
                  {result.treatyDataAvailable && result.treatyDividendRate !== null
                    ? locale === "ko" ? <>공개된 일반 조세조약 배당세율은 <b>{result.treatyDividendRate}%</b>이며 국내 기본세율은 <b>{result.domesticDefaultRate}%</b>입니다.</> : <>The published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with the domestic default of <b>{result.domesticDefaultRate}%</b>.</>
                    : locale === "ko" ? <>이 조건에 검증된 조세조약 배당세율이 없습니다. API가 제공한 국내 기본세율은 <b>{result.domesticDefaultRate}%</b>입니다.</> : <>A verified treaty dividend rate is unavailable for this profile. The domestic default shown by the API is <b>{result.domesticDefaultRate}%</b>.</>}
                  {" "}{locale === "ko" ? "데이터 기준일" : "Data date"}: {result.asOf}.
                </p>
                {result.potentialQualifyingCorporateRate !== null ? <p>{locale === "ko" ? "적격 법인 적용 가능 세율" : "Potential qualifying corporate rate"}: <b>{result.potentialQualifyingCorporateRate}%</b>{result.minimumOwnershipPercent !== null ? locale === "ko" ? ` (최소 지분율 ${result.minimumOwnershipPercent}% 충족 시)` : ` when the minimum ownership threshold of ${result.minimumOwnershipPercent}% is met` : ""}.</p> : null}
                <div>
                  {result.sourceUrl ? <a href={result.sourceUrl} target="_blank" rel="noreferrer">{locale === "ko" ? "조세조약 출처" : "Treaty source"}</a> : null}
                  {result.domesticSourceUrl ? <a href={result.domesticSourceUrl} target="_blank" rel="noreferrer">{locale === "ko" ? "국내 세율 출처" : "Domestic-rate source"}</a> : null}
                </div>
              </section>
              <section className="tax-message tax-docs">
                <h2><img src="/assets/tax-documents.svg" alt="" /> {locale === "ko" ? "필요 서류" : "Required documents"}</h2>
                {result.requiredDocuments.length ? <ol>{result.requiredDocuments.map((document) => <li key={document}><b>{document}</b></li>)}</ol> : <p>{locale === "ko" ? "이 조건에 검증된 서류 목록이 없습니다." : "No verified document list is available for this profile."}</p>}
              </section>
              <section className="tax-message tax-docs">
                <h2><img src="/assets/status-warning.svg" alt="" /> {locale === "ko" ? "적용 유의사항" : "Eligibility caveats"}</h2>
                {result.caveats.length ? <ul>{result.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul> : <p>{locale === "ko" ? "추가 유의사항이 없습니다." : "No additional caveats were returned."}</p>}
              </section>
            </>
          ) : null}
          {profile ? <TaxDocumentsPanel country={country} documents={documents} /> : <section className="tax-message"><p><Link to="/login?returnTo=%2Ftax">{locale === "ko" ? "로그인" : "Log in"}</Link>{locale === "ko" ? " 후 세무 서류를 안전하게 업로드하고 검증할 수 있습니다." : " to upload and verify tax documents securely."}</p></section>}
        </div>
        <p className="tax-disclaimer">
          {locale === "ko" ? "KART는 AI 도구이며 오류가 있을 수 있습니다. 인용된 출처를 반드시 다시 확인하세요." : "KART is an AI tool and can make mistakes. Please double-check the cited sources."}
        </p>
      </main>
    </div>
  );
}

function TaxDocumentsPanel({ country, documents }: { country: string; documents: ReturnType<typeof useRemote<TaxDocument[]>> }) {
  const { locale } = useLocale();
  const [documentType, setDocumentType] = useState("RESIDENCY_CERTIFICATE");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError("");
    const form = new FormData(); form.append("file", file);
    try {
      await api<TaxDocument>(`/api/v1/me/tax-documents${queryString({ documentType, expectedResidencyCountry: country })}`, { method: "POST", body: form });
      setFile(null); documents.retry();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The document could not be uploaded.");
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => { await api(`/api/v1/me/tax-documents/${id}`, { method: "DELETE" }); documents.retry(); };
  const retry = async (id: string) => { await api<TaxDocument>(`/api/v1/me/tax-documents/${id}/retry`, { method: "POST" }); documents.retry(); };
  return <section className="tax-message tax-upload"><h2><img src="/assets/tax-documents.svg" alt="" /> {locale === "ko" ? "안전한 서류 검증" : "Secure document verification"}</h2><form onSubmit={(event) => void upload(event)}><select value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label={locale === "ko" ? "서류 유형" : "Document type"}><option value="RESIDENCY_CERTIFICATE">{locale === "ko" ? "거주자 증명서" : "Residency certificate"}</option><option value="APOSTILLE">{locale === "ko" ? "아포스티유" : "Apostille"}</option><option value="REDUCED_TAX_APPLICATION">{locale === "ko" ? "제한세율 적용 신청서" : "Reduced tax application"}</option></select><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} aria-label={locale === "ko" ? "세무 서류" : "Tax document"} /><button disabled={!file || busy}>{busy ? (locale === "ko" ? "업로드 중…" : "Uploading…") : (locale === "ko" ? "안전하게 업로드" : "Upload securely")}</button></form>{error ? <p className="auth-error">{error}</p> : null}<RemoteState {...documents} empty={(value) => !value.length}>{(items) => <div className="tax-document-list">{items.map((document) => <article key={document.id}><div><b>{document.originalFileName}</b><small>{document.documentType.replaceAll("_", " ")} · {formatDate(document.updatedAt)}</small></div><span className={`tax-document-status is-${document.status.toLowerCase()}`}>{document.status.replaceAll("_", " ")}{document.status === "PROCESSING" ? ` · ${document.progress}%` : ""}</span><div>{document.status === "FAILED" ? <button type="button" onClick={() => void retry(document.id)}>{locale === "ko" ? "다시 시도" : "Retry"}</button> : null}<button type="button" onClick={() => void remove(document.id)}>{locale === "ko" ? "삭제" : "Delete"}</button></div></article>)}</div>}</RemoteState></section>;
}
