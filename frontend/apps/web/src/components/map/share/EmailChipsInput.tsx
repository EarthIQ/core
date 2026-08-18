import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { shareApi } from "./shareApi";
import { EMAIL_RE, type AccessEntry } from "./types";
import { Avatar } from "./Avatar";

interface EmailChipsInputProps {
  chips: string[];
  onChange: (chips: string[]) => void;
  existingEmails: string[];
  autoFocus?: boolean;
  onFocus?: () => void;
  /** Pass the current mapId so the API can exclude already-added users. */
  mapId?: string;
}

export function EmailChipsInput({
  chips,
  onChange,
  existingEmails,
  autoFocus,
  onFocus,
  mapId,
}: EmailChipsInputProps) {
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
      shareApi.searchPeople(draft, mapId).then((res) => {
        if (cancelled) return;
        setSuggestions(
          res.filter(
            (r) =>
              !chips.includes(r.email) && !existingEmails.includes(r.email),
          ),
        );
        setHighlight(0);
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft, chips, existingEmails, mapId]);

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
          : (h - 1 + suggestions.length) % suggestions.length,
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
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border bg-surface-hover/40 cursor-text transition-colors ${
          invalid
            ? "border-red-400/60"
            : "border-border-secondary focus-within:border-primary/60"
        }`}
      >
        {chips.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full bg-primary/10 border border-primary/25"
          >
            <Avatar email={email} size={18} />
            <span className="text-[0.72rem] text-text-primary max-w-[160px] truncate">
              {email}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(chips.filter((c) => c !== email));
              }}
              className="text-text-tertiary hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={draft}
          onFocus={onFocus}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
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
          placeholder={
            chips.length === 0 ? "Add people, groups, or email addresses" : ""
          }
          className="flex-1 min-w-[160px] bg-transparent border-none outline-none text-[0.8rem] text-text-primary placeholder:text-text-quaternary py-0.5"
        />
      </div>

      {invalid && (
        <div className="mt-1 text-[0.7rem] text-red-400">
          {invalid.includes("@") && !invalid.includes("already")
            ? `"${invalid}" is not a valid email address`
            : invalid}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-elevated border border-border-primary rounded-xl shadow-2xl py-1 z-[70] max-h-56 overflow-y-auto scrollbar-thin animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s.email)}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors ${
                i === highlight ? "bg-surface-hover" : ""
              }`}
            >
              <Avatar email={s.email} name={s.name} size={28} />
              <span className="min-w-0">
                <span className="block text-[0.78rem] text-text-primary truncate">
                  {s.name ?? s.email}
                </span>
                {s.name && (
                  <span className="block text-[0.68rem] text-text-tertiary truncate">
                    {s.email}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
