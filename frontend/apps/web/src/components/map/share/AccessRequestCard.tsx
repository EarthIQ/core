import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useState } from "react";

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
export const AccessRequestCard = ({
  entityType,
  entityId,
  entityTitle,
}: AccessRequestCardProps) => {
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
    <div className="bg-elevated border-border-primary animate-scale-in flex w-full max-w-md flex-col items-center rounded-2xl border p-8 text-center shadow-2xl">
      <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Lock
          className="text-primary"
          size={26}
        />
      </div>
      <h2 className="text-text-primary text-lg font-semibold">
        You don&rsquo;t have access to this {label}
      </h2>
      <p className="text-text-secondary mt-2 text-sm leading-relaxed">
        {name ? (
          <>
            The {label}{" "}
            <span className="text-text-primary font-semibold">{name}</span>{" "}
          </>
        ) : null}
        is private. You can request access - the owner will be notified by email
        and can approve your request.
      </p>

      {sent ? (
        <div className="animate-fade-in mt-6 flex w-full flex-col items-center gap-2">
          <CheckCircle2
            className="text-success"
            size={32}
          />
          <p className="text-text-primary text-sm font-medium">Request sent</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            The owner has been notified. You&rsquo;ll be able to open this{" "}
            {label} as soon as they approve your request.
          </p>
        </div>
      ) : (
        <>
          <textarea
            className="bg-bg-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-primary/60 mt-5 w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none"
            placeholder={`Tell the owner why you need access to this ${label}… (optional)`}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          <button
            className="bg-primary mt-4 flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            disabled={sending}
            type="button"
            onClick={handleSubmit}
          >
            {sending ? (
              <Loader2
                className="animate-spin"
                size={15}
              />
            ) : null}
            {sending ? "Sending…" : "Request access"}
          </button>
        </>
      )}
    </div>
  );
};

export default AccessRequestCard;
