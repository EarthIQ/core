import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "./Avatar";
import { shareApi } from "./shareApi";
import { EMAIL_RE, type AccessEntry } from "./types";

interface EmailChipsInputProps {
  chips: string[];
  onChange: (chips: string[]) => void;
  existingEmails: string[];
  autoFocus?: boolean;
  onFocus?: () => void;
  /** Pass the current entity id so the API can exclude already-added users. */
  entityId?: string;
}

export const EmailChipsInput = ({
  chips,
  onChange,
  existingEmails,
  autoFocus,
  onFocus,
  entityId,
}: EmailChipsInputProps) => {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<AccessEntry[]>([]);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draft.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      shareApi.searchPeople(draft, entityId).then((res) => {
        if (cancelled) return;
        setSuggestions(
          res.filter(
            (r) => !chips.includes(r.email) && !existingEmails.includes(r.email)
          )
        );
        setHighlight(0);
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft, chips, existingEmails, entityId]);

  function commit(raw: string) {
    const email = raw.trim().replace(/[,;]$/, "");
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setInvalid(email);
      return;
    }
    if (existingEmails.includes(email)) {
      setInvalid(`${email} already has access`);
      return;
    }
    if (chips.includes(email)) return;
    onChange([...chips, email]);
    setDraft("");
    setInvalid(null);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      suggestions.length > 0 &&
      (e.key === "ArrowDown" || e.key === "ArrowUp")
    ) {
      e.preventDefault();
      setHighlight((h) =>
        e.key === "ArrowDown"
          ? (h + 1) % suggestions.length
          : (h - 1 + suggestions.length) % suggestions.length
      );
      return;
    }
    if (["Enter", ",", ";", " ", "Tab"].includes(e.key)) {
      if (e.key === " " && !draft.trim()) return;
      if (suggestions.length > 0 && e.key === "Enter") {
        e.preventDefault();
        commit(suggestions[highlight].email);
        return;
      }
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && chips.length > 0) {
      onChange(chips.slice(0, -1));
    }
  }

  return (
    <div className="relative">
      <div
        className={`bg-surface-hover/40 flex min-h-[44px] cursor-text flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
          invalid
            ? "border-red-400/60"
            : "border-border-secondary focus-within:border-primary/60"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((email) => (
          <span
            key={email}
            className="bg-primary/10 border-primary/25 flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-1"
          >
            <Avatar
              email={email}
              size={18}
            />
            <span className="text-text-primary max-w-[160px] truncate text-[0.72rem]">
              {email}
            </span>
            <button
              className="text-text-tertiary transition-colors hover:text-red-400"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(chips.filter((c) => c !== email));
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className="text-text-primary placeholder:text-text-quaternary min-w-[160px] flex-1 border-none bg-transparent py-0.5 text-[0.8rem] outline-none"
          value={draft}
          placeholder={
            chips.length === 0 ? "Add people, groups, or email addresses" : ""
          }
          onBlur={() => draft.trim() && commit(draft)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(null);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\s]/.test(text)) {
              e.preventDefault();
              text
                .split(/[,;\s]+/)
                .filter(Boolean)
                .forEach(commit);
            }
          }}
        />
      </div>

      {invalid ? (
        <div className="mt-1 text-[0.7rem] text-red-400">
          {invalid.includes("@") && !invalid.includes("already")
            ? `"${invalid}" is not a valid email address`
            : invalid}
        </div>
      ) : null}

      {suggestions.length > 0 && (
        <div className="bg-elevated border-border-primary animate-fade-in absolute top-full right-0 left-0 z-[70] mt-1 max-h-56 scrollbar-thin overflow-y-auto rounded-xl border py-1 shadow-2xl">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                i === highlight ? "bg-surface-hover" : ""
              }`}
              onClick={() => commit(s.email)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
            >
              <Avatar
                email={s.email}
                name={s.name}
                size={28}
              />
              <span className="min-w-0">
                <span className="text-text-primary block truncate text-[0.78rem]">
                  {s.name ?? s.email}
                </span>
                {s.name ? (
                  <span className="text-text-tertiary block truncate text-[0.68rem]">
                    {s.email}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
