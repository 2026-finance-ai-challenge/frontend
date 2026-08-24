import { type FormEvent, useEffect, useRef, useState } from "react";

type TaxEligibilityPanelProps = {
  close: () => void;
};

export function TaxEligibilityPanel({ close }: TaxEligibilityPanelProps) {
  const [country, setCountry] = useState("United States");
  const [investor, setInvestor] = useState("Individual");
  const [checked, setChecked] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setChecked(true);
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
              <option>United States</option>
              <option>Japan</option>
              <option>United Kingdom</option>
              <option>Singapore</option>
              <option>China</option>
            </select>
          </label>
          <label>
            Investor type
            <select
              value={investor}
              onChange={(event) => setInvestor(event.target.value)}
            >
              <option>Individual</option>
              <option>Corporate</option>
            </select>
          </label>
          <button type="submit">Check my rate</button>
        </form>
        {checked && (
          <div className="ai-message tax-agent-result" aria-live="polite">
            <p>
              Based on the selected profile ({country}, {investor}), the
              indicative treaty rate starts at <b>15%</b>. Confirm eligibility
              and required documents with your broker.
            </p>
          </div>
        )}
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
