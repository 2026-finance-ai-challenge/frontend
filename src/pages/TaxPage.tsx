import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Layout";
import { api, queryString } from "../api";
import { RemoteState, formatDate } from "../components/RemoteState";
import { useProfile, useRemote } from "../hooks/useRemote";
import type { SupportedCountry, TaxDocument } from "../types";

type Eligibility = {
  countryName: string;
  investorType: string;
  treatyDataAvailable: boolean;
  domesticDefaultRate: number;
  treatyDividendRate: number | null;
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
  return (
    <div className="tax-page">
      <Header white />
      <main className="tax-chat page-shell">
        <button className="back-link">
          <img src="/assets/close.svg" alt="" /> Close
        </button>
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
                  {(countries.data || [{ countryCode: "US", countryName: "United States" }]).map((item) => <option value={item.countryCode} key={item.countryCode}>{item.countryName}</option>)}
                </select>
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
              <button disabled={busy}>{busy ? "Checking…" : "Check my rate"}</button>
            </form>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
          </section>
          {result && (
            <>
              <div className="user-bubble">
                {result.countryName}, {result.investorType}
              </div>
              <section className="tax-message result">
                <h2>
                  <img src="/assets/agent-badge.svg" alt="" /> Treaty analysis
                  complete
                </h2>
                <p>
                  {result.treatyDataAvailable ? <>The published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with the domestic default of <b>{result.domesticDefaultRate}%</b>.</> : <>A verified treaty rate is unavailable for this profile.</>}
                  {" "}This is general information as of {result.asOf}, not a binding eligibility decision. Would you like a guide on required documents?
                </p>
                <div>
                  <button>Yes, show me the guide</button>
                  <button>No, I’m fine</button>
                </div>
              </section>
              <div className="user-bubble">Yes, Please</div>
              <section className="tax-message">
                <p>
                  Certainly. I will guide you through the documents and
                  procedures required to apply for the reduced tax rate on
                  dividend income.
                </p>
                <div className="tax-guide-preview">
                  <div>
                    <h3>
                      <img src="/assets/tax-documents.svg" alt="" /> 1. Required
                      Documents
                    </h3>
                    <p>Resident certificate application for reduced tax rate</p>
                  </div>
                  <div>
                    <h3>
                      <img src="/assets/tax-submit.svg" alt="" /> 2. Submission
                      Process
                    </h3>
                    <p>
                      Please, submit the prepared documents to your broker or
                      custodian.
                    </p>
                  </div>
                </div>
                <div className="tax-warning">
                  <b>
                    <img src="/assets/status-warning.svg" alt="" /> Important
                    Notice
                  </b>
                  <p>
                    The documents are valid for 3 years, so you must re-apply
                    before they expire.
                  </p>
                </div>
                <p>
                  Would you like more specific details on the tax filing
                  process?
                </p>
                <div>
                  <button>Yes, show more details</button>
                  <button>No, I’m fine</button>
                </div>
              </section>
              <div className="user-bubble">Yes, show more details</div>
              <section className="tax-message">
                <p>
                  Here is the detailed step-by-step guide and documents
                  checklist for applying for the reduced tax rate.
                </p>
              </section>
              <section className="tax-message tax-docs">
                <h2>
                  <img src="/assets/tax-documents.svg" alt="" /> Required
                  documents
                </h2>
                <p>
                  Start with the certificate of residence; it is by far the
                  slowest step.
                </p>
                <ol>{result.requiredDocuments.map((document) => <li key={document}><b>{document}</b><small>Submit a current, legible document through your broker or the secure upload below.</small></li>)}</ol>
              </section>
              <section className="tax-message tax-docs">
                <h2>
                  <img src="/assets/tax-submit.svg" alt="" /> Step-by-step
                  submission guide
                </h2>
                <p>
                  Three steps, handled through your broker as withholding agent.
                </p>
                <ol>
                  <li>
                    <b>Download the form and obtain your certificate</b>
                    <small>
                      Everything else waits on the certificate of residence.
                    </small>
                  </li>
                  <li>
                    <b>Submit to your local broker or partner Korean broker</b>
                    <small>
                      For example IBKR, or a partner such as Samsung Securities.
                    </small>
                  </li>
                  <li>
                    <b>Receive dividends at the treaty rate</b>
                    <small>
                      Applies from the next payment date once your filing is
                      accepted.
                    </small>
                  </li>
                </ol>
              </section>
              <section className="tax-tip">
                Tip: Most tax authorities allow online applications for
                residency certificates. Check your local government website.
              </section>
            </>
          )}
          {profile ? <TaxDocumentsPanel country={country} documents={documents} /> : <section className="tax-message"><p><Link to="/login?returnTo=%2Ftax">Log in</Link> to upload and verify tax documents securely.</p></section>}
        </div>
        <div className="tax-input">
          Ask anything about this market{" "}
          <button>
            <img src="/assets/agent-send.svg" alt="Send" />
          </button>
        </div>
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
