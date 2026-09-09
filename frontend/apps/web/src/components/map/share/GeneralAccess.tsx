import { Check, ChevronDown, Globe, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { RoleSelect } from "./RoleSelect";
import {
  ROLE_META as _ROLE_META,
  type GeneralAccess as GA,
  type LinkRole,
} from "./types";

export const GeneralAccessSection = ({
  general,
  canManage,
  onChange,
  label = "map",
}: {
  general: GA;
  canManage: boolean;
  onChange: (g: GA) => void;
  /** Noun for the shared entity ("map" | "project") - used in helper text. */
  label?: string;
}) => {
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
      <div className="text-text-primary mb-2 text-[0.8rem] font-semibold">
        General access
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isLink
              ? "bg-success/15 text-success"
              : "bg-surface-hover text-text-secondary"
          }`}
        >
          {isLink ? <Globe size={16} /> : <Lock size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={ref}
            className="relative inline-block"
          >
            <button
              disabled={!canManage}
              type="button"
              className={`-ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[0.82rem] font-medium transition-colors ${
                canManage
                  ? "text-text-primary hover:bg-surface-hover"
                  : "text-text-secondary cursor-default"
              }`}
              onClick={() => setOpen((v) => !v)}
            >
              {isLink ? "Anyone with the link" : "Restricted"}
              {canManage ? (
                <ChevronDown
                  className={open ? "rotate-180" : ""}
                  size={13}
                />
              ) : null}
            </button>

            {open ? (
              <div className="bg-elevated border-border-primary animate-fade-in absolute top-full left-0 z-[80] mt-1 w-72 rounded-xl border py-1.5 shadow-2xl">
                {(["restricted", "link"] as const).map((t) => (
                  <button
                    key={t}
                    className="hover:bg-surface-hover flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors"
                    type="button"
                    onClick={() => {
                      onChange({ ...general, type: t });
                      setOpen(false);
                    }}
                  >
                    <span className="w-4 shrink-0 pt-0.5">
                      {general.type === t && (
                        <Check
                          className="text-primary"
                          size={14}
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="text-text-primary block text-[0.8rem] font-medium">
                        {t === "restricted"
                          ? "Restricted"
                          : "Anyone with the link"}
                      </span>
                      <span className="text-text-tertiary block text-[0.68rem] leading-snug">
                        {t === "restricted"
                          ? `Only people with access can open this ${label}`
                          : "Anyone on the internet with the link can open"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="text-text-tertiary mt-0.5 px-0 text-[0.7rem]">
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

        {isLink ? (
          <RoleSelect
            disabled={!canManage}
            value={general.role}
            onChange={(r) => onChange({ ...general, role: r as LinkRole })}
          />
        ) : null}
      </div>
    </div>
  );
};
