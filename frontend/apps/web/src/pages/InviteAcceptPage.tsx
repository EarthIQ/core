import {
  CheckCircle2,
  XCircle,
  Loader2,
  FolderKanban,
  Map,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  shareApi,
  type InviteAcceptResult,
} from "@/components/map/share/shareApi";

/**
 * Landing page for invite email links: /invite/accept?token=...
 *
 * Requires login (mounted inside the protected shell). Accepts the one-time
 * token - which works for BOTH map and project invitations - then offers to
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
      setError(
        "Missing invitation token. Please use the link from your email."
      );
      setLoading(false);
      return;
    }
    let cancelled = false;
    shareApi
      .acceptInvite(token)
      .then((r) => !cancelled && setResult(r))
      .catch(
        (e) =>
          !cancelled &&
          setError(e?.message ?? "Failed to accept the invitation")
      )
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

  const entityLabel = result
    ? result.entityType === "map"
      ? "map"
      : "project"
    : "map";
  const EntityIcon = result?.entityType === "map" ? Map : FolderKanban;

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
              Accepting invitation…
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              One moment, we&rsquo;re confirming your access.
            </p>
          </>
        ) : error ? (
          <>
            <XCircle
              className="mb-4 text-red-400"
              size={40}
            />
            <h2 className="text-text-primary text-lg font-semibold">
              Couldn&rsquo;t accept the invitation
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
        ) : result ? (
          <>
            <CheckCircle2
              className="text-success mb-4"
              size={40}
            />
            <h2 className="text-text-primary text-lg font-semibold">
              Invitation accepted 🎉
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              You now have{" "}
              <span className="text-text-primary font-semibold capitalize">
                {result.role}
              </span>{" "}
              access to the {entityLabel}{" "}
              <span className="text-text-primary font-semibold">
                &ldquo;{result.title}&rdquo;
              </span>
              .
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                className="bg-primary flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                type="button"
                onClick={openEntity}
              >
                <EntityIcon size={15} />
                Open {entityLabel}
              </button>
              <button
                className="text-text-secondary hover:bg-surface-hover rounded-full px-4 py-2 text-sm font-medium transition-colors"
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
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
