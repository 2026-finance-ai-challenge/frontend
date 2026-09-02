import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../components/Layout";
import { api, login, signup } from "../api";
import { ApiError } from "../api";
import { useRemote } from "../hooks/useRemote";
import type { InvestorType, SupportedCountry } from "../types";
import { useLocale } from "../state/LocaleContext";
import { CountryOptions } from "../components/CountryOptions";

import { isValidPassword, PASSWORD_HELP } from "../utils/password";

function FormError({ children }: { children: string }) {
  return (
    <small className="auth-error">
      <img src="/assets/form-error.svg" alt="" />
      {children}
    </small>
  );
}

export function SignupPage() {
  const { locale } = useLocale();
  const countries = useRemote((signal) => api<SupportedCountry[]>("/api/v1/tax/countries", { signal }), []);
  const [step, setStep] = useState(1);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nationality, setNationality] = useState("");
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [submitted, setSubmitted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordIsValid = isValidPassword(password);
  const loginIdIsValid = /^[A-Za-z0-9][A-Za-z0-9._-]{3,29}$/.test(loginId);
  const loginIdError = submitted && (!loginIdIsValid || availability !== "available");
  const passwordError =
    (submitted || passwordTouched) && !passwordIsValid;
  const confirmError =
    (submitted || confirmTouched) && (!confirm || password !== confirm);
  const nationalityError = submitted && !nationality;
  const [requestError, setRequestError] = useState("");
  const checkLoginId = async () => {
    if (!loginIdIsValid) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    try {
      const result = await api<{ available: boolean }>(
        `/api/v1/auth/login-id-availability?loginId=${encodeURIComponent(loginId)}`,
        {},
        false,
      );
      setAvailability(result.available ? "available" : "unavailable");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not check this ID.");
      setAvailability("idle");
    }
  };
  const next = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setRequestError("");
    let currentAvailability = availability;
    if (loginIdIsValid && availability === "idle") {
      setAvailability("checking");
      try {
        const result = await api<{ available: boolean }>(
          `/api/v1/auth/login-id-availability?loginId=${encodeURIComponent(loginId)}`,
          {},
          false,
        );
        currentAvailability = result.available ? "available" : "unavailable";
        setAvailability(currentAvailability);
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Could not check this ID.");
        return;
      }
    }
    if (
      loginIdIsValid &&
      currentAvailability === "available" &&
      passwordIsValid &&
      password === confirm &&
      nationality
    )
      setStep(2);
  };
  return (
    <div className="auth-page">
      <Header white />
      <main>
        {step === 1 ? (
          <form className="auth-card signup-card" onSubmit={next}>
            <h1>{locale === "ko" ? "KART에 오신 것을 환영합니다" : "Welcome to Kart"}</h1>
            <label>
              ID
              <div className="email-check">
                <input
                  className={availability === "available" ? "valid" : loginIdError ? "invalid" : ""}
                  value={loginId}
                  onChange={(event) => {
                    setLoginId(event.target.value);
                    setAvailability("idle");
                  }}
                  onBlur={() => void checkLoginId()}
                  autoComplete="username"
                  placeholder={locale === "ko" ? "아이디 입력" : "Enter your ID"}
                />
                <button
                  type="button"
                  disabled={availability === "checking"}
                  onClick={() => void checkLoginId()}
                >
                  {availability === "checking" ? (locale === "ko" ? "확인 중" : "Checking") : (locale === "ko" ? "중복 확인" : "Check")}
                </button>
              </div>
              {availability === "available" && <small className="safe">{locale === "ko" ? "사용할 수 있는 아이디입니다" : "Available account"}</small>}
              {availability === "unavailable" && <FormError>{locale === "ko" ? "이미 사용 중인 아이디입니다" : "This ID is already in use"}</FormError>}
              {loginIdError && availability !== "unavailable" && <FormError>{locale === "ko" ? "영문, 숫자, 점, 밑줄 또는 하이픈 4~30자로 입력하세요" : "Use 4–30 letters, numbers, dots, underscores, or hyphens"}</FormError>}
            </label>
            <label>
              {locale === "ko" ? "비밀번호" : "Password"}
              <input
                className={passwordError ? "invalid" : ""}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={passwordError}
                placeholder={locale === "ko" ? "비밀번호 생성" : "Create a password"}
              />
              {passwordError && (
                <FormError>
                  {PASSWORD_HELP[locale]}
                </FormError>
              )}
            </label>
            <label>
              {locale === "ko" ? "비밀번호 확인" : "Password Confirm"}
              <input
                className={confirmError ? "invalid" : ""}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onBlur={() => setConfirmTouched(true)}
                aria-invalid={confirmError}
                placeholder={locale === "ko" ? "비밀번호 다시 입력" : "Enter password again"}
              />
              {confirmError && <FormError>{locale === "ko" ? "비밀번호가 일치하지 않습니다" : "Password does not match"}</FormError>}
            </label>
            <label>
              {locale === "ko" ? "국적" : "Nationality"}
              <select
                className={nationalityError ? "invalid" : ""}
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
              >
                <option value="" disabled hidden>{locale === "ko" ? "국적 선택" : "Select your nationality"}</option>
                <CountryOptions countries={countries.data ?? []} />
              </select>
              {countries.loading ? <small>{locale === "ko" ? "지원 국가 불러오는 중…" : "Loading supported countries…"}</small> : null}
              {countries.error ? <FormError>{countries.error.message}</FormError> : null}
              {nationalityError && (
                <FormError>{locale === "ko" ? "국적을 선택하세요" : "Select your nationality"}</FormError>
              )}
            </label>
            {requestError ? <FormError>{requestError}</FormError> : null}
            <button className="auth-primary">{locale === "ko" ? "다음 단계" : "Continue to next step"}</button>
            <Link to="/login">{locale === "ko" ? "로그인" : "Log in"}</Link>
          </form>
        ) : (
          <ConsentStep
            loginId={loginId}
            password={password}
            confirm={confirm}
            nationality={nationality}
          />
        )}
      </main>
    </div>
  );
}

function ConsentStep({ loginId, password, confirm, nationality }: {
  loginId: string;
  password: string;
  confirm: string;
  nationality: string;
}) {
  const { locale } = useLocale();
  const [profile, setProfile] = useState<InvestorType>("INDIVIDUAL");
  const [consents, setConsents] = useState([true, false, false]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const createAccount = async () => {
    if (!consents.every(Boolean)) {
      setError(locale === "ko" ? "필수 동의 항목을 모두 선택하세요." : "All required consents must be accepted.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signup({
        loginId,
        password,
        passwordConfirm: confirm,
        nationality,
        investorType: profile,
        termsAccepted: consents[0],
        privacyAccepted: consents[1],
      });
      navigate("/login", { state: { created: true } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-card consent-card">
      <h2>{locale === "ko" ? "투자자 유형" : "Investor Profile"}</h2>
      <div className="profile-options">
        <button
          className={profile === "INDIVIDUAL" ? "active" : ""}
          onClick={() => setProfile("INDIVIDUAL")}
        >
          <b>{locale === "ko" ? "개인" : "Individual"}</b>
          <span>{locale === "ko" ? "일반 개인 투자자를 위한 시장 인사이트" : "Standard retail market insight."}</span>
        </button>
        <button
          className={profile === "CORPORATE" ? "active" : ""}
          onClick={() => setProfile("CORPORATE")}
        >
          <b>{locale === "ko" ? "기관·법인" : "Institutional"}</b>
          <span>{locale === "ko" ? "기업 공시와 대량 데이터 중심" : <>Focus on corporate filings &amp; bulk data.</>}</span>
        </button>
      </div>
      <h2>{locale === "ko" ? "필수 동의" : "Required Consents"}</h2>
      {[0, 1, 2].map((index) => (
        <label className="consent" key={index}>
          <input
            type="checkbox"
            checked={consents[index]}
            onChange={() =>
              setConsents((values) =>
                values.map((value, current) =>
                  current === index ? !value : value,
                ),
              )
            }
          />
          {index === 0 ? (
            <span>
              {locale === "ko" ? "" : "I agree the "}
              <Link
                className="consent-policy-link"
                to="/legal/terms"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {locale === "ko" ? "서비스 이용약관" : "Terms of Service."}
              </Link>{" "}
              {locale === "ko" ? "에 동의합니다. " : " "}<em>{locale === "ko" ? "(필수)" : "(Req.)"}</em>
            </span>
          ) : index === 1 ? (
            <span>
              {locale === "ko" ? "" : "I have read and consent to the "}
              <Link
                className="consent-policy-link"
                to="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {locale === "ko" ? "개인정보 처리방침" : "Privacy Policy."}
              </Link>{" "}
              {locale === "ko" ? "을 읽고 동의합니다. " : " "}<em>{locale === "ko" ? "(필수)" : "(Req.)"}</em>
            </span>
          ) : (
            <span>
              {locale === "ko" ? "" : "I acknowledge the "}
              <Link
                className="consent-policy-link"
                to="/legal/fsc-disclaimer"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {locale === "ko" ? "금융위원회 정보 면책 고지" : "FSC Information Disclaimer"}
              </Link>
              <br />
              {locale === "ko" ? "의 AI 생성 인사이트 관련 내용을 확인했습니다. " : "regarding AI-generated insights. "}<em>{locale === "ko" ? "(필수)" : "(Req.)"}</em>
            </span>
          )}
        </label>
      ))}
      {error ? <FormError>{error}</FormError> : null}
      <button className="auth-primary" disabled={busy} onClick={() => void createAccount()}>
        {busy ? (locale === "ko" ? "계정 생성 중…" : "Creating…") : (locale === "ko" ? "계정 만들기" : "Create Account")}
        <img src="/assets/chevron-right-white.svg" alt="" />
      </button>
    </section>
  );
}

export function LoginPage() {
  const { locale } = useLocale();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(loginId, password);
      const returnTo = params.get("returnTo");
      navigate(returnTo?.startsWith("/") ? returnTo : "/my", { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Please check your ID and password again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <Header white />
      <main>
        <form className="auth-card login-card" onSubmit={submit}>
          <h1>{locale === "ko" ? "다시 오신 것을 환영합니다" : "Welcome Back"}</h1>
          <label>
            ID
            <input
              className={error ? "invalid" : ""}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              placeholder={locale === "ko" ? "아이디 입력" : "Enter your ID"}
            />
          </label>
          <label>
            {locale === "ko" ? "비밀번호" : "Password"}
            <input
              className={error ? "invalid" : ""}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={locale === "ko" ? "비밀번호" : "Password"}
            />
          </label>
          {error ? (
            <p className="auth-error">
              <img src="/assets/form-error.svg" alt="" />
              {error}
            </p>
          ) : null}
          <button className="auth-primary" disabled={busy}>{busy ? (locale === "ko" ? "로그인 중…" : "Signing in…") : (locale === "ko" ? "로그인" : "Log in")}</button>
          <p className="signup-prompt">
            {locale === "ko" ? "KART가 처음이신가요? " : "New to KART? "}<Link to="/signup">{locale === "ko" ? "회원가입" : "Sign up"}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
