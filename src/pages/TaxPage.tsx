import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Layout";
import { openKAgent } from "../agentEvents";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { SupportedCountry, TaxDocument } from "../types";

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
          <img src="/assets/close.svg" alt="" /> Close
        </Link>
        <header className="tax-agent-head">
          <img src="/assets/agent-badge.svg" alt="" />
          <div>
            <h1>K-Agent</h1>
            <p>AI Financial Intelligence</p>
          </div>
          <img className="tax-overflow" src="/assets/overflow.svg" alt="" />
        </header>
        <div className="tax-conversation">
          <div className="user-bubble">Tax assessment started</div>
          <section className="tax-message">
            <p>
              If a tax treaty is in place with Korea, you may be eligible for a
              reduced withholding tax rate on dividend income. What is your
              nationality?
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
                Country of residence
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  {(countries.data || []).map((item) => (
                    <option disabled={item.countryCode !== "US"} value={item.countryCode} key={item.countryCode}>
                      {item.countryName}{item.countryCode === "US" ? "" : " · Coming soon"}
                    </option>
                  ))}
                </select>
                <small>Verified eligibility is currently available for United States residents only.</small>
              </label>
              <label>
                Investor type
                <select
                  value={investor}
                  onChange={(event) => setInvestor(event.target.value)}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </label>
              <button disabled={busy || !countries.data?.length}>{busy ? "Checking…" : "Check my rate"}</button>
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
                  <img src="/assets/agent-badge.svg" alt="" /> Verified treaty data
                </h2>
                <p>
                  {result.treatyDataAvailable && result.treatyDividendRate !== null
                    ? <>The published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with the domestic default of <b>{result.domesticDefaultRate}%</b>.</>
                    : <>A verified treaty dividend rate is unavailable for this profile. The domestic default shown by the API is <b>{result.domesticDefaultRate}%</b>.</>}
                  {" "}Data date: {result.asOf}.
                </p>
                {result.potentialQualifyingCorporateRate !== null ? <p>Potential qualifying corporate rate: <b>{result.potentialQualifyingCorporateRate}%</b>{result.minimumOwnershipPercent !== null ? ` when the minimum ownership threshold of ${result.minimumOwnershipPercent}% is met` : ""}.</p> : null}
                <div>
                  {result.sourceUrl ? <a href={result.sourceUrl} target="_blank" rel="noreferrer">Treaty source</a> : null}
                  {result.domesticSourceUrl ? <a href={result.domesticSourceUrl} target="_blank" rel="noreferrer">Domestic-rate source</a> : null}
                </div>
              </section>
              <section className="tax-message tax-docs">
                <h2><img src="/assets/tax-documents.svg" alt="" /> Required documents</h2>
                {result.requiredDocuments.length ? <ol>{result.requiredDocuments.map((document) => <li key={document}><b>{document}</b></li>)}</ol> : <p>No verified document list is available for this profile.</p>}
              </section>
              <section className="tax-message tax-docs">
                <h2><img src="/assets/status-warning.svg" alt="" /> Eligibility caveats</h2>
                {result.caveats.length ? <ul>{result.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul> : <p>No additional caveats were returned.</p>}
              </section>
            </>
          ) : null}
          {profile ? <TaxDocumentsPanel country={country} documents={documents} /> : <section className="tax-message"><p><Link to="/login?returnTo=%2Ftax">Log in</Link> to upload and verify tax documents securely.</p></section>}
        </div>
        <button type="button" className="tax-input" onClick={() => openKAgent({ contextType: "TAX_GUIDE", referenceId: country, prompt: "Explain the verified tax treaty result and caveats for my selected residency." })}>
          Ask K-Agent about this verified result
          <img src="/assets/agent-send.svg" alt="" />
        </button>
        <p className="tax-disclaimer">
          KART is an AI tool and can make mistakes. Please double-check the
          cited sources.
        </p>
      </main>
    </div>
  );
}

function TaxDocumentsPanel({ country, documents }: { country: string; documents: ReturnType<typeof useRemote<TaxDocument[]>> }) {
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
  return <section className="tax-message tax-upload"><h2><img src="/assets/tax-documents.svg" alt="" /> Secure document verification</h2><form onSubmit={(event) => void upload(event)}><select value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Document type"><option value="RESIDENCY_CERTIFICATE">Residency certificate</option><option value="APOSTILLE">Apostille</option><option value="REDUCED_TAX_APPLICATION">Reduced tax application</option></select><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} aria-label="Tax document" /><button disabled={!file || busy}>{busy ? "Uploading…" : "Upload securely"}</button></form>{error ? <p className="auth-error">{error}</p> : null}<RemoteState {...documents} empty={(value) => !value.length}>{(items) => <div className="tax-document-list">{items.map((document) => <article key={document.id}><div><b>{document.originalFileName}</b><small>{document.documentType.replaceAll("_", " ")} · {formatDate(document.updatedAt)}</small></div><span className={`tax-document-status is-${document.status.toLowerCase()}`}>{document.status.replaceAll("_", " ")}{document.status === "PROCESSING" ? ` · ${document.progress}%` : ""}</span><div>{document.status === "FAILED" ? <button type="button" onClick={() => void retry(document.id)}>Retry</button> : null}<button type="button" onClick={() => void remove(document.id)}>Delete</button></div></article>)}</div>}</RemoteState></section>;
}
