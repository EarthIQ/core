import { Check, ChevronDown, UserMinus, Crown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ASSIGNABLE_ROLES, ROLE_META, type Role } from "./types";

interface RoleSelectProps {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Adds "Transfer ownership" / "Remove access" items (people rows only). */
  onRemove?: () => void;
  onTransferOwnership?: () => void;
  align?: "left" | "right";
}

export const RoleSelect = ({
  value,
  onChange,
  disabled,
  compact,
  onRemove,
  onTransferOwnership,
  align = "right",
}: RoleSelectProps) => {
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

  const isOwner = value === "owner";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        disabled={disabled || isOwner}
        type="button"
        className={`flex items-center gap-1 rounded-lg transition-colors ${
          compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-[0.8rem]"
        } ${
          disabled || isOwner
            ? "text-text-tertiary cursor-default"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="whitespace-nowrap">{ROLE_META[value].label}</span>
        {!isOwner && !disabled && (
          <ChevronDown
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            size={13}
          />
        )}
      </button>

      {open ? <div
          className={`absolute top-full mt-1 w-64 bg-elevated border border-border-primary rounded-xl shadow-2xl py-1.5 z-[80] animate-fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <button
              key={role}
              className="flex items-start gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors"
              type="button"
              onClick={() => {
                onChange(role);
                setOpen(false);
              }}
            >
              <span className="w-4 shrink-0 pt-0.5">
                {value === role && <Check className="text-primary" size={14} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[0.8rem] font-medium text-text-primary">
                  {ROLE_META[role].label}
                </span>
                <span className="block text-[0.68rem] text-text-tertiary leading-snug">
                  {ROLE_META[role].description}
                </span>
              </span>
            </button>
          ))}

          {(onTransferOwnership || onRemove) ? <div className="h-px bg-border-secondary mx-2 my-1" /> : null}

          {onTransferOwnership ? <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors"
              type="button"
              onClick={() => {
                onTransferOwnership();
                setOpen(false);
              }}
            >
              <span className="w-4 shrink-0">
                <Crown className="text-warning" size={14} />
              </span>
              <span className="text-[0.8rem] text-text-primary">
                Transfer ownership
              </span>
            </button> : null}

          {onRemove ? <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors"
              type="button"
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
            >
              <span className="w-4 shrink-0">
                <UserMinus size={14} />
              </span>
              <span className="text-[0.8rem]">Remove access</span>
            </button> : null}
        </div> : null}
    </div>
  );
}
