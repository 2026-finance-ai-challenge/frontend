import { type FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";

type TaxEligibility = {
  countryName: string;
  investorType: string;
  treatyDataAvailable: boolean;
  domesticDefaultRate: number;
  treatyDividendRate: number | null;
  caveats: string[];
  asOf: string;
};

type TaxEligibilityPanelProps = {
  close: () => void;
};

export function TaxEligibilityPanel({ close }: TaxEligibilityPanelProps) {
  const [country, setCountry] = useState("US");
  const [investor, setInvestor] = useState("INDIVIDUAL");
  const [result, setResult] = useState<TaxEligibility | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(await api<TaxEligibility>("/api/v1/tax/eligibility", {
        method: "POST",
        body: JSON.stringify({ residencyCountry: country, investorType: investor }),
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tax eligibility could not be checked.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      className="agent-panel tax-eligibility-panel"
      id="tax-eligibility-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Tax eligibility K-Agent"
    >
      <button className="agent-close" onClick={close} ref={closeButtonRef}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>AI Financial Intelligence</p>
        </div>
        <img className="agent-overflow" src="/assets/overflow.svg" alt="" />
      </header>
      <div className="context-chip">
        <img src="/assets/tax.svg" alt="" /> Dividend withholding tax
      </div>
      <div className="chat tax-agent-chat">
        <p className="user-message">Tax assessment started</p>
        <div className="ai-message">
          <p>
            If Korea has a tax treaty with your country, you may qualify for a
            reduced dividend withholding tax rate. Tell me about your tax
            residence and investor type.
          </p>
        </div>
        <form className="tax-agent-form" onSubmit={submit}>
          <label>
            Country of residence
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="US">United States</option>
              <option value="JP">Japan</option>
              <option value="GB">United Kingdom</option>
              <option value="SG">Singapore</option>
              <option value="CN">China</option>
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
          <button type="submit" disabled={busy}>{busy ? "Checking…" : "Check my rate"}</button>
        </form>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {result ? (
          <div className="ai-message tax-agent-result" aria-live="polite">
            <p>
              {result.treatyDataAvailable ? <>For {result.countryName} ({result.investorType}), the published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with Korea’s <b>{result.domesticDefaultRate}%</b> domestic default.</> : <>No verified treaty rate is available for this selection.</>}
              {" "}Confirm eligibility and required documents with your broker. Data as of {result.asOf}.
            </p>
          </div>
        ) : null}
      </div>
      <div className="chat-input">
        Ask anything about this market
        <button type="button" aria-label="Send message">
          <img src="/assets/agent-send.svg" alt="" />
        </button>
      </div>
    </aside>
  );
}
