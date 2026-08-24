import { useState } from "react";
import { Header } from "../components/Layout";

export function TaxPage() {
  const [country, setCountry] = useState("United States");
  const [investor, setInvestor] = useState("Individual");
  const [checked, setChecked] = useState(false);
  return (
    <div className="tax-page">
      <Header authenticated white />
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
                setChecked(true);
              }}
            >
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
              <button>Check my rate</button>
            </form>
          </section>
          {checked && (
            <>
              <div className="user-bubble">
                {country}, {investor}
              </div>
              <section className="tax-message result">
                <h2>
                  <img src="/assets/agent-badge.svg" alt="" /> Treaty analysis
                  complete
                </h2>
                <p>
                  Under the Korea–US Tax treaty, you are eligible for a reduced
                  tax rate of <b>15%</b> on dividend income. Would you like a
                  guide on how to apply for this rate?
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
                <ol>
                  <li>
                    <b>Application for Reduced Tax Rate</b>
                    <small>
                      The Korean national tax service form your broker submits
                      on your behalf.
                    </small>
                    <button>
                      <img src="/assets/download.svg" alt="" /> Download
                      Original (PDF)
                    </button>
                  </li>
                  <li>
                    <b>Certificate of Residence</b>
                    <small>
                      Issued by your own tax authority; form 6166 from the IRS
                      for US residents.
                    </small>
                  </li>
                </ol>
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
