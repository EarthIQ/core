import { FormEvent, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="eq-login">
      <div className="eq-login__card eq-glass">
        <div className="eq-login__logo">
          <div className="eq-login__logo-name">EarthIQ</div>
          <p className="eq-login__tagline">Enterprise Geospatial Intelligence</p>
        </div>

        <form className="eq-form" onSubmit={handleSubmit} id="login-form">
          {error && <div className="eq-form__error" role="alert">{error}</div>}

          <div className="eq-field">
            <label htmlFor="login-email" className="eq-field__label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="eq-field__input"
              placeholder="you@organization.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="eq-field">
            <label htmlFor="login-password" className="eq-field__label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="eq-field__input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            className="eq-btn eq-btn--primary eq-btn--md eq-w-full"
            style={{ marginTop: "0.5rem", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? <span className="eq-btn__spinner" /> : null}
            <span className="eq-btn__label">
              {loading ? "Signing in…" : "Sign in"}
            </span>
          </button>
        </form>

        <p className="eq-text-xs eq-text-muted" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Don't have an account?{" "}
          <a href="#" style={{ color: "var(--eq-accent)" }} onClick={(e) => e.preventDefault()}>
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
}
