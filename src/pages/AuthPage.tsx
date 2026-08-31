import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "../components/Layout";
import { api, login, signup } from "../api";
import { ApiError } from "../api";
import { useRemote } from "../hooks/useRemote";
import type { InvestorType, SupportedCountry } from "../types";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,}$/;

function FormError({ children }: { children: string }) {
  return (
    <small className="auth-error">
      <img src="/assets/form-error.svg" alt="" />
      {children}
    </small>
  );
}

export function SignupPage() {
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
  const passwordIsValid = PASSWORD_PATTERN.test(password);
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
            <h1>Welcome to Kart</h1>
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
                  placeholder="Enter your ID"
                />
                <button
                  type="button"
                  disabled={availability === "checking"}
                  onClick={() => void checkLoginId()}
                >
                  {availability === "checking" ? "Checking" : "Check"}
                </button>
              </div>
              {availability === "available" && <small className="safe">Available account</small>}
              {availability === "unavailable" && <FormError>This ID is already in use</FormError>}
              {loginIdError && availability !== "unavailable" && <FormError>Use 4–30 letters, numbers, dots, underscores, or hyphens</FormError>}
            </label>
            <label>
              Password
              <input
                className={passwordError ? "invalid" : ""}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={passwordError}
                placeholder="Create a password"
              />
              {passwordError && (
                <FormError>
                  Min 12 characters with upper/lowercase, number, and symbol
                </FormError>
              )}
            </label>
            <label>
              Password Confirm
              <input
                className={confirmError ? "invalid" : ""}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onBlur={() => setConfirmTouched(true)}
                aria-invalid={confirmError}
                placeholder="Enter password again"
              />
              {confirmError && <FormError>Password does not match</FormError>}
            </label>
            <label>
              Nationality
              <select
                className={nationalityError ? "invalid" : ""}
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
              >
                <option value="">Select your nationality</option>
                {(countries.data || []).map((country) => <option value={country.countryCode} key={country.countryCode}>{country.countryName}</option>)}
              </select>
              {countries.loading ? <small>Loading supported countries…</small> : null}
              {countries.error ? <FormError>{countries.error.message}</FormError> : null}
              {nationalityError && (
                <FormError>Select your nationality</FormError>
              )}
            </label>
            {requestError ? <FormError>{requestError}</FormError> : null}
            <button className="auth-primary">Continue to next step</button>
            <Link to="/login">Log in</Link>
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
  const [profile, setProfile] = useState<InvestorType>("INDIVIDUAL");
  const [consents, setConsents] = useState([true, false, false]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const createAccount = async () => {
    if (!consents.every(Boolean)) {
      setError("All required consents must be accepted.");
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
      <h2>Investor Profile</h2>
      <div className="profile-options">
        <button
          className={profile === "INDIVIDUAL" ? "active" : ""}
          onClick={() => setProfile("INDIVIDUAL")}
        >
          <b>Individual</b>
          <span>Standard retail market insight.</span>
        </button>
        <button
          className={profile === "CORPORATE" ? "active" : ""}
          onClick={() => setProfile("CORPORATE")}
        >
          <b>Institutional</b>
          <span>Focus on corporate filings &amp; bulk data.</span>
        </button>
      </div>
      <h2>Required Consents</h2>
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
              I agree the {" "}
              <Link
                className="consent-policy-link"
                to="/legal/terms"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Terms of Service.
              </Link>{" "}
              <em>(Req.)</em>
            </span>
          ) : index === 1 ? (
            <span>
              I have read and consent to the {" "}
              <Link
                className="consent-policy-link"
                to="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Privacy Policy.
              </Link>{" "}
              <em>(Req.)</em>
            </span>
          ) : (
            <span>
              I acknowledge the {" "}
              <Link
                className="consent-policy-link"
                to="/legal/fsc-disclaimer"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                FSC Information Disclaimer
              </Link>
              <br />
              regarding AI-generated insights. <em>(Req.)</em>
            </span>
          )}
        </label>
      ))}
      {error ? <FormError>{error}</FormError> : null}
      <button className="auth-primary" disabled={busy} onClick={() => void createAccount()}>
        {busy ? "Creating…" : "Create Account"}
        <img src="/assets/chevron-right-white.svg" alt="" />
      </button>
    </section>
  );
}

export function LoginPage() {
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
          <h1>Welcome Back</h1>
          <label>
            ID
            <input
              className={error ? "invalid" : ""}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              placeholder="Enter your ID"
            />
          </label>
          <label>
            Password
            <input
              className={error ? "invalid" : ""}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </label>
          {error ? (
            <p className="auth-error">
              <img src="/assets/form-error.svg" alt="" />
              {error}
            </p>
          ) : null}
          <button className="auth-primary" disabled={busy}>{busy ? "Signing in…" : "Log in"}</button>
          <p className="signup-prompt">
            New to KART? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
