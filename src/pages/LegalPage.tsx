import { Link } from "react-router-dom";
import { Header } from "../components/Layout";

type LegalDocument = "terms" | "privacy" | "fsc";

type LegalPageProps = {
  document: LegalDocument;
};

const documents = {
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    summary:
      "These terms govern access to KART's Korean market information, filings, watchlists, and AI-assisted insights.",
    sections: [
      [
        "1. Acceptance and eligibility",
        "By creating an account or using KART, you agree to these Terms. You must have legal capacity to enter into this agreement and may use the Service only in compliance with applicable laws and market rules.",
      ],
      [
        "2. Account responsibilities",
        "You are responsible for accurate registration information, safeguarding your credentials, and all activity performed through your account. Notify the Service operator promptly if you suspect unauthorized access.",
      ],
      [
        "3. Service scope",
        "KART provides market data views, translated filings, news summaries, watchlists, tax-related guidance, and AI-generated explanations. Features, coverage, and availability may change as data providers and product capabilities evolve.",
      ],
      [
        "4. Financial information and AI output",
        "KART content is general information, not investment, legal, accounting, or tax advice. AI output may be incomplete or incorrect. Verify material information with official disclosures, licensed professionals, and your financial institution before acting.",
      ],
      [
        "5. Acceptable use",
        "You may not misuse the Service, interfere with its operation, attempt unauthorized access, scrape or redistribute protected data at scale, reverse engineer restricted components, or use the Service for unlawful market activity.",
      ],
      [
        "6. Intellectual property and third-party data",
        "KART's interface, software, and original content are protected by applicable intellectual-property laws. Exchange data, filings, news, and linked materials may remain subject to the rights and terms of their respective providers.",
      ],
      [
        "7. Availability and limitation of liability",
        "The Service is provided on an 'as available' basis. To the extent permitted by law, KART is not responsible for losses arising from market movements, reliance on delayed or inaccurate information, third-party outages, or unauthorized account use not caused by KART.",
      ],
      [
        "8. Suspension, termination, and changes",
        "KART may restrict access where reasonably necessary for security, legal compliance, misuse prevention, or maintenance. Material changes to these Terms will be announced in advance when required, and continued use after the effective date constitutes acceptance.",
      ],
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    summary:
      "This policy explains what personal information KART processes, why it is used, how long it is retained, and the choices available to you.",
    sections: [
      [
        "1. Information we process",
        "Account data may include email address, nationality, investor profile, consent records, and authentication information. Service data may include watchlists, searches, chat prompts, feature interactions, device information, IP address, and security logs.",
      ],
      [
        "2. Purposes of processing",
        "We use information to create and secure accounts, personalize market views, provide requested AI features, preserve user settings, prevent abuse, troubleshoot the Service, measure performance, and comply with legal obligations.",
      ],
      [
        "3. Retention",
        "Account information is retained while the account is active and then deleted or anonymized after the applicable legal and operational retention period. Security and access logs may be kept for up to 12 months unless a longer period is required for an incident, dispute, or law.",
      ],
      [
        "4. Sharing and service providers",
        "Information may be processed by infrastructure, authentication, analytics, customer-support, and AI service providers acting under contract. KART does not sell personal information. Any legally required disclosure is limited to the information reasonably necessary.",
      ],
      [
        "5. International processing",
        "Some technology providers may process information outside your country. Where required, KART will provide notice and use an appropriate transfer mechanism, contractual safeguards, and security controls.",
      ],
      [
        "6. Security",
        "KART applies access controls, encryption in transit, logging, least-privilege practices, and incident-response procedures appropriate to the nature of the information. No system can guarantee absolute security.",
      ],
      [
        "7. Your rights",
        "Subject to applicable law, you may request access, correction, deletion, suspension of processing, withdrawal of consent, or information about transfers. Requests can be submitted through the support channel identified by the production service operator.",
      ],
      [
        "8. Cookies, minors, and updates",
        "KART may use essential storage and limited analytics technologies for authentication, preferences, and reliability. The Service is not directed to children. Material policy changes will be announced with a revised effective date.",
      ],
    ],
  },
  fsc: {
    eyebrow: "Important information",
    title: "FSC Information Disclaimer",
    summary:
      "Important limitations for KART's AI-generated financial information and references to Korea's Financial Services Commission (FSC).",
    sections: [
      [
        "1. No government affiliation",
        "KART is not the Financial Services Commission of the Republic of Korea and is not affiliated with, sponsored by, or endorsed by the FSC. References to the FSC identify a public authority or an information source only.",
      ],
      [
        "2. Information only — no recommendation",
        "AI summaries, sentiment labels, priority levels, forecasts, comparisons, and chatbot responses are provided for general information. They are not an offer, solicitation, personalized recommendation, suitability assessment, or guarantee of investment performance.",
      ],
      [
        "3. Accuracy and timeliness",
        "AI systems can misunderstand context, mistranslate documents, omit material facts, or produce incorrect statements. Market prices, ownership limits, filings, and news can be delayed or revised. Always compare KART output with the original source and current official records.",
      ],
      [
        "4. Investment risk",
        "Investing involves risk, including loss of principal, liquidity constraints, volatility, currency movements, tax consequences, and regulatory changes. Historical data and model-generated scenarios do not predict future results.",
      ],
      [
        "5. User responsibility",
        "You remain responsible for evaluating information, obtaining professional advice where appropriate, and making your own decisions. Do not place orders or make compliance decisions solely from an AI response.",
      ],
      [
        "6. Official sources and corrections",
        "For authoritative regulatory information, consult the FSC, Financial Supervisory Service, Korea Exchange, DART, and the relevant issuer. Suspected errors should be reported through KART's support channel so the output can be reviewed.",
      ],
    ],
  },
} satisfies Record<
  LegalDocument,
  {
    eyebrow: string;
    title: string;
    summary: string;
    sections: string[][];
  }
>;

export function LegalPage({ document }: LegalPageProps) {
  const content = documents[document];

  return (
    <div className="legal-page">
      <Header authenticated white />
      <main className="page-shell legal-shell">
        <Link className="legal-back" to="/signup">
          ← Back to sign up
        </Link>
        <header className="legal-heading">
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.summary}</p>
          <small>Effective date: August 25, 2026</small>
        </header>
        <aside className="legal-draft-notice">
          <b>Production notice</b>
          This product draft must be completed with the service operator's legal
          name, address, contact channel, processor list, and jurisdiction before
          public launch, and should be reviewed by qualified counsel.
        </aside>
        <article className="legal-document">
          {content.sections.map(([title, body]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
          {document === "privacy" ? (
            <p className="legal-reference">
              Reference: {" "}
              <a
                href="https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000.Updated&nttId=12018"
                target="_blank"
                rel="noreferrer"
              >
                Personal Information Protection Commission privacy-policy guide
              </a>
            </p>
          ) : null}
          {document === "fsc" ? (
            <p className="legal-reference">
              Official regulatory information: {" "}
              <a href="https://www.fsc.go.kr/" target="_blank" rel="noreferrer">
                Financial Services Commission
              </a>
            </p>
          ) : null}
        </article>
      </main>
    </div>
  );
}
