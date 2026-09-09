import {
  X,
  Link2,
  Settings,
  ChevronLeft,
  Loader2,
  Users,
  Check,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { EmailChipsInput } from "./EmailChipsInput";
import { GeneralAccessSection } from "./GeneralAccess";
import { PersonRow } from "./PersonRow";
import { RoleSelect } from "./RoleSelect";
import { useShareState } from "./useShareState";

import type { ShareEntityType } from "./shareApi";
import type { Role } from "./types";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  /** Whether the shared entity is a map or a project (default: "map"). */
  entityType?: ShareEntityType;
  entityId: string | null;
  entityTitle: string;
  shareUrl?: string;
  /** Whether the current user may modify sharing (owner/admin). */
  canManage?: boolean;
}

export const ShareDialog = ({
  open,
  onClose,
  entityType = "map",
  entityId,
  entityTitle,
  shareUrl,
  canManage = true,
}: ShareDialogProps) => {
  const share = useShareState(entityType, entityId, open);
  const [chips, setChips] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [message, setMessage] = useState("");
  const [notifyPeople, setNotifyPeople] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"main" | "settings">("main");

  const url =
    shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const inviteMode = chips.length > 0;

  /* Reset on close */
  useEffect(() => {
    if (open) return;
    setChips([]);
    setMessage("");
    setNotifyPeople(true);
    setInviteRole("editor");
    setView("main");
    setSending(false);
  }, [open]);

  /* Escape + scroll lock */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const existingEmails = useMemo(
    () => share.state?.entries.map((e) => e.email) ?? [],
    [share.state]
  );

  async function handleSend() {
    setSending(true);
    try {
      await share.invite(chips, inviteRole, message, notifyPeople);
      setChips([]);
      setMessage("");
    } catch {
      /* toast handled in hook */
    } finally {
      setSending(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      share.notify("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(8,13,20,0.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        aria-label={`Share ${entityType}`}
        aria-modal="true"
        className="bg-elevated border-border-primary animate-scale-in flex w-full max-w-lg flex-col rounded-2xl border shadow-2xl"
        role="dialog"
        style={{ maxHeight: "88vh" }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {view === "settings" && (
              <button
                className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover -ml-1 rounded-lg p-1 transition-colors"
                type="button"
                onClick={() => setView("main")}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-text-primary truncate text-base font-semibold">
              {view === "settings"
                ? "Sharing settings"
                : `Share "${entityTitle}" (${entityType})`}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {view === "main" && canManage ? (
              <button
                className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-colors"
                title="Sharing settings"
                type="button"
                onClick={() => setView("settings")}
              >
                <Settings size={16} />
              </button>
            ) : null}
            <button
              aria-label="Close"
              className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-colors"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        {share.loading ? (
          <div className="flex flex-col gap-3 px-5 pb-6">
            <div className="bg-surface-hover h-11 animate-pulse rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
              >
                <div className="bg-surface-hover h-8 w-8 animate-pulse rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="bg-surface-hover h-3 w-1/3 animate-pulse rounded" />
                  <div className="bg-surface-hover h-2.5 w-1/2 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : share.error ? (
          <div className="px-5 pb-6 text-center text-sm text-red-400">
            {share.error}
          </div>
        ) : view === "settings" ? (
          /* ── Settings view ────────────────────────────────── */
          <div className="flex scrollbar-thin flex-col gap-1 overflow-y-auto px-5 pb-2">
            {[
              {
                key: "editorsCanShare" as const,
                title: "Editors can change permissions and share",
                desc: "Allow people with edit access to invite others",
              },
              {
                key: "viewersCanDownload" as const,
                title: "Viewers and commenters can download & export",
                desc: "Allow exporting layers, tiles and screenshots",
              },
            ].map((opt) => (
              <label
                key={opt.key}
                className="hover:bg-surface-hover/50 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-3 transition-colors"
              >
                <input
                  checked={share.state.settings[opt.key]}
                  className="accent-primary mt-0.5 h-4 w-4 shrink-0"
                  type="checkbox"
                  onChange={(e) =>
                    share.updateSettings({ [opt.key]: e.target.checked })
                  }
                />
                <span>
                  <span className="text-text-primary block text-[0.82rem]">
                    {opt.title}
                  </span>
                  <span className="text-text-tertiary mt-0.5 block text-[0.7rem] leading-snug">
                    {opt.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          /* ── Main view ────────────────────────────────────── */
          <div className="flex scrollbar-thin flex-col overflow-y-auto">
            {/* Invite input */}
            {canManage ? (
              <div className="shrink-0 px-5 pb-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <EmailChipsInput
                      chips={chips}
                      entityId={entityId ?? undefined}
                      existingEmails={existingEmails}
                      onChange={setChips}
                    />
                  </div>
                  {inviteMode ? (
                    <div className="pt-1.5">
                      <RoleSelect
                        value={inviteRole}
                        onChange={setInviteRole}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Invite mode extras */}
                {inviteMode ? (
                  <div className="animate-fade-in mt-3 flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        checked={notifyPeople}
                        className="accent-primary h-4 w-4"
                        type="checkbox"
                        onChange={(e) => setNotifyPeople(e.target.checked)}
                      />
                      <span className="text-text-secondary text-[0.78rem]">
                        Notify people
                      </span>
                    </label>

                    {notifyPeople ? (
                      <textarea
                        className="bg-surface-hover/40 border-border-secondary focus:border-primary/60 text-text-primary placeholder:text-text-quaternary w-full resize-none rounded-xl border px-3 py-2 text-[0.8rem] transition-colors outline-none"
                        placeholder="Message (optional)"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* People with access */}
            {!inviteMode && (
              <>
                <div className="px-5 pb-1">
                  <div className="text-text-primary mb-1 flex items-center gap-1.5 text-[0.8rem] font-semibold">
                    <Users
                      className="text-text-tertiary"
                      size={13}
                    />
                    People with access
                    <span className="text-text-quaternary font-normal">
                      ({share.state.entries.length})
                    </span>
                  </div>
                </div>

                <div className="flex max-h-[240px] scrollbar-thin flex-col overflow-y-auto px-3 pb-3">
                  {share.state.entries.map((entry) => (
                    <PersonRow
                      key={entry.id}
                      busy={share.busyIds.has(entry.id)}
                      canManage={canManage}
                      entry={entry}
                      onRemove={() => share.removeAccess(entry.id)}
                      onRoleChange={(role) => share.updateRole(entry.id, role)}
                      onTransferOwnership={() =>
                        share.transferOwnership(entry.id)
                      }
                    />
                  ))}
                </div>

                <div className="bg-border-secondary mx-5 mb-3 h-px" />

                <GeneralAccessSection
                  canManage={canManage}
                  general={share.state.general}
                  label={entityType === "map" ? "map" : "project"}
                  onChange={share.updateGeneral}
                />
              </>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        {view === "main" && !share.loading && !share.error && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] font-medium transition-all ${
                copied
                  ? "border-success/40 text-success bg-success/10"
                  : "border-border-primary text-primary hover:bg-primary/10"
              }`}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />}
              {copied ? "Link copied" : "Copy link"}
            </button>

            {inviteMode ? (
              <div className="flex items-center gap-2">
                <button
                  className="text-text-secondary hover:bg-surface-hover rounded-full px-4 py-2 text-[0.8rem] font-medium transition-colors"
                  type="button"
                  onClick={() => {
                    setChips([]);
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary flex items-center gap-2 rounded-full px-5 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  disabled={sending}
                  type="button"
                  onClick={handleSend}
                >
                  {sending ? (
                    <Loader2
                      className="animate-spin"
                      size={14}
                    />
                  ) : null}
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            ) : (
              <button
                className="bg-primary rounded-full px-6 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-90"
                type="button"
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        )}

        {/* ── Inline toast ───────────────────────────────────── */}
        {share.toast ? (
          <div className="bg-bg-tertiary border-border-primary text-text-primary animate-fade-in absolute bottom-[-52px] left-1/2 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-[0.78rem] whitespace-nowrap shadow-2xl">
            {share.toast}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default ShareDialog;
