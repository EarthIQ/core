import { useCallback, useEffect, useRef, useState } from "react";
import { shareApi, type ShareEntityType } from "./shareApi";
import type {
  AccessEntry,
  GeneralAccess,
  Role,
  ShareSettings,
  ShareState,
} from "./types";

export function useShareState(
  entityType: ShareEntityType,
  entityId: string | null,
  open: boolean,
) {
  const [state, setState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!open || !entityId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    shareApi
      .getShareState(entityType, entityId)
      .then((s) => !cancelled && setState(s))
      .catch(
        (e) => !cancelled && setError(e?.message ?? "Failed to load sharing"),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, open]);

  const markBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });

  /* ── Mutations (optimistic + rollback) ─────────────────────────── */
  const invite = useCallback(
    async (
      emails: string[],
      role: Role,
      message: string,
      notifyPeople: boolean,
    ) => {
      if (!entityId || emails.length === 0) return;
      try {
        const created = await shareApi.invite(
          entityType,
          entityId,
          emails,
          role,
          message,
          notifyPeople,
        );
        setState((s) =>
          s ? { ...s, entries: [...s.entries, ...created] } : s,
        );
        notify(
          notifyPeople
            ? `Invitation${emails.length > 1 ? "s" : ""} sent to ${emails.length} ${
                emails.length > 1 ? "people" : "person"
              }`
            : `${emails.length} ${emails.length > 1 ? "people" : "person"} added`,
        );
      } catch (e: any) {
        notify(e?.message ?? "Failed to send invitations");
        throw e;
      }
    },
    [entityType, entityId, notify],
  );

  const updateRole = useCallback(
    async (entryId: string, role: Role) => {
      if (!entityId || !state) return;
      const prev = state;
      setState({
        ...state,
        entries: state.entries.map((e) =>
          e.id === entryId ? { ...e, role } : e,
        ),
      });
      markBusy(entryId, true);
      try {
        await shareApi.updateRole(entityType, entityId, entryId, role);
      } catch {
        setState(prev);
        notify("Could not update access");
      } finally {
        markBusy(entryId, false);
      }
    },
    [entityType, entityId, state, notify],
  );

  const removeAccess = useCallback(
    async (entryId: string) => {
      if (!entityId || !state) return;
      const prev = state;
      const removed = state.entries.find((e) => e.id === entryId);
      setState({
        ...state,
        entries: state.entries.filter((e) => e.id !== entryId),
      });
      try {
        await shareApi.removeAccess(entityType, entityId, entryId);
        notify(`Removed ${removed?.name ?? removed?.email ?? "person"}`);
      } catch {
        setState(prev);
        notify("Could not remove access");
      }
    },
    [entityType, entityId, state, notify],
  );

  const transferOwnership = useCallback(
    async (entryId: string) => {
      if (!entityId || !state) return;
      const prev = state;
      setState({
        ...state,
        entries: state.entries.map((e) => ({
          ...e,
          role:
            e.id === entryId ? "owner" : e.role === "owner" ? "editor" : e.role,
        })),
      });
      markBusy(entryId, true);
      try {
        await shareApi.transferOwnership(entityType, entityId, entryId);
        notify("Ownership transferred");
      } catch {
        setState(prev);
        notify("Could not transfer ownership");
      } finally {
        markBusy(entryId, false);
      }
    },
    [entityType, entityId, state, notify],
  );

  const updateGeneral = useCallback(
    async (general: GeneralAccess) => {
      if (!entityId || !state) return;
      const prev = state;
      setState({ ...state, general });
      try {
        await shareApi.updateGeneralAccess(entityType, entityId, general);
      } catch {
        setState(prev);
        notify("Could not update general access");
      }
    },
    [entityType, entityId, state, notify],
  );

  const updateSettings = useCallback(
    async (patch: Partial<ShareSettings>) => {
      if (!entityId || !state) return;
      const next = { ...state.settings, ...patch };
      const prev = state;
      setState({ ...state, settings: next });
      try {
        await shareApi.updateSettings(entityType, entityId, next);
      } catch {
        setState(prev);
        notify("Could not update settings");
      }
    },
    [entityType, entityId, state, notify],
  );

  return {
    state,
    loading,
    error,
    busyIds,
    toast,
    notify,
    invite,
    updateRole,
    removeAccess,
    transferOwnership,
    updateGeneral,
    updateSettings,
  };
}

export type UseShareState = ReturnType<typeof useShareState>;
export type { AccessEntry };
