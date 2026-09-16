/**
 * PublicEntity.tsx
 * ----------------
 * Shared plumbing for the **public, no-auth share viewers** (map / story map /
 * presentation). Every piece of published content is a `maps` row with a
 * `kind` discriminator, so each public route fetches the row by id and
 * dispatches to the right viewer.
 *
 *  - `usePublicEntity(id)` - fetches a shared `maps` row and classifies the
 *    outcome (ready / denied-403 / error).
 *  - `PublicDenied`        - the standard "private content" screen:
 *                            signed-in → request access; signed-out → login.
 */
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AccessRequestCard } from "@/components/map/share/AccessRequestCard";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchMapById, type MapItem } from "@/lib/maps";

export interface PublicEntityState {
  row: MapItem | null;
  loading: boolean;
  /** 403 - the row exists but this user is not allowed to see it. */
  denied: boolean;
  /** 404 / network / malformed - human-readable message, if any. */
  errorMsg: string | null;
}

/** Fetch a shared `maps` row by id, classifying auth vs not-found failures. */
export function usePublicEntity(id: string): PublicEntityState {
  const [row, setRow] = useState<MapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchMapById(id)
      .then((data) => {
        if (active) setRow(data);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setDenied(true);
        } else if (active) {
          setErrorMsg(
            "This content could not be loaded. It may be private or deleted."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { row, loading, denied, errorMsg };
}

/**
 * Standard "private / restricted" screen for a shared link.
 * @param from  Where to return to after sign-in (the shared URL).
 */
export const PublicDenied = ({
  entityId,
  noun = "map",
  from,
}: {
  entityId: string;
  noun?: string;
  from: string;
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-sm text-[var(--text-tertiary)]">Checking access…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-6">
        <AccessRequestCard
          entityId={entityId}
          entityType="map"
        />
      </div>
    );
  }

  return (
    <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-5xl">🔒</div>
      <h3 className="text-text-primary text-lg font-bold">
        Sign in to continue
      </h3>
      <p className="text-text-secondary mt-2 max-w-sm text-sm leading-relaxed">
        This {noun} is private. Sign in to view it, or to request access from
        the owner.
      </p>
      <button
        className="btn btn-primary btn-md mt-6 inline-flex items-center gap-2"
        type="button"
        onClick={() =>
          navigate("/login", { state: { from: { pathname: from } } })
        }
      >
        <LogIn size={15} /> Sign in
      </button>
    </div>
  );
};
