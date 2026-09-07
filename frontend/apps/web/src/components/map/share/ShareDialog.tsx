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
    [share.state],
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
        className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl flex flex-col animate-scale-in"
        role="dialog"
        style={{ maxHeight: "88vh" }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {view === "settings" && (
              <button
                className="p-1 -ml-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
                type="button"
                onClick={() => setView("main")}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-semibold text-text-primary truncate">
              {view === "settings" ? "Sharing settings" : `Share "${entityTitle}" (${entityType})`}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {view === "main" && canManage ? <button
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Sharing settings"
                type="button"
                onClick={() => setView("settings")}
              >
                <Settings size={16} />
              </button> : null}
            <button
              aria-label="Close"
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        {share.loading ? (
          <div className="px-5 pb-6 flex flex-col gap-3">
            <div className="h-11 rounded-xl bg-surface-hover animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-hover animate-pulse" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-1/3 rounded bg-surface-hover animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-surface-hover animate-pulse" />
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
          <div className="px-5 pb-2 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
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
                className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-surface-hover/50 cursor-pointer transition-colors"
              >
                <input
                  checked={share.state.settings[opt.key]}
                  className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                  type="checkbox"
                  onChange={(e) =>
                    share.updateSettings({ [opt.key]: e.target.checked })
                  }
                />
                <span>
                  <span className="block text-[0.82rem] text-text-primary">
                    {opt.title}
                  </span>
                  <span className="block text-[0.7rem] text-text-tertiary leading-snug mt-0.5">
                    {opt.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          /* ── Main view ────────────────────────────────────── */
          <div className="flex flex-col overflow-y-auto scrollbar-thin">
            {/* Invite input */}
            {canManage ? <div className="px-5 pb-3 shrink-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <EmailChipsInput
                      chips={chips}
                      entityId={entityId ?? undefined}
                      existingEmails={existingEmails}
                      onChange={setChips}
                    />
                  </div>
                  {inviteMode ? <div className="pt-1.5">
                      <RoleSelect value={inviteRole} onChange={setInviteRole} />
                    </div> : null}
                </div>

                {/* Invite mode extras */}
                {inviteMode ? <div className="mt-3 flex flex-col gap-3 animate-fade-in">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        checked={notifyPeople}
                        className="accent-primary w-4 h-4"
                        type="checkbox"
                        onChange={(e) => setNotifyPeople(e.target.checked)}
                      />
                      <span className="text-[0.78rem] text-text-secondary">
                        Notify people
                      </span>
                    </label>

                    {notifyPeople ? <textarea
                        className="w-full resize-none rounded-xl bg-surface-hover/40 border border-border-secondary focus:border-primary/60 outline-none px-3 py-2 text-[0.8rem] text-text-primary placeholder:text-text-quaternary transition-colors"
                        placeholder="Message (optional)"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      /> : null}
                  </div> : null}
              </div> : null}

            {/* People with access */}
            {!inviteMode && (
              <>
                <div className="px-5 pb-1">
                  <div className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-text-primary mb-1">
                    <Users className="text-text-tertiary" size={13} />
                    People with access
                    <span className="text-text-quaternary font-normal">
                      ({share.state.entries.length})
                    </span>
                  </div>
                </div>

                <div className="px-3 pb-3 flex flex-col max-h-[240px] overflow-y-auto scrollbar-thin">
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

                <div className="h-px bg-border-secondary mx-5 mb-3" />

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
          <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0">
            <button
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-[0.8rem] font-medium transition-all ${
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
                  className="px-4 py-2 rounded-full text-[0.8rem] font-medium text-text-secondary hover:bg-surface-hover transition-colors"
                  type="button"
                  onClick={() => {
                    setChips([]);
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-white text-[0.8rem] font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                  disabled={sending}
                  type="button"
                  onClick={handleSend}
                >
                  {sending ? <Loader2 className="animate-spin" size={14} /> : null}
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            ) : (
              <button
                className="px-6 py-2 rounded-full bg-primary text-white text-[0.8rem] font-semibold hover:opacity-90 transition-opacity"
                type="button"
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        )}

        {/* ── Inline toast ───────────────────────────────────── */}
        {share.toast ? <div className="absolute left-1/2 -translate-x-1/2 bottom-[-52px] px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-primary shadow-2xl text-[0.78rem] text-text-primary whitespace-nowrap animate-fade-in">
            {share.toast}
          </div> : null}
      </div>
    </div>,
    document.body,
  );
}

export default ShareDialog;
