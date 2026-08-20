import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { shareApi, type AccessRequestInfo } from "@/components/map/share/shareApi";
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
        if (r.status !== "pending") setDone(r.status === "granted" ? "granted" : "denied");
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Could not load the request"))
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

  const label = info ? (info.entityType === "project" ? "project" : "map") : "entity";
  const requesterInitial = (info?.requesterName?.charAt(0) ??
    info?.requesterEmail?.charAt(0) ??
    "U").toUpperCase();

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center animate-scale-in">
        {loading ? (
          <>
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold text-text-primary">Loading request…</h2>
            <p className="text-sm text-text-secondary mt-2">
              One moment, we&rsquo;re fetching the details.
            </p>
          </>
        ) : error && !info ? (
          <>
            <XCircle size={40} className="text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-text-primary">
              Couldn&rsquo;t load this request
            </h2>
            <p className="text-sm text-text-secondary mt-2">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="mt-6 px-6 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
          </>
        ) : info ? (
          <>
            {done === "granted" ? (
              <>
                <CheckCircle2 size={40} className="text-success mb-4" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Access granted
                </h2>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  <span className="font-semibold text-text-primary">
                    {info.requesterName ?? info.requesterEmail}
                  </span>{" "}
                  now has{" "}
                  <span className="font-semibold text-text-primary capitalize">
                    {info.grantedRole ?? "viewer"}
                  </span>{" "}
                  access to the {label}{" "}
                  <span className="font-semibold text-text-primary">
                    &ldquo;{info.title}&rdquo;
                  </span>
                  . They&rsquo;ve been notified by email.
                </p>
              </>
            ) : done === "denied" ? (
              <>
                <XCircle size={40} className="text-warning mb-4" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Request declined
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  You declined the access request from{" "}
                  <span className="font-semibold text-text-primary">
                    {info.requesterName ?? info.requesterEmail}
                  </span>
                  .
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck size={26} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Access request
                </h2>

                {/* Requester */}
                <div className="mt-5 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary border border-border-secondary text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {requesterInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {info!.requesterName ?? info!.requesterEmail}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {info!.requesterEmail}
                    </p>
                  </div>
                  <span className="ml-auto text-[11px] font-medium text-text-tertiary capitalize shrink-0">
                    wants {info!.requestedRole}
                  </span>
                </div>

                {/* Entity */}
                <p className="mt-4 text-sm text-text-secondary leading-relaxed">
                  for your {label}{" "}
                  <span className="font-semibold text-text-primary">
                    &ldquo;{info!.title}&rdquo;
                  </span>
                </p>

                {/* Message */}
                {info!.message && (
                  <div className="mt-3 w-full text-left">
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">
                      They wrote
                    </p>
                    <div className="rounded-lg bg-bg-tertiary border-l-2 border-primary/60 px-3.5 py-2.5 text-[13px] text-text-secondary italic leading-relaxed">
                      {info!.message}
                    </div>
                  </div>
                )}

                {/* Role picker */}
                <div className="mt-5 w-full flex items-center justify-between gap-3">
                  <label
                    htmlFor="grant-role"
                    className="text-sm text-text-secondary font-medium"
                  >
                    Grant as
                  </label>
                  <select
                    id="grant-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm text-text-primary focus:outline-none focus:border-primary/60"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="commenter">Commenter</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>

                {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

                {/* Actions */}
                <div className="mt-6 w-full flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDeny}
                    disabled={busy}
                    className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-60 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleGrant}
                    disabled={busy}
                    className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    {busy ? "Working…" : "Grant access"}
                  </button>
                </div>
              </>
            )}

            {(done === "granted" || done === "denied") && (
              <button
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
                className="mt-6 px-6 py-2 rounded-full border border-border-primary text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
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