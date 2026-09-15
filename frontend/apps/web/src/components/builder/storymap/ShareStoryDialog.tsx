/**
 * storymap/ShareStoryDialog.tsx
 * -----------------------------
 * Share a story map as a self-contained link. The story (with its map views
 * inlined) is encoded into the URL, so anyone with the link can open the
 * guided experience at `/share/story/:token` - no account, no project access.
 */
import { Button, cn } from "@packages/ui";
import { Check, ExternalLink, Link2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { buildShareUrl, encodeStoryToken } from "./share";

import type { SceneData } from "./StorySceneView";
import type { StoryMap } from "./types";

export const ShareStoryDialog = ({
  open,
  onClose,
  story,
  data,
}: {
  open: boolean;
  onClose: () => void;
  story: StoryMap;
  data?: SceneData | null;
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  /* The token is a pure function of story + data - recompute when either
     changes or the dialog opens. */
  const url = useMemo(() => {
    if (!open) return "";
    try {
      return buildShareUrl(encodeStoryToken(story, data ?? undefined));
    } catch {
      return "";
    }
  }, [open, story, data]);

  /* Reset + Escape + scroll lock */
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyFailed(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleCopy() {
    if (!url) return;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(done)
        .catch(() => setCopyFailed(true));
    } else {
      setCopyFailed(true);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        aria-label="Share story map"
        aria-modal="true"
        className="w-full max-w-lg flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-2xl"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-primary)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Share story map
            </h2>
            <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
              {story.title} · {story.scenes.length} scene
              {story.scenes.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            aria-label="Close share dialog"
            className="cursor-pointer rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            This link carries a <strong>snapshot</strong> of the story - its
            scenes, text and map views - so anyone with it can open the guided
            experience. No EarthIQ account or project access required.
          </p>

          {url ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                aria-label="Story link"
                className="input min-w-0 flex-1 truncate text-xs"
                value={url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                leftIcon={copied ? <Check size={14} /> : <Link2 size={14} />}
                size="sm"
                className={cn(
                  "shrink-0",
                  copied &&
                    "border-[var(--success-border)] text-[var(--success-text)]"
                )}
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                iconOnly
                aria-label="Open story link"
                className="shrink-0"
                size="sm"
                variant="ghost"
                onClick={() => window.open(url, "_blank", "noopener")}
              >
                <ExternalLink size={14} />
              </Button>
            </div>
          ) : (
            <p
              className="rounded-lg border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-xs text-[var(--error-text)]"
              role="alert"
            >
              This story is too large to encode in a link. Trim scenes or
              images, then try again.
            </p>
          )}

          {copyFailed ? (
            <p
              className="text-xs text-[var(--error-text)]"
              role="alert"
            >
              Clipboard copy was blocked - select the link and copy it manually.
            </p>
          ) : null}

          <p className="text-xs leading-snug text-[var(--text-tertiary)]">
            Tip: links can be long - that's expected, the whole story travels
            inside the URL.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)] px-5 py-3">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            leftIcon={<ExternalLink size={14} />}
            onClick={() => window.open(url, "_blank", "noopener")}
          >
            Open story
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
