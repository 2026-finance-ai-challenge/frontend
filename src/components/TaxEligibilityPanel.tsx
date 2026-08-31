import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useRemote } from "../hooks/useRemote";
import type { SupportedCountry } from "../types";
import { useLocale } from "../state/LocaleContext";

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
  const { locale } = useLocale();
  const countries = useRemote((signal) => api<SupportedCountry[]>("/api/v1/tax/countries", { signal }), []);
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
  useEffect(() => {
    const supported = countries.data || [];
    if (supported.some((item) => item.countryCode === "US") && country !== "US") setCountry("US");
  }, [countries.data, country]);

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
      aria-label={locale === "ko" ? "세율 확인 K-Agent" : "Tax eligibility K-Agent"}
    >
      <button className="agent-close" onClick={close} ref={closeButtonRef}>
        <img src="/assets/close.svg" alt="" /> {locale === "ko" ? "닫기" : "Close"}
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>{locale === "ko" ? "AI 금융 인텔리전스" : "AI Financial Intelligence"}</p>
        </div>
        <img className="agent-overflow" src="/assets/overflow.svg" alt="" />
      </header>
      <div className="context-chip">
        <img src="/assets/tax.svg" alt="" /> {locale === "ko" ? "배당 원천징수세" : "Dividend withholding tax"}
      </div>
      <div className="chat tax-agent-chat">
        <p className="user-message">{locale === "ko" ? "세율 확인을 시작했습니다" : "Tax assessment started"}</p>
        <div className="ai-message">
          <p>
            {locale === "ko" ? "한국과 조세조약이 체결된 국가의 거주자는 배당 원천징수세율 감면 대상일 수 있습니다. 거주 국가와 투자자 유형을 선택해 주세요." : "If Korea has a tax treaty with your country, you may qualify for a reduced dividend withholding tax rate. Tell me about your tax residence and investor type."}
          </p>
        </div>
        <form className="tax-agent-form" onSubmit={submit}>
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
          <button type="submit" disabled={busy || !countries.data?.length}>{busy ? (locale === "ko" ? "확인 중…" : "Checking…") : (locale === "ko" ? "내 세율 확인" : "Check my rate")}</button>
        </form>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {result ? (
          <div className="ai-message tax-agent-result" aria-live="polite">
            <p>
              {result.treatyDataAvailable ? locale === "ko" ? <>{result.countryName} ({result.investorType})의 공개된 일반 조세조약 배당세율은 <b>{result.treatyDividendRate}%</b>이며 한국 국내 기본세율은 <b>{result.domesticDefaultRate}%</b>입니다.</> : <>For {result.countryName} ({result.investorType}), the published general treaty dividend rate is <b>{result.treatyDividendRate}%</b>, compared with Korea’s <b>{result.domesticDefaultRate}%</b> domestic default.</> : locale === "ko" ? <>선택한 조건에 검증된 조세조약 세율이 없습니다.</> : <>No verified treaty rate is available for this selection.</>}
              {" "}{locale === "ko" ? `적용 요건과 필요 서류는 증권사에 확인하세요. 데이터 기준일 ${result.asOf}.` : `Confirm eligibility and required documents with your broker. Data as of ${result.asOf}.`}
            </p>
          </div>
        ) : null}
      </div>
      <Link className="chat-input" to="/tax" onClick={close}>
        {locale === "ko" ? "전체 세율 안내 열기" : "Open full tax guide"}
        <img src="/assets/chevron-right-gold.svg" alt="" />
      </Link>
    </aside>
  );
}
