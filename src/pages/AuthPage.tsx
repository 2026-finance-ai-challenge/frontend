import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "../components/Layout";

const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;

function FormError({ children }: { children: string }) {
  return (
    <small className="auth-error">
      <img src="/assets/form-error.svg" alt="" />
      {children}
    </small>
  );
}

export function SignupPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nationality, setNationality] = useState("");
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordIsValid = PASSWORD_PATTERN.test(password);
  const emailError = submitted && !email.includes("@");
  const passwordError =
    (submitted || passwordTouched) && !passwordIsValid;
  const confirmError =
    (submitted || confirmTouched) && (!confirm || password !== confirm);
  const nationalityError = submitted && !nationality;
  const next = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (
      !emailError &&
      email.includes("@") &&
      passwordIsValid &&
      password === confirm &&
      nationality
    )
      setStep(2);
  };
  return (
    <div className="auth-page">
      <Header authenticated white />
      <main>
        {step === 1 ? (
          <form className="auth-card signup-card" onSubmit={next}>
            <h1>Welcome to Kart</h1>
            <label>
              E-Mail
              <div className="email-check">
                <input
                  className={checked ? "valid" : emailError ? "invalid" : ""}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setChecked(false);
                  }}
                  placeholder="Enter your email"
                />
                <button
                  type="button"
                  onClick={() => setChecked(email.includes("@"))}
                >
                  Check
                </button>
              </div>
              {checked && <small className="safe">Available account</small>}
              {emailError && <FormError>Enter a valid email address</FormError>}
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
                  Min 8 characters, combination of letters, numbers, and symbols
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
                <option>United States</option>
                <option disabled>Japan</option>
                <option disabled>Singapore</option>
              </select>
              {nationalityError && (
                <FormError>Select your nationality</FormError>
              )}
            </label>
            <button className="auth-primary">Continue to next step</button>
            <Link to="/login">Log in</Link>
          </form>
        ) : (
          <ConsentStep />
        )}
      </main>
    </div>
  );
}

function ConsentStep() {
  const [profile, setProfile] = useState("Individual");
  const [consents, setConsents] = useState([true, false, false]);
  const navigate = useNavigate();
  return (
    <section className="auth-card consent-card">
      <h2>Investor Profile</h2>
      <div className="profile-options">
        <button
          className={profile === "Individual" ? "active" : ""}
          onClick={() => setProfile("Individual")}
        >
          <b>Individual</b>
          <span>Standard retail market insight.</span>
        </button>
        <button
          className={profile === "Institutional" ? "active" : ""}
          onClick={() => setProfile("Institutional")}
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
      <button className="auth-primary" onClick={() => navigate("/my")}>
        Create Account
      </button>
    </section>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (email && password.length >= 8) navigate("/my");
    else setError(true);
  };
  return (
    <div className="auth-page">
      <Header authenticated white />
      <main>
        <form className="auth-card login-card" onSubmit={submit}>
          <h1>Welcome Back</h1>
          <label>
            E-Mail
            <input
              className={error ? "invalid" : ""}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
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
          {error && (
            <p className="auth-error">
              <img src="/assets/form-error.svg" alt="" />
              Please check your ID and password again.
            </p>
          )}
          <button className="auth-primary">Log in</button>
          <p className="signup-prompt">
            New to KART? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
