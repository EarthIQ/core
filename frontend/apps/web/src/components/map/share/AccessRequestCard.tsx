import { useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { shareApi, type ShareEntityType } from "./shareApi";

interface AccessRequestCardProps {
  entityType: ShareEntityType;
  entityId: string;
  /** Optional display name of the map/project (unknown when the fetch 403'd). */
  entityTitle?: string;
}

/**
 * Google-Docs style "Request access" card.
 *
 * Shown to a logged-in user who opened a link to a map/project they cannot
 * access. Submitting stores the request and emails the owner an approval link.
 */
export function AccessRequestCard({
  entityType,
  entityId,
  entityTitle,
}: AccessRequestCardProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = entityType === "project" ? "project" : "map";
  const name = entityTitle ? ` “${entityTitle}”` : "";

  async function handleSubmit() {
    setSending(true);
    setError(null);
    try {
      await shareApi.requestAccess(entityType, entityId, message.trim());
      setSent(true);
    } catch (e: any) {
      const msg: string = e?.message ?? "Could not send the access request";
      if (e?.status === 400 && /already/i.test(msg)) {
        setSent(true); // owner was already notified
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center animate-scale-in">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock size={26} className="text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">
        You don&rsquo;t have access to this {label}
      </h2>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        {name ? (
          <>
            The {label} <span className="font-semibold text-text-primary">{name}</span>{" "}
          </>
        ) : null}
        is private. You can request access — the owner will be notified by email
        and can approve your request.
      </p>

      {sent ? (
        <div className="mt-6 w-full flex flex-col items-center gap-2 animate-fade-in">
          <CheckCircle2 size={32} className="text-success" />
          <p className="text-sm font-medium text-text-primary">Request sent</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            The owner has been notified. You&rsquo;ll be able to open this {label} as
            soon as they approve your request.
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={`Tell the owner why you need access to this ${label}… (optional)`}
            className="mt-5 w-full resize-none rounded-xl bg-bg-tertiary border border-border-primary px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary/60 transition-colors"
          />
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {sending && <Loader2 size={15} className="animate-spin" />}
            {sending ? "Sending…" : "Request access"}
          </button>
        </>
      )}
    </div>
  );
}

export default AccessRequestCard;