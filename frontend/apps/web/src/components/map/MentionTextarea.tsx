/**
 * MentionTextarea - a small rich input that turns a picked user into a real
 * colored "pill" (no "@") at the caret, with an @-user picker.
 *
 * How it works
 *  • The editable surface is a `contentEditable` div (the DOM is the source of
 *    truth). The controlled `value` is only used to clear on an external reset
 *    (e.g. after posting) - we never write plain text back into the DOM, which
 *    would destroy the pills.
 *  • Typing `@word` opens a picker (core `GET /api/v1/people`). Picking a user
 *    removes the `@word` and inserts an atomic pill (`contenteditable=false`),
 *    so a single Backspace deletes it again.
 *  • The picker is rendered in a portal (document.body) at a high z-index and
 *    anchored just below the editor, so it is never clipped by the comment
 *    card's `overflow-hidden`.
 *  • On submit (Enter, no Shift, picker closed) we serialize the DOM to plain
 *    text where each pill becomes `@Name`, and the parent reads that value.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  searchPeople,
  type PeopleSearchResult,
} from "@/lib/notifications";

const MAX_SUGGESTIONS = 6;
const DD_W = 248;

/** Inline style for a mention pill, applied to the DOM node we create. */
function pillStyle(): Record<string, string> {
  return {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    borderRadius: "9999px",
    background: "color-mix(in oklab, var(--primary) 16%, transparent)",
    color: "var(--primary)",
    border: "1px solid color-mix(in oklab, var(--primary) 28%, transparent)",
    padding: "1px 8px",
    margin: "0 2px",
    fontSize: "12px",
    fontWeight: "500",
    lineHeight: "18px",
    whiteSpace: "nowrap",
    userSelect: "none",
  };
}

function displayName(u: PeopleSearchResult) {
  return u.name?.trim() || u.email;
}

function initialsOf(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Trigger {
  start: number; // index of the "@" character
  query: string; // text between "@" and the caret
}

function textBeforeCaret(editor: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const range = sel.getRangeAt(0).cloneRange();
  const pre = document.createRange();
  pre.selectNodeContents(editor);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString();
}

/** Find the {node,offset} DOM point at a given *text* index within the editor. */
function pointAt(
  editor: HTMLElement,
  index: number,
): { node: Node; offset: number } {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let remaining = index;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
    node = walker.nextNode();
  }
  return { node: editor, offset: editor.childNodes.length };
}

function findTrigger(pre: string): Trigger | null {
  const idx = pre.lastIndexOf("@");
  if (idx === -1) return null;
  if (idx > 0 && !/\s/.test(pre[idx - 1])) return null; // must follow whitespace
  const query = pre.slice(idx + 1);
  if (
    query.includes("\n") ||
    query.includes("@") ||
    query.length > 40 ||
    /\s$/.test(query)
  )
    return null;
  return { start: idx, query };
}

/** Serialize the editor DOM to plain text (each mention pill → `@Name`). */
function serialize(editor: HTMLElement): string {
  const walk = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? "";
    if (n.nodeType !== Node.ELEMENT_NODE) return "";
    const el = n as HTMLElement;
    if (el.dataset.mentionId) return `@${el.textContent ?? ""}`;
    let s = "";
    n.childNodes.forEach((c) => (s += walk(c)));
    if (el.tagName === "BR") s += "\n";
    else if (/^(DIV|P|LI)$/.test(el.tagName)) s += "\n";
    return s;
  };
  let out = "";
  editor.childNodes.forEach((c) => (out += walk(c)));
  return out
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ ?\n ?/g, "\n")
    .trimEnd();
}

function editorHasText(editor: HTMLElement): boolean {
  return (
    !!editor.textContent?.trim() || !!editor.querySelector("[data-mention-id]")
  );
}

interface MentionTextareaProps {
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  /** Kept in sync with the serialized plain text (pill → `@Name`). */
  onTextChange?: (text: string) => void;
  /** Fired each time a user pill is inserted. */
  onMention?: (user: PeopleSearchResult) => void;
  /** Enter (no Shift) while the picker is closed. */
  onSubmit?: () => void;
}

export function MentionTextarea({
  placeholder,
  rows = 3,
  className,
  autoFocus,
  onTextChange,
  onMention,
  onSubmit,
}: MentionTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PeopleSearchResult[]>([]);
  const [hi, setHi] = useState(0);
  const [ddPos, setDdPos] = useState<{ left: number; top: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const seq = useRef(0);
  const triggerRef = useRef<Trigger | null>(null);

  // Keep latest callbacks accessible inside DOM handlers without stale closures.
  const onTextChangeRef = useRef(onTextChange);
  const onMentionRef = useRef(onMention);
  const onSubmitRef = useRef(onSubmit);
  onTextChangeRef.current = onTextChange;
  onMentionRef.current = onMention;
  onSubmitRef.current = onSubmit;

  const pushText = useCallback((editor: HTMLElement) => {
    onTextChangeRef.current?.(serialize(editor));
    setIsEmpty(!editorHasText(editor));
  }, []);

  const closePicker = useCallback(() => {
    setOpen(false);
    setResults([]);
    triggerRef.current = null;
  }, []);

  const updateTrigger = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!editor.contains(sel.anchorNode)) return;

    const trig = findTrigger(textBeforeCaret(editor));
    triggerRef.current = trig;
    if (!trig) {
      closePicker();
      return;
    }
    setQuery(trig.query);
    setHi(0);

    // Anchor the dropdown just below the editor, near the caret (or the left
    // edge as a fallback), clamped to the viewport.
    const r = editor.getBoundingClientRect();
    let left = r.left;
    try {
      const cr = sel.getRangeAt(0).getBoundingClientRect();
      if (cr && cr.height > 0) left = cr.left;
    } catch {
      /* fall back to the editor's left edge */
    }
    setDdPos({
      left: Math.max(8, Math.min(left, window.innerWidth - DD_W - 8)),
      top: r.bottom + 6,
    });
    setOpen(true);
  }, [closePicker]);

  /* autoFocus */
  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  /* Debounced people search while the trigger is alive. */
  useEffect(() => {
    if (!open) {
      setResults([]);
      return;
    }
    if (!query) {
      setResults([]); // "type to search" hint - /people needs a non-empty q
      return;
    }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const users = await searchPeople(query);
        if (seq.current === my) {
          setResults(users.slice(0, MAX_SUGGESTIONS));
          setHi(0);
        }
      } catch {
        if (seq.current === my) setResults([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [open, query]);

  /* Close the (portaled) picker on outside interaction. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (editorRef.current?.contains(t) || ddRef.current?.contains(t)) return;
      closePicker();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, closePicker]);

  function pick(user: PeopleSearchResult) {
    const editor = editorRef.current;
    const trig = triggerRef.current;
    if (!editor || !trig) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const caret = sel.getRangeAt(0);

    // Remove the "@query" fragment ...
    const from = pointAt(editor, trig.start);
    const del = document.createRange();
    del.setStart(from.node, from.offset);
    del.setEnd(caret.startContainer, caret.startOffset);
    del.deleteContents();

    // ... and insert the atomic pill (contenteditable=false ⇒ one Backspace
    // deletes it whole) plus a trailing space.
    const pill = document.createElement("span");
    pill.contentEditable = "false";
    pill.setAttribute("data-mention-id", user.id);
    pill.textContent = displayName(user);
    Object.assign(pill.style, pillStyle());

    const space = document.createTextNode(" ");
    const ins = document.createRange();
    ins.setStart(caret.startContainer, caret.startOffset);
    ins.insertNode(space);
    ins.insertNode(pill); // pill ends up before the space
    ins.setStartAfter(space);
    ins.collapse(true);
    sel.removeAllRanges();
    sel.addRange(ins);

    closePicker();
    pushText(editor);
    onMentionRef.current?.(user);
    editorRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (open) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // don't let the page-level Esc cancel the composer
        closePicker();
        return;
      }
      if (results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          setHi((h) => (h + 1) % results.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          setHi((h) => (h - 1 + results.length) % results.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          e.stopPropagation();
          pick(results[hi]);
          return;
        }
      }
      // Picker open with no matches: Enter/Tab dismisses the picker.
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        closePicker();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmitRef.current?.();
    }
  }

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        onInput={(e) => {
          pushText(e.currentTarget);
          updateTrigger();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={updateTrigger}
        onClick={updateTrigger}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        style={{ minHeight: `${Math.max(rows, 2) * 20 + 16}px` }}
        className={`${className ?? ""} cursor-text text-text-primary whitespace-pre-wrap break-words leading-[1.55] focus:outline-none`}
      />

      {isEmpty && placeholder && (
        <span
          aria-hidden
          className="absolute pointer-events-none select-none text-[13px]"
          style={{
            left: 12,
            top: 9,
            lineHeight: "1.55",
            color: "var(--input-placeholder, var(--text-tertiary))",
          }}
        >
          {placeholder}
        </span>
      )}

      {open &&
        ddPos &&
        createPortal(
          <div
            ref={ddRef}
            role="listbox"
            aria-label="Mention a user"
            className="fixed z-[999] rounded-xl bg-elevated border border-border-primary shadow-xl overflow-hidden animate-fade-in"
            style={{ left: ddPos.left, top: ddPos.top, width: DD_W }}
          >
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
              Mention a user
            </div>
            {!query ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">
                Type to search users…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">
                No users match “{query}”
              </div>
            ) : (
              <ul className="max-h-52 overflow-y-auto">
                {results.map((u, i) => (
                  <li key={u.id} role="option" aria-selected={i === hi}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep editor focus
                        setHi(i);
                      }}
                      onMouseEnter={() => setHi(i)}
                      onClick={() => pick(u)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors ${
                        i === hi ? "bg-primary/10" : ""
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 select-none">
                        {initialsOf(displayName(u))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-text-primary truncate">
                          {displayName(u)}
                        </span>
                        <span className="block text-[11px] text-text-tertiary truncate">
                          {u.email}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default MentionTextarea;