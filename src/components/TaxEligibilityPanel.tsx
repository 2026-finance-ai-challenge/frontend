import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiBlob, queryString, session } from "../api";
import type { Profile } from "../types";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { SupportedCountry, TaxDocument } from "../types";
import { useLocale } from "../state/LocaleContext";
import { CountryOptions } from "./CountryOptions";
import { AgentOverflowMenu } from "./AgentHistory";
import { LoadingSkeleton } from "./LoadingSkeleton";

type TaxEligibility = { countryCode: string; countryName: string; investorType: string; treatyDataAvailable: boolean; domesticDefaultRate: number; treatyDividendRate: number | null };
type TaxComparison = { verificationStatus: string; findings: Array<{ code: string; message: string }>; crossCheck: { matched?: boolean } };
type TaxConversation = { roomId: string; locale: "en" | "ko"; eligibility: TaxEligibility | null; comparison: TaxComparison | null; guideDepth: number; verificationStarted: boolean };
type TaxGuideAction = "SHOW_GUIDE" | "SHOW_MORE_DETAIL" | "START_VERIFICATION";
type Document = TaxDocument & { contentAvailable?: boolean };
type Preview = { url: string; mediaType: string };
const requiredDocuments = [
  { type: "RESIDENCY_CERTIFICATE", en: "Certificate of residence", ko: "거주자 증명서" },
  { type: "APOSTILLE", en: "Apostille", ko: "아포스티유" },
  { type: "REDUCED_TAX_APPLICATION", en: "Application for reduced tax rate", ko: "제한세율 적용신청서" },
] as const;

export function TaxEligibilityPanel({ close, openHistory }: { close: () => void; openHistory: () => void }) {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const profile = useProfile();
  const countries = useRemote((signal) => api<SupportedCountry[]>("/api/v1/tax/countries", { signal }), []);
  const conversation = useRemote((signal) => profile ? api<TaxConversation>("/api/v1/me/tax-conversation", {
    method: "POST", body: JSON.stringify({ locale }), signal,
  }) : Promise.resolve(null), [profile?.id]);
  const documents = useRemote((signal) => profile ? api<Document[]>("/api/v1/me/tax-documents", { signal }) : Promise.resolve([]), [profile?.id, conversation.data?.roomId]);
  const [country, setCountry] = useState("US");
  const [investor, setInvestor] = useState("INDIVIDUAL");
  const [guestResult, setGuestResult] = useState<TaxEligibility | null>(null);
  const [guestGuideDepth, setGuestGuideDepth] = useState(0);
  const [guestVerificationStarted, setGuestVerificationStarted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<Preview | null>(null);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const previewUrls = useRef(new Set<string>());
  const [introStage, setIntroStage] = useState("sent");
  const [assessmentRequest, setAssessmentRequest] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const result = profile ? conversation.data?.eligibility : guestResult;
  const comparison = conversation.data?.comparison;
  useEffect(() => {
    if (!profile || !conversation.data?.roomId) return;
    const controller = new AbortController();
    void api<Profile>("/api/v1/me", { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) session.updateUser(value);
    }).catch(() => {});
    return () => controller.abort();
  }, [profile?.id, conversation.data?.roomId, comparison]);
  const messageLocale = conversation.data?.locale || locale;
  const allDocuments = documents.data || [];
  const guideDepth = profile ? conversation.data?.guideDepth || 0 : guestGuideDepth;
  const verificationStarted = profile ? Boolean(conversation.data?.verificationStarted) : guestVerificationStarted;
  const processing = allDocuments.some((item) => item.status === "PROCESSING");
  const locked = Boolean(busy) || processing || (Boolean(profile) && (conversation.loading || documents.loading));
  const nextDocument = requiredDocuments.find((required) => !allDocuments.some((item) => item.documentType === required.type && item.status === "VERIFIED"));
  const ordered = [...allDocuments].reverse();
  const comparisonAttempt = useRef("");
  const [comparisonFailed, setComparisonFailed] = useState(false);
  const [comparisonRetry, setComparisonRetry] = useState(0);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [close]);
  useEffect(() => {
    const thinking = window.setTimeout(() => setIntroStage("thinking"), 220);
    const ready = window.setTimeout(() => setIntroStage("ready"), 1050);
    return () => { window.clearTimeout(thinking); window.clearTimeout(ready); };
  }, []);
  useEffect(() => () => { for (const url of previewUrls.current) URL.revokeObjectURL(url); }, []);
  useEffect(() => {
    if (!processing) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const value = await api<Document[]>("/api/v1/me/tax-documents", { signal: controller.signal });
        if (!controller.signal.aborted) { documents.setData(value); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to check verification.");
          timer = window.setTimeout(poll, 3000);
        }
      }
    };
    timer = window.setTimeout(poll, 1000);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [processing, documents.data, documents.setData]);
  const lastTurn = ordered.map((document) => document.id + ":" + document.status).join();
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [lastTurn, result, comparison, busy, introStage]);
  useEffect(() => {
    if (nextDocument || !allDocuments.length || processing || locked || comparison || !conversation.data) return;
    const selected = requiredDocuments.map((required) => allDocuments.find((item) => item.documentType === required.type && item.status === "VERIFIED")!);
    const key = selected.map((item) => item.id).join(":");
    if (comparisonAttempt.current === key || busyRef.current) return;
    comparisonAttempt.current = key;
    busyRef.current = true; setBusy("comparison");
    void api<TaxComparison>("/api/v1/me/tax-documents/comparison", { method: "POST", body: JSON.stringify({ documentIds: selected.map((item) => item.id) }) })
      .then((value) => conversation.setData({ ...conversation.data!, comparison: value }))
      .catch((reason: unknown) => { setComparisonFailed(true); setError(reason instanceof Error ? reason.message : "Comparison failed."); })
      .finally(() => { busyRef.current = false; setBusy(null); });
  }, [allDocuments, nextDocument, processing, locked, comparison, conversation.data, conversation.setData, comparisonRetry]);

  const submitEligibility = async (event: FormEvent) => {
    event.preventDefault();
    if (locked || busyRef.current) return;
    busyRef.current = true; setBusy("eligibility"); setError("");
    setAssessmentRequest(country + " · " + investor);
    try {
      if (profile) {
        conversation.setData(await api<TaxConversation>("/api/v1/me/tax-conversation/eligibility", { method: "POST", body: JSON.stringify({ residencyCountry: country, investorType: investor, locale }) }));
      } else {
        const [value] = await Promise.all([
          api<TaxEligibility>("/api/v1/tax/eligibility", { method: "POST", body: JSON.stringify({ residencyCountry: country, investorType: investor }) }),
          new Promise<void>((resolve) => window.setTimeout(resolve, 700)),
        ]);
        setGuestResult(value);
        setGuestGuideDepth(0);
        setGuestVerificationStarted(false);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to check eligibility."); }
    finally { busyRef.current = false; setBusy(null); }
  };
  const advanceFlow = async (action: TaxGuideAction) => {
    if (!result || locked || busyRef.current) return;
    busyRef.current = true; setBusy("flow"); setError("");
    try {
      if (profile) {
        conversation.setData(await api<TaxConversation>("/api/v1/me/tax-conversation/flow", {
          method: "POST", body: JSON.stringify({ action }),
        }));
      } else if (action === "SHOW_GUIDE") {
        setGuestGuideDepth((value) => Math.max(value, 1));
      } else if (action === "SHOW_MORE_DETAIL") {
        setGuestGuideDepth(2);
      } else {
        setGuestVerificationStarted(true);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue the tax guide."); }
    finally { busyRef.current = false; setBusy(null); }
  };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !nextDocument || locked || busyRef.current) return;
    busyRef.current = true; setBusy("upload"); setError("");
    const preview = { url: URL.createObjectURL(file), mediaType: file.type };
    previewUrls.current.add(preview.url); setPendingPreview(preview);
    const form = new FormData(); form.append("file", file);
    try {
      const document = await api<Document>("/api/v1/me/tax-documents" + queryString({ documentType: nextDocument.type, expectedResidencyCountry: result?.countryCode || country }), { method: "POST", body: form });
      setPreviews((value) => ({ ...value, [document.id]: preview }));
      documents.setData([document, ...allDocuments]); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to upload document."); }
    finally { setPendingPreview(null); busyRef.current = false; setBusy(null); }
  };
  const restart = async () => {
    if (busyRef.current || !conversation.data || processing) return;
    busyRef.current = true; setBusy("restart"); setError("");
    try {
      const fresh = await api<TaxConversation>("/api/v1/me/tax-conversation/restart", { method: "POST", body: JSON.stringify({ roomId: conversation.data.roomId, locale }) });
      conversation.setData(fresh); documents.setData([]); setPreviews({});
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current.clear(); setFile(null); setAssessmentRequest(""); comparisonAttempt.current = "";
      setGuestGuideDepth(0); setGuestVerificationStarted(false);
      setComparisonFailed(false);
      setRestartConfirm(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to restart."); }
    finally { busyRef.current = false; setBusy(null); }
  };
  const remove = async () => {
    if (busyRef.current || !conversation.data) return;
    busyRef.current = true; setBusy("delete");
    try { await api("/api/v1/me/chats/" + conversation.data.roomId, { method: "DELETE" }); close(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete conversation."); }
    finally { busyRef.current = false; setBusy(null); }
  };
  const again = () => { if (!locked) { setFile(null); if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } } };
  const login = () => { close(); navigate("/login?returnTo=%2Ftax"); };
  return <aside className="agent-panel tax-eligibility-panel" role="dialog" aria-label={locale === "ko" ? "세무 검증 K-Agent" : "Tax assessment K-Agent"}>
    <button className="agent-close" type="button" onClick={close} ref={closeRef}><img src="/assets/close.svg" alt="" />{locale === "ko" ? "닫기" : "Close"}</button>
    <header><img className="agent-logo" src="/assets/agent-badge-381-4971.svg" alt="" /><div><h2>K-Agent</h2><p>{locale === "ko" ? "AI 금융 인텔리전스" : "AI Financial Intelligence"}</p></div><AgentOverflowMenu onHistory={profile ? openHistory : login} onDelete={profile ? conversation.data ? () => setDeleteConfirm(true) : undefined : login} /></header>
    <div className="context-chip"><img src="/assets/tax.svg" alt="" /><span>{locale === "ko" ? "배당 원천징수세" : "Dividend withholding tax"}</span>{profile ? <button type="button" className="tax-restart" disabled={locked} onClick={() => setRestartConfirm(true)}><img src="/assets/history.svg" alt="" />{locale === "ko" ? "처음부터 다시 시작" : "Start over"}</button> : null}</div>
    {restartConfirm ? <div className="tax-restart-confirm" role="alertdialog"><p>{locale === "ko" ? "이 대화와 업로드한 서류를 삭제하고 새로 시작할까요?" : "Delete this conversation and its documents and start again?"}</p><button type="button" className="login-button" disabled={locked} onClick={() => void restart()}>{locale === "ko" ? "삭제 후 새로 시작" : "Delete and start over"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setRestartConfirm(false)}>{locale === "ko" ? "취소" : "Cancel"}</button></div> : null}
    {deleteConfirm ? <div className="tax-restart-confirm" role="alertdialog"><p>{locale === "ko" ? "이 대화와 업로드한 서류를 영구 삭제할까요?" : "Permanently delete this conversation and its documents?"}</p><button type="button" className="login-button" disabled={Boolean(busy)} onClick={() => void remove()}>{locale === "ko" ? "삭제" : "Delete"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setDeleteConfirm(false)}>{locale === "ko" ? "취소" : "Cancel"}</button></div> : null}
    <div className="chat tax-agent-chat" aria-live="polite" ref={chatRef}>
      {profile && conversation.loading ? <LoadingSkeleton lines={5} /> : <>
      <p className="user-message user-message-enter">{messageLocale === "ko" ? "세율 확인을 시작했습니다" : "Tax assessment started"}</p>
      {!result && introStage === "thinking" ? <TypingBubble locale={locale} /> : null}
      {(introStage === "ready" || result) ? <div className="ai-message ai-message-enter"><p>{messageLocale === "ko" ? "한국과 조세조약이 체결된 경우 배당소득 원천징수세율을 낮출 수 있습니다. 거주 국가와 투자자 유형을 선택해 주세요." : "If a tax treaty is in place with Korea, you may be eligible for a reduced withholding tax rate on dividend income. What is your nationality?"}</p></div> : null}
      {!result && introStage === "ready" ? <form className="tax-agent-form" onSubmit={submitEligibility}>
        <label>{locale === "ko" ? "거주 국가" : "Country of residence"}<select value={country} disabled={locked} onChange={(event) => setCountry(event.target.value)}><CountryOptions countries={countries.data || []} /></select></label>
        <label>{locale === "ko" ? "투자자 유형" : "Investor type"}<select value={investor} disabled={locked} onChange={(event) => setInvestor(event.target.value)}><option value="INDIVIDUAL">{locale === "ko" ? "개인" : "Individual"}</option><option value="CORPORATE">{locale === "ko" ? "법인" : "Corporate"}</option></select></label>
        <button type="submit" disabled={locked || !countries.data?.length}>{locale === "ko" ? "내 세율 확인" : "Check my rate"}</button>
      </form> : null}
      {result || assessmentRequest ? <p className="user-message user-message-enter">{result ? result.countryName + ", " + (result.investorType === "INDIVIDUAL" ? messageLocale === "ko" ? "개인" : "Individual" : messageLocale === "ko" ? "법인" : "Corporate") : assessmentRequest}</p> : null}
      {busy === "eligibility" ? <TypingBubble locale={locale} /> : null}
      {result ? <div className="ai-message tax-agent-result"><TaxResult result={result} locale={messageLocale} />
        {!verificationStarted && guideDepth === 0 ? <TaxGuideActions locale={locale} primary={locale === "ko" ? "가이드 보기" : "Yes, show me the guide"} onPrimary={() => void advanceFlow("SHOW_GUIDE")} onVerify={() => void advanceFlow("START_VERIFICATION")} disabled={locked} /> : null}
      </div> : null}
      {busy === "flow" ? <TypingBubble locale={locale} /> : null}
      {guideDepth >= 1 ? <>
        <p className="user-message user-message-enter">{messageLocale === "ko" ? "가이드를 보여주세요" : "Yes, show me the guide"}</p>
        <TaxGuideOverview locale={messageLocale} actions={!verificationStarted && guideDepth === 1 ? <TaxGuideActions locale={locale} primary={locale === "ko" ? "더 자세히 보기" : "Yes, show more detail"} onPrimary={() => void advanceFlow("SHOW_MORE_DETAIL")} onVerify={() => void advanceFlow("START_VERIFICATION")} disabled={locked} /> : null} />
      </> : null}
      {guideDepth >= 2 ? <>
        <p className="user-message user-message-enter">{messageLocale === "ko" ? "더 자세히 보여주세요" : "Yes, show more details"}</p>
        <TaxGuideDetail locale={messageLocale} onVerify={!verificationStarted ? () => void advanceFlow("START_VERIFICATION") : undefined} disabled={locked} />
      </> : null}
      {verificationStarted ? <p className="user-message user-message-enter">{messageLocale === "ko" ? "서류 검증 해보기" : "Verify my documents"}</p> : null}
      {verificationStarted && !profile ? <div className="ai-message"><p className="tax-login-prompt"><Link className="login-button tax-login-button" to="/login?returnTo=%2Ftax" onClick={close}>{locale === "ko" ? "로그인" : "Log in"}</Link><span>{locale === "ko" ? "세무 서류를 안전하게 업로드하고 검증할 수 있습니다." : "to upload and verify tax documents securely."}</span></p></div> : null}
      {verificationStarted && profile ? <>
        {ordered.map((document) => <div className="tax-document-turn" key={document.id}>
          <DocumentPreview document={document} preview={previews[document.id]} locale={locale} />
          <div className="ai-message tax-document-message"><b>{requiredDocuments.find((item) => item.type === document.documentType)?.[messageLocale === "ko" ? "ko" : "en"]}</b>
            {document.status === "PROCESSING" ? <DocumentPreview document={document} preview={previews[document.id]} locale={locale} scanning /> : <>
              <span className={"tax-document-status is-" + document.status.toLowerCase()}>{statusLabel(document.status, messageLocale)}</span>
              {document.issues.length ? <ul>{document.issues.slice(0, 3).map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul> : null}
              {document.status !== "VERIFIED" ? <><p>{messageLocale === "ko" ? "해당 서류를 수정한 뒤 새 파일을 업로드해 주세요. 원본 파일은 서버에서 삭제됩니다." : "Upload a corrected file to continue. The unsuccessful file is removed from the server."}</p>{document.documentType === nextDocument?.type ? <button type="button" className="login-button tax-document-retry" disabled={locked} onClick={again}>{locale === "ko" ? "다시 업로드" : "Upload again"}</button> : null}</> : null}
            </>}
          </div>
        </div>)}
        {pendingPreview ? <div className="tax-document-turn"><PreviewLink preview={pendingPreview} locale={locale} /><div className="ai-message"><DocumentScan preview={pendingPreview} locale={locale} progress={10} /></div></div> : null}
        {nextDocument && !processing ? <div className="ai-message tax-document-prompt"><p>{locale === "ko" ? nextDocument.ko + "를 업로드해 주세요." : "Upload your " + nextDocument.en.toLowerCase() + "."}</p><form onSubmit={upload}>
          <label className="tax-file-picker"><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" disabled={locked} onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file?.name || (locale === "ko" ? "파일 선택" : "Choose file")}</span></label>
          <button type="submit" disabled={!file || locked}>{locale === "ko" ? "안전하게 업로드" : "Upload securely"}</button>
        </form></div> : null}
        {busy === "comparison" ? <TypingBubble locale={locale} /> : null}
        {comparison ? <div className="ai-message tax-comparison-result"><b>{messageLocale === "ko" ? "3개 서류 비교 검증 완료" : "Three-document comparison complete"}</b><p>{comparison.crossCheck.matched ? messageLocale === "ko" ? "거주자증명서와 제한세율 신청서의 성명, 납세자번호, 거주국이 일치합니다." : "Name, taxpayer identifier, and residence country match across the certificate and application." : messageLocale === "ko" ? "서류 간 일치 여부에 대한 추가 확인이 필요합니다." : "Cross-document consistency requires further review."}</p>{comparison.verificationStatus === "VERIFIED" && comparison.crossCheck.matched ? <Link className="login-button tax-review-link" to="/tax/review" onClick={close}>{locale === "ko" ? "검증 완료 문서 보기" : "View verified documents"}</Link> : <p>{statusLabel(comparison.verificationStatus, messageLocale)}</p>}{comparison.findings.length ? <ul>{comparison.findings.map((finding) => <li key={finding.code}>{finding.message}</li>)}</ul> : null}</div> : null}
        {comparisonFailed && !comparison ? <button type="button" className="login-button" disabled={locked} onClick={() => { comparisonAttempt.current = ""; setError(""); setComparisonFailed(false); setComparisonRetry((value) => value + 1); }}>{locale === "ko" ? "비교 검증 다시 요청" : "Retry comparison"}</button> : null}
      </> : null}
      </>}
      {error || conversation.error || documents.error ? <p className="auth-error" role="alert">{error || conversation.error?.message || documents.error?.message}</p> : null}
    </div>
    <p className="tax-agent-disclaimer">{locale === "ko" ? "서류 제출 전 확인을 돕는 기능이며 정부의 진위 확인이나 세무 자문을 대체하지 않습니다." : "Pre-submission checks do not replace government authentication or tax advice."}</p>
  </aside>;
}

function TaxResult({ result, locale }: { result: TaxEligibility; locale: "ko" | "en" }) {
  if (!result.treatyDataAvailable) return <><div className="tax-guide-heading"><img src="/assets/tax-treaty-complete.svg" alt="" /><b>{locale === "ko" ? "조세조약 분석 완료" : "Treaty analysis complete"}</b></div><p>{locale === "ko" ? "확인된 조세조약 세율이 없습니다." : "No verified treaty rate is available."}</p></>;
  return <>
    <div className="tax-guide-heading"><img src="/assets/tax-treaty-complete.svg" alt="" /><b>{locale === "ko" ? "조세조약 분석 완료" : "Treaty analysis complete"}</b></div>
    <p>{locale === "ko" ? <>한미 조세조약에 따라 배당소득에 <b>{result.treatyDividendRate}%</b>의 제한세율을 적용받을 수 있습니다. 이 세율을 신청하는 방법을 안내해 드릴까요?</> : <>Under the Korea - US tax treaty, you are eligible for a reduced tax rate of <b>{result.treatyDividendRate}%</b> on dividend income. Would you like a guide on how to apply for this rate?</>}</p>
  </>;
}

function TaxGuideActions({ locale, primary, onPrimary, onVerify, disabled }: { locale: "ko" | "en"; primary: string; onPrimary: () => void; onVerify: () => void; disabled: boolean }) {
  return <div className="tax-guide-actions">
    <button type="button" className="tax-guide-primary" disabled={disabled} onClick={onPrimary}><img src="/assets/tax-guide-action.svg" alt="" />{primary}</button>
    <button type="button" className="tax-guide-verify" disabled={disabled} onClick={onVerify}>{locale === "ko" ? "검증 해보기" : "Verify documents"}</button>
  </div>;
}

function TaxGuideOverview({ locale, actions }: { locale: "ko" | "en"; actions: ReactNode }) {
  return <div className="ai-message tax-guide-overview ai-message-enter">
    <p>{locale === "ko" ? "배당소득 제한세율 신청에 필요한 서류와 절차를 안내해 드리겠습니다." : "Certainly, I will guide you through the documents and procedures required to apply for the reduced tax rate on dividend income."}</p>
    <hr />
    <div className="tax-guide-columns">
      <section><img src="/assets/tax-guide-documents.svg" alt="" /><b>{locale === "ko" ? "1. 필요 서류" : "1. Required Documents"}</b><span>{locale === "ko" ? "거주자 증명서와 제한세율 적용신청서" : "Certificate of residence and application for reduced tax rate"}</span></section>
      <section><img src="/assets/tax-guide-submission.svg" alt="" /><b>{locale === "ko" ? "2. 제출 절차" : "2. Submission Process"}</b><span>{locale === "ko" ? <>준비한 서류를 <strong>브로커</strong> 또는 <strong>수탁기관</strong>에 제출합니다.</> : <>Submit the prepared documents to your <strong>broker</strong> or <strong>custodian</strong>.</>}</span></section>
    </div>
    <div className="tax-guide-notice"><div><img src="/assets/tax-guide-notice.svg" alt="" /><b>{locale === "ko" ? "중요 안내" : "Important Notice"}</b></div><p>{locale === "ko" ? "서류는 3년간 유효하므로 만료 전에 다시 신청해야 합니다." : "The documents are valid for 3 years, so you must re-apply before they expire."}</p></div>
    <hr />
    <p>{locale === "ko" ? "세무 신청 절차를 더 자세히 알아보시겠어요?" : "Would you like more specific details on the tax filing process?"}</p>
    {actions}
  </div>;
}

function TaxGuideDetail({ locale, onVerify, disabled }: { locale: "ko" | "en"; onVerify?: () => void; disabled: boolean }) {
  const applicationName = "[별지 제29호의12서식] 국내원천소득 제한세율 적용신청서 (비거주자용)(소득세법 시행규칙).pdf";
  return <>
    <div className="ai-message ai-message-enter"><p>{locale === "ko" ? "제한세율 신청을 위한 단계별 상세 가이드와 서류 목록입니다." : "Here is the detailed step-by-step guide and documents checklist for applying for the reduced tax rate."}</p></div>
    <div className="ai-message tax-guide-card ai-message-enter">
      <div className="tax-guide-heading"><img src="/assets/tax-guide-required.svg" alt="" /><b>{locale === "ko" ? "필요 서류" : "Required documents"}</b></div>
      <p>{locale === "ko" ? "발급에 가장 오래 걸리는 거주자 증명서부터 준비하세요." : "Start with the certificate of residence; it is by far the slowest step."}</p>
      <hr />
      <TaxGuideStep number="1" title={locale === "ko" ? "제한세율 적용신청서" : "Application for Reduced Tax Rate"} description={locale === "ko" ? "브로커가 투자자를 대신해 국세청에 제출하는 신청서입니다." : "The Korean National Tax Service form your broker submits on your behalf."} />
      <a className="tax-guide-download" href="/forms/reduced-tax-rate-application-nonresident.pdf" download={applicationName}><img src="/assets/download.svg" alt="" />{locale === "ko" ? "원본 다운로드(PDF)" : "Download Original (PDF)"}</a>
      <hr />
      <TaxGuideStep number="2" title={locale === "ko" ? "거주자 증명서" : "Certificate of Residence"} description={locale === "ko" ? "거주 국가의 세무당국에서 발급받습니다. 미국 거주자는 IRS Form 6166이며 통상 4~6주가 걸립니다." : "Issued by your own tax authority - Form 6166 from the IRS for US residents. Allow four to six weeks."} />
    </div>
    <div className="ai-message tax-guide-card ai-message-enter">
      <div className="tax-guide-heading"><img src="/assets/tax-guide-steps.svg" alt="" /><b>{locale === "ko" ? "단계별 제출 가이드" : "Step-by-step submission guide"}</b></div>
      <p>{locale === "ko" ? "원천징수의무자인 브로커를 통해 다음 세 단계로 진행합니다." : "Three steps, handled through your broker as withholding agent."}</p>
      <hr />
      <TaxGuideStep number="1" title={locale === "ko" ? "신청서 다운로드 및 거주자 증명서 발급" : "Download the form and obtain your certificate"} description={locale === "ko" ? "다른 절차는 거주자 증명서가 준비된 뒤 진행할 수 있습니다." : "Everything else waits on the certificate of residence."} />
      <hr />
      <TaxGuideStep number="2" title={locale === "ko" ? "현지 브로커 또는 한국 제휴 브로커에 제출" : "Submit to your local broker or partner Korean broker"} description={locale === "ko" ? "예: IBKR 또는 삼성증권과 같은 제휴 증권사" : "For example IBKR, or a partner such as Samsung Securities."} />
      <hr />
      <TaxGuideStep number="3" title={locale === "ko" ? "조세조약 세율로 배당 수령" : "Receive dividends at the treaty rate"} description={locale === "ko" ? "접수가 승인되면 다음 지급일부터 적용됩니다." : "Applies from the next payment date once your filing is accepted."} />
    </div>
    <div className="ai-message tax-guide-tip ai-message-enter"><p>{locale === "ko" ? "☝️ 팁: 대부분의 세무당국은 거주자 증명서 온라인 신청을 지원합니다. 현지 정부 웹사이트를 확인하세요." : "☝️ Tip: Most tax authorities allow online applications for residency certificates. Check your local government website."}</p></div>
    {onVerify ? <button type="button" className="tax-guide-final-verify" disabled={disabled} onClick={onVerify}>{locale === "ko" ? "서류 검증 해보기" : "Verify my documents"}</button> : null}
  </>;
}

function TaxGuideStep({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="tax-guide-step"><span>{number}</span><div><b>{title}</b><p>{description}</p></div></div>;
}

function statusLabel(status: string, locale: "ko" | "en") {
  const labels: Record<string, [string, string]> = { VERIFIED: ["검증 완료", "Verified"], REVIEW_REQUIRED: ["서류 확인 필요", "Review required"], REJECTED: ["검증 미통과", "Verification unsuccessful"], FAILED: ["검증 실패", "Verification failed"] };
  return labels[status]?.[locale === "ko" ? 0 : 1] || status;
}
function DocumentPreview({ document, preview, locale, scanning = false }: { document: Document; preview?: Preview; locale: "ko" | "en"; scanning?: boolean }) {
  const [loaded, setLoaded] = useState<Preview | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setLoaded(null); setError(false);
    if (preview || document.contentAvailable === false) return;
    const controller = new AbortController();
    let url: string | undefined;
    void apiBlob("/api/v1/me/tax-documents/" + document.id + "/original", { signal: controller.signal }).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setLoaded({ url, mediaType: blob.type });
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [document.id, document.contentAvailable, preview]);
  const value = preview || (document.contentAvailable === false ? null : loaded);
  if (scanning) return <DocumentScan preview={value} locale={locale} progress={document.progress} />;
  return value ? <PreviewLink preview={value} locale={locale} documentId={document.contentAvailable === false ? undefined : document.id} /> : <div className="user-message tax-file-bubble">{document.contentAvailable === false ? locale === "ko" ? "서류 원본이 삭제되었습니다" : "Document file removed" : error ? locale === "ko" ? "미리보기를 불러오지 못했습니다" : "Preview unavailable" : <LoadingSkeleton lines={3} />}</div>;
}
function PreviewLink({ preview, locale, documentId }: { preview: Preview; locale: "ko" | "en"; documentId?: string }) {
  return <a className="user-message tax-file-bubble" href={documentId ? `/tax-documents/${encodeURIComponent(documentId)}` : preview.url} target="_blank" rel="noopener noreferrer" aria-label={locale === "ko" ? "업로드한 문서를 새 창에서 보기" : "Open uploaded document in a new tab"}>
    {preview.mediaType.startsWith("image/") ? <img src={preview.url} alt={locale === "ko" ? "업로드한 문서" : "Uploaded document"} /> : <><img className="tax-pdf-icon" src="/assets/news.svg" alt="" /><span>PDF · {locale === "ko" ? "문서 보기" : "View document"}</span></>}
  </a>;
}
function DocumentScan({ preview, locale, progress }: { preview?: Preview | null; locale: "ko" | "en"; progress: number }) {
  return <div className="tax-document-scan" role="status">
    <div className="tax-scan-preview">{preview?.mediaType.startsWith("image/") ? <img src={preview.url} alt="" /> : <img src="/assets/news.svg" alt="" />}<i className="tax-scan-line" /></div>
    <p><span className="tax-scan-spinner" />{locale === "ko" ? "서류 내용을 확인하고 있습니다" : "Analyzing your document"} · {progress}%</p>
    <progress max={100} value={progress} />
  </div>;
}
function TypingBubble({ locale }: { locale: "ko" | "en" }) {
  return <div className="agent-thinking" role="status"><span className="sr-only">{locale === "ko" ? "K-Agent가 확인하는 중" : "K-Agent is checking"}</span><i /><i /><i /></div>;
}
