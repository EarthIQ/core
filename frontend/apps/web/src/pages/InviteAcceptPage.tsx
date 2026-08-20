import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, FolderKanban, Map } from "lucide-react";
import { shareApi, type InviteAcceptResult } from "@/components/map/share/shareApi";

/**
 * Landing page for invite email links: /invite/accept?token=...
 *
 * Requires login (mounted inside the protected shell). Accepts the one-time
 * token — which works for BOTH map and project invitations — then offers to
 * open the accepted entity.
 */
export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [result, setResult] = useState<InviteAcceptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token. Please use the link from your email.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    shareApi
      .acceptInvite(token)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to accept the invitation"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  function openEntity() {
    if (!result) return;
    if (result.entityType === "project") {
      navigate(`/map?projectId=${result.entityId}`, { replace: true });
    } else {
      navigate(`/share/map/${result.entityId}`, { replace: true });
    }
  }

  const entityLabel = result ? (result.entityType === "map" ? "map" : "project") : "map";
  const EntityIcon = result?.entityType === "map" ? Map : FolderKanban;

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center animate-scale-in">
        {loading ? (
          <>
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold text-text-primary">
              Accepting invitation…
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              One moment, we&rsquo;re confirming your access.
            </p>
          </>
        ) : error ? (
          <>
            <XCircle size={40} className="text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-text-primary">
              Couldn&rsquo;t accept the invitation
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
        ) : result ? (
          <>
            <CheckCircle2 size={40} className="text-success mb-4" />
            <h2 className="text-lg font-semibold text-text-primary">
              Invitation accepted 🎉
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              You now have{" "}
              <span className="font-semibold text-text-primary capitalize">
                {result.role}
              </span>{" "}
              access to the {entityLabel}{" "}
              <span className="font-semibold text-text-primary">
                &ldquo;{result.title}&rdquo;
              </span>
              .
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={openEntity}
                className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <EntityIcon size={15} />
                Open {entityLabel}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
                className="px-4 py-2 rounded-full text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                Dashboard
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}