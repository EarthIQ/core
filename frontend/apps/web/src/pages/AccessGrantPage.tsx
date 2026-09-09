import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import {
  shareApi,
  type AccessRequestInfo,
} from "@/components/map/share/shareApi";

import type { Role } from "@/components/map/share/types";

/**
 * Owner approval page for access requests: /access/grant?token=...
 *
 * Reached from the email the owner gets when a user requests access to one of
 * their maps/projects (Google-Docs style). Only the entity's owner (or a
 * superuser) can act; the backend enforces that.
 */
export default function AccessGrantPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<AccessRequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "granted" | "denied">(null);

  useEffect(() => {
    if (!token) {
      setError("Missing approval token. Please use the link from your email.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    shareApi
      .getAccessRequest(token)
      .then((r) => {
        if (cancelled) return;
        setInfo(r);
        setRole(r.requestedRole === "owner" ? "viewer" : r.requestedRole);
        if (r.status !== "pending")
          setDone(r.status === "granted" ? "granted" : "denied");
      })
      .catch(
        (e) =>
          !cancelled && setError(e?.message ?? "Could not load the request")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleGrant() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const r = await shareApi.grantAccess(token, role);
      setInfo(r);
      setDone("granted");
    } catch (e: any) {
      setError(e?.message ?? "Could not grant access");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeny() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const r = await shareApi.denyAccess(token);
      setInfo(r);
      setDone("denied");
    } catch (e: any) {
      setError(e?.message ?? "Could not decline the request");
    } finally {
      setBusy(false);
    }
  }

  const label = info
    ? info.entityType === "project"
      ? "project"
      : "map"
    : "entity";
  const requesterInitial = (
    info?.requesterName?.charAt(0) ??
    info?.requesterEmail?.charAt(0) ??
    "U"
  ).toUpperCase();

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="bg-elevated border-border-primary animate-scale-in flex w-full max-w-md flex-col items-center rounded-2xl border p-8 text-center shadow-2xl">
        {loading ? (
          <>
            <Loader2
              className="text-primary mb-4 animate-spin"
              size={40}
            />
            <h2 className="text-text-primary text-lg font-semibold">
              Loading request…
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              One moment, we&rsquo;re fetching the details.
            </p>
          </>
        ) : error && !info ? (
          <>
            <XCircle
              className="mb-4 text-red-400"
              size={40}
            />
            <h2 className="text-text-primary text-lg font-semibold">
              Couldn&rsquo;t load this request
            </h2>
            <p className="text-text-secondary mt-2 text-sm">{error}</p>
            <button
              className="bg-primary mt-6 rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
            >
              Go to Dashboard
            </button>
          </>
        ) : info ? (
          <>
            {done === "granted" ? (
              <>
                <CheckCircle2
                  className="text-success mb-4"
                  size={40}
                />
                <h2 className="text-text-primary text-lg font-semibold">
                  Access granted
                </h2>
                <p className="text-text-secondary mt-2 text-sm leading-relaxed">
                  <span className="text-text-primary font-semibold">
                    {info.requesterName ?? info.requesterEmail}
                  </span>{" "}
                  now has{" "}
                  <span className="text-text-primary font-semibold capitalize">
                    {info.grantedRole ?? "viewer"}
                  </span>{" "}
                  access to the {label}{" "}
                  <span className="text-text-primary font-semibold">
                    &ldquo;{info.title}&rdquo;
                  </span>
                  . They&rsquo;ve been notified by email.
                </p>
              </>
            ) : done === "denied" ? (
              <>
                <XCircle
                  className="text-warning mb-4"
                  size={40}
                />
                <h2 className="text-text-primary text-lg font-semibold">
                  Request declined
                </h2>
                <p className="text-text-secondary mt-2 text-sm">
                  You declined the access request from{" "}
                  <span className="text-text-primary font-semibold">
                    {info.requesterName ?? info.requesterEmail}
                  </span>
                  .
                </p>
              </>
            ) : (
              <>
                <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                  <ShieldCheck
                    className="text-primary"
                    size={26}
                  />
                </div>
                <h2 className="text-text-primary text-lg font-semibold">
                  Access request
                </h2>

                {/* Requester */}
                <div className="bg-bg-tertiary border-border-secondary mt-5 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left">
                  <div className="bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {requesterInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary truncate text-sm font-semibold">
                      {info.requesterName ?? info.requesterEmail}
                    </p>
                    <p className="text-text-secondary truncate text-xs">
                      {info.requesterEmail}
                    </p>
                  </div>
                  <span className="text-text-tertiary ml-auto shrink-0 text-[11px] font-medium capitalize">
                    wants {info.requestedRole}
                  </span>
                </div>

                {/* Entity */}
                <p className="text-text-secondary mt-4 text-sm leading-relaxed">
                  for your {label}{" "}
                  <span className="text-text-primary font-semibold">
                    &ldquo;{info.title}&rdquo;
                  </span>
                </p>

                {/* Message */}
                {info.message ? (
                  <div className="mt-3 w-full text-left">
                    <p className="text-text-tertiary mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                      They wrote
                    </p>
                    <div className="bg-bg-tertiary border-primary/60 text-text-secondary rounded-lg border-l-2 px-3.5 py-2.5 text-[13px] leading-relaxed italic">
                      {info.message}
                    </div>
                  </div>
                ) : null}

                {/* Role picker */}
                <div className="mt-5 flex w-full items-center justify-between gap-3">
                  <label
                    className="text-text-secondary text-sm font-medium"
                    htmlFor="grant-role"
                  >
                    Grant as
                  </label>
                  <select
                    className="bg-bg-tertiary border-border-primary text-text-primary focus:border-primary/60 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    id="grant-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="commenter">Commenter</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>

                {error ? (
                  <p className="mt-3 text-xs text-red-400">{error}</p>
                ) : null}

                {/* Actions */}
                <div className="mt-6 flex w-full items-center gap-3">
                  <button
                    className="text-text-secondary hover:bg-surface-hover flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                    disabled={busy}
                    type="button"
                    onClick={handleDeny}
                  >
                    Decline
                  </button>
                  <button
                    className="bg-primary flex flex-[2] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    disabled={busy}
                    type="button"
                    onClick={handleGrant}
                  >
                    {busy ? (
                      <Loader2
                        className="animate-spin"
                        size={15}
                      />
                    ) : null}
                    {busy ? "Working…" : "Grant access"}
                  </button>
                </div>
              </>
            )}

            {(done === "granted" || done === "denied") && (
              <button
                className="border-border-primary text-text-secondary hover:bg-surface-hover mt-6 rounded-full border px-6 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
              >
                Back to Dashboard
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
