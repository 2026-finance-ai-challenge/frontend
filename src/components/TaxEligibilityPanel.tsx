import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiBlob, queryString } from "../api";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { SupportedCountry, TaxDocument } from "../types";
import { useLocale } from "../state/LocaleContext";
import { CountryOptions } from "./CountryOptions";
import { AgentOverflowMenu } from "./AgentHistory";

type TaxEligibility = {
  countryName: string;
  investorType: string;
  treatyDataAvailable: boolean;
  domesticDefaultRate: number;
  treatyDividendRate: number | null;
  caveats: string[];
  asOf: string;
};

type TaxComparison = {
  verificationStatus: string;
  findings: Array<{ code: string; severity: string; message: string }>;
  crossCheck: { matched?: boolean; reason?: string | null };
  documents: Array<{ detectedDocumentType: string; verificationStatus: string }>;
  modelId: string;
};

type TaxEligibilityPanelProps = {
  close: () => void;
  openHistory: () => void;
};

const requiredDocuments = [
  { type: "RESIDENCY_CERTIFICATE", en: "Certificate of residence", ko: "거주자 증명서" },
  { type: "APOSTILLE", en: "Apostille", ko: "아포스티유" },
  { type: "REDUCED_TAX_APPLICATION", en: "Application for reduced tax rate", ko: "제한세율 적용신청서" },
] as const;

export function TaxEligibilityPanel({ close, openHistory }: TaxEligibilityPanelProps) {
  const { locale } = useLocale();
  const profile = useProfile();
  const countries = useRemote((signal) => api<SupportedCountry[]>("/api/v1/tax/countries", { signal }), []);
  const documents = useRemote(
    (signal) => profile ? api<TaxDocument[]>("/api/v1/me/tax-documents", { signal }) : Promise.resolve([]),
    [profile],
  );
  const [country, setCountry] = useState("US");
  const [investor, setInvestor] = useState("INDIVIDUAL");
  const [result, setResult] = useState<TaxEligibility | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comparison, setComparison] = useState<TaxComparison | null>(null);
  const [introStage, setIntroStage] = useState<"sent" | "thinking" | "ready">("sent");
  const [assessmentRequest, setAssessmentRequest] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"eligibility" | "upload" | "comparison" | "document" | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const comparisonKeyRef = useRef("");

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!profile) return;
    void api<Array<{ id: string; context: { type: string } }>>("/api/v1/me/chats")
      .then((rooms) => rooms.some((room) => room.context.type === "TAX_GUIDE")
        ? undefined
        : api("/api/v1/me/chats", { method: "POST", body: JSON.stringify({ contextType: "TAX_GUIDE" }) }))
      .catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    const thinkingTimer = window.setTimeout(() => setIntroStage("thinking"), 220);
    const answerTimer = window.setTimeout(() => setIntroStage("ready"), 1050);
    return () => {
      window.clearTimeout(thinkingTimer);
      window.clearTimeout(answerTimer);
    };
  }, []);

  useEffect(() => {
    const chat = chatRef.current;
    if (!chat) return;
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [assessmentRequest, busy, comparison, documents.data, introStage, result]);

  useEffect(() => {
    const supported = countries.data || [];
    if (supported.some((item) => item.countryCode === "US") && country !== "US") setCountry("US");
  }, [countries.data, country]);

  useEffect(() => {
    if (!documents.data?.some((document) => document.status === "PROCESSING")) return;
    const timer = window.setInterval(documents.retry, 1200);
    return () => window.clearInterval(timer);
  }, [documents.data, documents.retry]);

  const latestByType = useMemo(() => {
    const latest = new Map<string, TaxDocument>();
    for (const document of documents.data || []) {
      if (!latest.has(document.documentType)) latest.set(document.documentType, document);
    }
    return latest;
  }, [documents.data]);
  const blockingDocument = requiredDocuments
    .map((item) => latestByType.get(item.type))
    .find((document) => document && ["PROCESSING", "FAILED", "REJECTED"].includes(document.status)) || null;
  const nextDocument = blockingDocument
    ? null
    : requiredDocuments.find((item) => !latestByType.has(item.type)) || null;
  const selected = requiredDocuments.map((item) => latestByType.get(item.type)).filter((item): item is TaxDocument => Boolean(item));
  const readyToCompare = selected.length === 3 && selected.every((document) => ["VERIFIED", "REVIEW_REQUIRED"].includes(document.status));

  useEffect(() => {
    if (!readyToCompare || comparison || busy) return;
    const key = selected.map((document) => document.id).join(":");
    if (comparisonKeyRef.current === key) return;
    comparisonKeyRef.current = key;
    setBusy("comparison");
    setError("");
    void api<TaxComparison>("/api/v1/me/tax-documents/comparison", {
      method: "POST",
      body: JSON.stringify({ documentIds: selected.map((document) => document.id) }),
    }).then(setComparison).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Document comparison failed.");
    }).finally(() => setBusy(null));
  }, [busy, comparison, readyToCompare, selected]);

  const submitEligibility = async (event: FormEvent) => {
    event.preventDefault();
    const countryName = countries.data?.find((item) => item.countryCode === country)?.countryName || country;
    const investorName = investor === "INDIVIDUAL"
      ? locale === "ko" ? "개인" : "Individual"
      : locale === "ko" ? "법인" : "Corporate";
    setAssessmentRequest(`${countryName} · ${investorName}`);
    setResult(null);
    setBusy("eligibility");
    setError("");
    try {
      const [eligibility] = await Promise.all([
        api<TaxEligibility>("/api/v1/tax/eligibility", {
          method: "POST",
          body: JSON.stringify({ residencyCountry: country, investorType: investor }),
        }),
        // 빠른 응답에서도 사용자에게 요청 처리 상태가 인지되도록 최소 표시 시간을 보장한다.
        new Promise<void>((resolve) => window.setTimeout(resolve, 700)),
      ]);
      setResult(eligibility);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tax eligibility could not be checked.");
    } finally {
      setBusy(null);
    }
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !nextDocument || blockingDocument) return;
    setBusy("upload");
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      await api<TaxDocument>(`/api/v1/me/tax-documents${queryString({
        documentType: nextDocument.type,
        expectedResidencyCountry: country,
      })}`, { method: "POST", body: form });
      setFile(null);
      documents.retry();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The document could not be uploaded.");
    } finally {
      setBusy(null);
    }
  };

  const retryDocument = async (documentId: string) => {
    if (busy) return;
    setBusy("document"); setError("");
    try {
      await api(`/api/v1/me/tax-documents/${documentId}/retry`, { method: "POST" });
      setComparison(null); comparisonKeyRef.current = "";
      documents.retry();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Document update failed."); }
    finally { setBusy(null); }
  };

  const openOriginal = async (document: TaxDocument) => {
    const opened = window.open("", "_blank", "noopener,noreferrer");
    try {
      const content = await apiBlob(`/api/v1/me/tax-documents/${document.id}/original`);
      const url = URL.createObjectURL(content);
      if (!opened) throw new Error(locale === "ko" ? "팝업이 차단되었습니다." : "Your browser blocked the document window.");
      opened.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      opened?.close();
      setError(reason instanceof Error ? reason.message : "The original document could not be opened.");
    }
  };

  const restart = async () => {
    if (busy || !profile) return;
    setBusy("document"); setError("");
    try {
      await Promise.all((documents.data || []).map((document) => api(`/api/v1/me/tax-documents/${document.id}`, { method: "DELETE" })));
      setResult(null); setComparison(null); setAssessmentRequest(""); setFile(null); comparisonKeyRef.current = "";
      documents.retry();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The assessment could not be restarted."); }
    finally { setBusy(null); }
  };

  return (
    <aside className="agent-panel tax-eligibility-panel" id="tax-eligibility-panel" role="dialog" aria-modal="true" aria-label={locale === "ko" ? "세율 확인 K-Agent" : "Tax eligibility K-Agent"}>
      <button className="agent-close" type="button" onClick={close} ref={closeButtonRef}>
        <img src="/assets/close.svg" alt="" /> {locale === "ko" ? "닫기" : "Close"}
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge-381-4971.svg" alt="" />
        <div><h2>K-Agent</h2><p>{locale === "ko" ? "AI 금융 인텔리전스" : "AI Financial Intelligence"}</p></div>
        <AgentOverflowMenu onHistory={openHistory} onDelete={profile ? () => void restart() : undefined} />
      </header>
      <div className="context-chip"><img src="/assets/tax.svg" alt="" /> {locale === "ko" ? "배당 원천징수세" : "Dividend withholding tax"}</div>
      {profile ? <button className="tax-restart" type="button" disabled={Boolean(busy)} onClick={() => void restart()}>{locale === "ko" ? "처음부터 다시 시작" : "Start over"}</button> : null}
      <div className="chat tax-agent-chat" aria-live="polite" ref={chatRef}>
        <p className="user-message user-message-enter">{locale === "ko" ? "세율 확인을 시작했습니다" : "Tax assessment started"}</p>
        {introStage === "thinking" ? <TypingBubble locale={locale} /> : null}
        {introStage === "ready" ? <>
          <div className="ai-message ai-message-enter"><p>{locale === "ko" ? "한국과 조세조약이 체결된 국가의 거주자는 배당 원천징수세율 감면 대상일 수 있습니다. 거주 국가와 투자자 유형을 선택해 주세요." : "If Korea has a tax treaty with your country, you may qualify for a reduced dividend withholding tax rate. Select your tax residence and investor type."}</p></div>
          <form className="tax-agent-form ai-message-enter" onSubmit={submitEligibility}>
            <label>{locale === "ko" ? "거주 국가" : "Country of residence"}<select value={country} onChange={(event) => setCountry(event.target.value)}><CountryOptions countries={countries.data ?? []} /></select></label>
            <label>{locale === "ko" ? "투자자 유형" : "Investor type"}<select value={investor} onChange={(event) => setInvestor(event.target.value)}><option value="INDIVIDUAL">{locale === "ko" ? "개인" : "Individual"}</option><option value="CORPORATE">{locale === "ko" ? "법인" : "Corporate"}</option></select></label>
            <button type="submit" disabled={Boolean(busy) || !countries.data?.length}>{locale === "ko" ? "내 세율 확인" : "Check my rate"}</button>
          </form>
        </> : null}
        {assessmentRequest ? <p className="user-message user-message-enter">{assessmentRequest}</p> : null}
        {busy === "eligibility" ? <TypingBubble locale={locale} /> : null}
        {result ? <div className="ai-message tax-agent-result ai-message-enter"><p>{result.treatyDataAvailable ? locale === "ko" ? <>공개된 일반 조세조약 배당세율은 <b>{result.treatyDividendRate}%</b>, 국내 기본세율은 <b>{result.domesticDefaultRate}%</b>입니다.</> : <>The published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with the <b>{result.domesticDefaultRate}%</b> domestic default.</> : locale === "ko" ? "검증된 조세조약 세율이 없습니다." : "No verified treaty rate is available."}</p></div> : null}
        {result && !profile ? <div className="ai-message ai-message-enter"><p className="tax-login-prompt"><Link className="login-button tax-login-button" to="/login?returnTo=%2Ftax" onClick={close}>{locale === "ko" ? "로그인" : "Log in"}</Link><span>{locale === "ko" ? "세무 서류를 안전하게 업로드하고 검증할 수 있습니다." : "to upload and verify tax documents securely."}</span></p></div> : null}
        {result && profile ? <>
          {selected.map((document) => <div key={document.id} className="tax-document-turn"><button type="button" className="user-message user-message-enter tax-file-bubble" onClick={() => void openOriginal(document)}>{document.originalFileName}</button><div className="ai-message tax-document-message ai-message-enter"><b>{requiredDocuments.find((item) => item.type === document.documentType)?.[locale === "ko" ? "ko" : "en"]}</b><small className={`tax-document-status is-${document.status.toLowerCase()}`}>{document.status === "PROCESSING" ? `${document.stage || "OCR"} · ${document.progress}%` : document.status.replaceAll("_", " ")}</small>{document.status !== "PROCESSING" && document.issues.length ? <ul>{document.issues.slice(0, 3).map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul> : null}{["FAILED", "REJECTED"].includes(document.status) ? <button type="button" className="login-button tax-document-retry" disabled={Boolean(busy)} onClick={() => void retryDocument(document.id)}>{locale === "ko" ? "다시 업로드" : "Upload again"}</button> : null}</div></div>)}
          {busy === "upload" || selected.some((document) => document.status === "PROCESSING") ? <TypingBubble locale={locale} /> : null}
          {nextDocument && busy !== "upload" && !blockingDocument ? <div className="ai-message tax-document-prompt ai-message-enter"><p>{locale === "ko" ? `다음으로 ${nextDocument.ko}를 업로드해 주세요.` : `Next, upload your ${nextDocument.en.toLowerCase()}.`}</p><form onSubmit={upload}><label className="tax-file-picker"><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file?.name || (locale === "ko" ? "파일 선택" : "Choose file")}</span></label><button type="submit" disabled={!file || Boolean(busy)}>{locale === "ko" ? "안전하게 업로드" : "Upload securely"}</button></form></div> : null}
          {busy === "comparison" ? <TypingBubble locale={locale} /> : null}
          {comparison ? <div className="ai-message tax-comparison-result ai-message-enter"><b>{locale === "ko" ? "3개 서류 비교 검증 완료" : "Three-document comparison complete"}</b><p>{comparison.crossCheck.matched ? locale === "ko" ? "거주자증명서와 제한세율 신청서의 성명, 납세자번호, 거주국이 일치합니다." : "Name, taxpayer identifier, and residence country match across the certificate and application." : locale === "ko" ? "서류 간 불일치가 있어 수동 검토가 필요합니다." : "A cross-document mismatch requires manual review."}</p><strong>{comparison.verificationStatus.replaceAll("_", " ")}</strong>{comparison.findings.length ? <ul>{comparison.findings.slice(0, 5).map((finding) => <li key={finding.code}>{finding.message}</li>)}</ul> : null}</div> : null}
        </> : null}
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </div>
      <p className="tax-agent-disclaimer">{locale === "ko" ? "KART는 서류 접수 전 검증을 보조하며 정부의 진위 확인이나 세무 자문을 대체하지 않습니다." : "KART assists pre-submission checks and does not replace government authentication or tax advice."}</p>
    </aside>
  );
}

function TypingBubble({ locale }: { locale: "ko" | "en" }) {
  return <div className="agent-thinking" role="status"><span className="sr-only">{locale === "ko" ? "K-Agent가 확인하는 중" : "K-Agent is checking"}</span><i /><i /><i /></div>;
}
