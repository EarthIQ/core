import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Lock } from "lucide-react";
import { RoleSelect } from "./RoleSelect";
import { ROLE_META, type GeneralAccess as GA, type LinkRole } from "./types";

export function GeneralAccessSection({
  general,
  canManage,
  onChange,
  label = "map",
}: {
  general: GA;
  canManage: boolean;
  onChange: (g: GA) => void;
  /** Noun for the shared entity ("map" | "project") — used in helper text. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isLink = general.type === "link";

  return (
    <div className="px-4 pb-2">
      <div className="text-[0.8rem] font-semibold text-text-primary mb-2">
        General access
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isLink
              ? "bg-success/15 text-success"
              : "bg-surface-hover text-text-secondary"
          }`}
        >
          {isLink ? <Globe size={16} /> : <Lock size={16} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative inline-block" ref={ref}>
            <button
              type="button"
              disabled={!canManage}
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 -ml-2 rounded-lg text-[0.82rem] font-medium transition-colors ${
                canManage
                  ? "text-text-primary hover:bg-surface-hover"
                  : "text-text-secondary cursor-default"
              }`}
            >
              {isLink ? "Anyone with the link" : "Restricted"}
              {canManage && (
                <ChevronDown size={13} className={open ? "rotate-180" : ""} />
              )}
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-elevated border border-border-primary rounded-xl shadow-2xl py-1.5 z-[80] animate-fade-in">
                {(["restricted", "link"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onChange({ ...general, type: t });
                      setOpen(false);
                    }}
                    className="flex items-start gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                  >
                    <span className="w-4 shrink-0 pt-0.5">
                      {general.type === t && (
                        <Check size={14} className="text-primary" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[0.8rem] font-medium text-text-primary">
                        {t === "restricted"
                          ? "Restricted"
                          : "Anyone with the link"}
                      </span>
                      <span className="block text-[0.68rem] text-text-tertiary leading-snug">
                        {t === "restricted"
                          ? `Only people with access can open this ${label}`
                          : "Anyone on the internet with the link can open"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-[0.7rem] text-text-tertiary mt-0.5 px-0">
            {isLink
              ? `Anyone on the internet with the link can ${
                  general.role === "viewer"
                    ? "view"
                    : general.role === "commenter"
                      ? "comment"
                      : "edit"
                }`
              : `Only people with access can open this ${label}`}
          </div>
        </div>

        {isLink && (
          <RoleSelect
            value={general.role}
            onChange={(r) => onChange({ ...general, role: r as LinkRole })}
            disabled={!canManage}
          />
        )}
      </div>
    </div>
  );
}
