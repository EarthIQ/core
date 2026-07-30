import { FormEvent, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, Input } from "@packages/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/dashboard";

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
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-sm flex flex-col gap-6 bg-elevated border border-border-primary rounded-2xl p-8 shadow-2xl backdrop-blur-xl animate-scale-in">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 mb-1">
            <span className="text-2xl">🌍</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">
            EarthIQ
          </h1>
          <p className="text-xs text-text-tertiary tracking-wide">
            Enterprise Geospatial Intelligence
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          id="login-form"
          className="flex flex-col gap-4"
        >
          {/* Error Alert */}
          {error && (
            <div role="alert" className="alert alert-error animate-shake">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="alert-icon shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="alert-content text-sm">{error}</span>
            </div>
          )}

          {/* Email */}
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <Input
            type="email"
            id="login-email"
            placeholder="you@organization.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Password */}
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <Input
            type="password"
            id="login-password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Submit */}
          <Button
            variant="primary"
            type="submit"
            id="login-submit"
            loading={loading}
            loadingText="Signing in…"
          >
            Sign in
          </Button>
        </form>

        {/* Footer */}
        <p className="text-xs text-text-tertiary text-center">
          Don't have an account?{" "}
          <a
            href="#"
            className="text-primary hover:text-primary-dark font-medium transition-colors duration-150"
            onClick={(e) => e.preventDefault()}
          >
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
}
