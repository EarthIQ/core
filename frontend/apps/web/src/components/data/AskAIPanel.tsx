import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  User,
  Circle,
} from "lucide-react";
import { aiChat, getAIConfig, type AIConfig } from "@/lib/ai";
import {
  formatBytes,
  getGeometrySummary,
  type DatasetPreview,
  type GeometrySummary,
} from "@/lib/datasets";
import type { DatasetItem } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * AskAIPanel
 * A compact, dataset-scoped chat. It grounds the model in the dataset's facts,
 * attribute schema (its FEATURES) and geometry profile, then holds a
 * multi-turn conversation through the shared AI harness
 * (POST /api/v1/ai/chat). It degrades gracefully when the provider is not
 * configured or the AI module is absent.
 * ──────────────────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  meta?: { model?: string; provider?: string; latency_ms?: number };
}

let _seq = 0;
function nextId() {
  _seq += 1;
  return `ask-${Date.now()}-${_seq}`;
}

const SYSTEM_PROMPT = [
  "You are EarthIQ's dataset assistant — an expert in geospatial data, GIS, and spatial analysis.",
  "You are answering questions about ONE specific dataset, using the provided dataset facts, attribute schema, sample rows, and geometry profile as your source of truth.",
  "",
  "Guidelines:",
  "- Ground every answer in the provided context. Never invent attributes, values, or geometry that are not present.",
  "- Be concise, practical, and technically accurate for a GIS audience.",
  "- Reason about both FEATURES (attribute fields, sample values, data types, what can be filtered/sorted/queried) and GEOMETRY (shape types point/line/polygon, coordinate reference system, suitability for mapping, styling, spatial joins, and analysis).",
  "- Use short paragraphs and bullet lists. Use **bold** for key terms and `inline code` for field names, CRS codes, and function names.",
  "- If the provided data does not let you answer confidently, say exactly what is missing instead of guessing.",
].join("\n");

function buildFreetext(
  dataset: DatasetItem,
  preview: DatasetPreview | null | undefined,
  geometry: GeometrySummary | null,
): string {
  const fields =
    (preview?.columns?.length ? preview.columns : dataset.attributes) ?? [];
  const lines: string[] = [];
  lines.push(`Dataset: ${dataset.name}`);
  lines.push(`Format: ${dataset.format}`);
  lines.push(`Semantic type: ${dataset.type}`);
  lines.push(`Coordinate reference system: ${dataset.crs || "unknown"}`);
  if (dataset.feature_count != null)
    lines.push(`Feature/row count: ${dataset.feature_count}`);
  if (dataset.tags?.length) lines.push(`Tags: ${dataset.tags.join(", ")}`);
  if (dataset.description) lines.push(`Description: ${dataset.description}`);
  if (dataset.source) lines.push(`Source: ${dataset.source}`);
  lines.push(`File size: ${formatBytes(dataset.file_size_bytes)}`);
  if (geometry) {
    const profile = Object.entries(geometry.counts ?? {})
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    lines.push(
      `Geometry profile: dominant=${geometry.dominant ?? "unknown"}; counts=[${profile || "none"}]; total=${geometry.total}`,
    );
  }
  if (fields.length) {
    lines.push(`Attribute schema (${fields.length} field(s)):`);
    for (const f of fields) {
      lines.push(
        `  - ${f.field} : ${f.type || "unknown"}${f.sample ? ` (e.g. ${f.sample})` : ""}`,
      );
    }
  }
  if (preview?.rows?.length) {
    lines.push(`Sample rows (first ${Math.min(preview.rows.length, 5)}):`);
    lines.push(JSON.stringify(preview.rows.slice(0, 5), null, 2));
  }
  return lines.join("\n");
}

function buildData(
  dataset: DatasetItem,
  preview: DatasetPreview | null | undefined,
  geometry: GeometrySummary | null,
): Record<string, unknown> {
  const fields =
    (preview?.columns?.length ? preview.columns : dataset.attributes) ?? [];
  return {
    id: dataset.id,
    name: dataset.name,
    format: dataset.format,
    type: dataset.type,
    crs: dataset.crs,
    feature_count: dataset.feature_count,
    tags: dataset.tags,
    description: dataset.description,
    source: dataset.source,
    geometry: geometry
      ? {
          dominant: geometry.dominant,
          counts: geometry.counts,
          total: geometry.total,
        }
      : null,
    schema: fields.map((f) => ({ field: f.field, type: f.type })),
    sample_rows: (preview?.rows ?? []).slice(0, 3).map((r) => r.values),
  };
}

export default function AskAIPanel({
  dataset,
  preview,
  addToast,
  className,
}: {
  dataset: DatasetItem;
  preview?: DatasetPreview | null;
  addToast?: (type: "success" | "error" | "info", message: string) => void;
  className?: string;
}) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [geometry, setGeometry] = useState<GeometrySummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const attributeCount =
    preview?.columns?.length || dataset.attributes?.length || 0;
  const isRaster =
    dataset.type === "raster" || dataset.type === "remote-sensing";

  // Load provider config + geometry profile (both non-fatal).
  useEffect(() => {
    let cancelled = false;
    getAIConfig()
      .then((cfg) => !cancelled && setConfig(cfg))
      .catch(() => {
        /* non-fatal — the harness may still work */
      });
    getGeometrySummary(dataset.id)
      .then((g) => !cancelled && setGeometry(g))
      .catch(() => {
        /* geometry is optional grounding */
      });
    return () => {
      cancelled = true;
    };
  }, [dataset.id]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function autosize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  const suggestions = useMemo(() => {
    const list = [
      "Summarize what this dataset contains and where it likely covers.",
      "Which attributes can I filter, sort, or style the map by?",
      "Suggest a color ramp or symbology that fits this data.",
    ];
    if (!isRaster)
      list.splice(
        1,
        0,
        "What geometry types does it use (points/lines/polygons), and which is dominant?",
      );
    return list;
  }, [isRaster]);

  const canSend = input.trim().length > 0 && !loading;

  const handleSend = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || loading) return;

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
      const history = [...messages, userMsg];
      const wireMessages = history.map((m) => ({ role: m.role, content: m.content }));

      setMessages(history);
      setInput("");
      setSendError(null);
      setLoading(true);
      requestAnimationFrame(autosize);

      try {
        const resp = await aiChat({
          system_prompt: SYSTEM_PROMPT,
          messages: wireMessages,
          context: {
            freetext: buildFreetext(dataset, preview, geometry),
            data: buildData(dataset, preview, geometry),
          },
          sampling: { temperature: 0.4, max_tokens: 700 },
          metadata: { section: `data/preview/${dataset.id}` },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: resp.content || "(no response)",
            meta: {
              model: resp.model,
              provider: resp.provider,
              latency_ms: resp.latency_ms,
            },
          },
        ]);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        let msg =
          (err as { message?: string })?.message ?? "Failed to reach the AI service.";
        if (status === 404) msg = "The AI service isn't available in this deployment.";
        else if (status === 503)
          msg = "AI is not configured yet. Add a provider API key (Admin → AI) to enable this.";
        else if (status === 401) msg = "Your session expired — sign in again to use AI.";
        else if (status === 403)
          msg = "You don't have permission to use AI (needs the 'ai:use' permission).";
        setSendError(msg);
        addToast?.("error", msg);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: msg, error: true },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, dataset, preview, geometry, addToast],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  }

  function copyMessage(id: string, text: string) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(id);
        addToast?.("success", "Answer copied to clipboard.");
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
      },
      () => addToast?.("error", "Couldn't copy to clipboard."),
    );
  }

  function clearChat() {
    setMessages([]);
    setSendError(null);
    setInput("");
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-subtle bg-surface ${className ?? ""}`}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 border-b border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
              Ask about this dataset
            </div>
            <div className="truncate text-xs text-subtle">
              Grounded in its features, schema &amp; geometry
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="btn btn-ghost btn-sm gap-1.5 text-subtle hover:text-error"
              title="Clear conversation"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${
              config?.configured
                ? "border-success/40 bg-success/10 text-success"
                : "border-warning/40 bg-warning/10 text-warning"
            }`}
          >
            <Circle size={8} className="fill-current" />
            {config ? (config.configured ? "Ready" : "Not set up") : "…"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ maxHeight: "44vh", minHeight: "16rem" }}
      >
        {messages.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot size={24} />
            </div>
            <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
              Ask anything about this dataset
            </h4>
            <p className="mb-4 max-w-sm text-xs text-subtle">
              Grounded in <strong className="text-muted">{dataset.name}</strong> — its{" "}
              {dataset.format} features, {attributeCount} attribute
              {attributeCount === 1 ? "" : "s"}, and{" "}
              {isRaster ? "raster" : geometry?.dominant ?? "vector"} geometry.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(s);
                    requestAnimationFrame(() => {
                      autosize();
                      textareaRef.current?.focus();
                    });
                  }}
                  className="rounded-full border border-subtle bg-surface-hover px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                copied={copied === m.id}
                onCopy={() => copyMessage(m.id, m.content)}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2.5 self-start">
                <BotAvatar />
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-subtle bg-elevated px-3.5 py-2.5 text-sm text-subtle">
                  <Loader2 size={14} className="animate-spin text-primary" /> Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-subtle px-3 py-3">
        {sendError && (
          <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{sendError}</span>
            <button
              onClick={() => setSendError(null)}
              className="opacity-70 hover:opacity-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autosize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about this dataset's features or geometry…  (Enter to send, Shift+Enter for a new line)"
            className="input resize-none pl-4 pr-4 leading-relaxed"
            style={{ minHeight: "44px", maxHeight: "140px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            className="btn btn-primary btn-md shrink-0 gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[0.65rem] text-subtle">
          <span>
            {config?.configured
              ? `Powered by ${config.provider} · ${config.model}`
              : "AI harness — provider not yet configured"}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={10} /> Grounded in this dataset
          </span>
        </div>
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
      aria-hidden
    >
      <Bot size={17} strokeWidth={2.2} />
    </div>
  );
}

function MessageBubble({
  message,
  copied,
  onCopy,
}: {
  message: ChatMessage;
  copied: boolean;
  onCopy: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"
          aria-hidden
        >
          <User size={17} strokeWidth={2.2} />
        </div>
      ) : (
        <BotAvatar />
      )}
      <div className="group max-w-[85%]">
        <div
          className={`border px-3.5 py-2.5 text-sm leading-relaxed ${
            message.error
              ? "rounded-md border-error/30 bg-error/10 text-error"
              : isUser
                ? "rounded-2xl rounded-br-md border-primary/25 bg-primary/10 text-[var(--text-primary)]"
                : "rounded-2xl rounded-bl-md border-subtle bg-elevated text-[var(--text-primary)]"
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.error ? message.content : renderContent(message.content)}
          </div>
        </div>
        {!isUser && !message.error && (
          <div className="mt-1 flex items-center gap-2 px-1">
            {message.meta && (
              <span className="text-[0.62rem] text-subtle">
                {[
                  message.meta.model,
                  message.meta.latency_ms ? `${message.meta.latency_ms} ms` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1 text-[0.62rem] text-subtle opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
              title="Copy answer"
            >
              {copied ? (
                <Check size={11} className="text-success" />
              ) : (
                <Copy size={11} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Lightweight markdown: code fences, inline code, and bold. */
function renderContent(content: string) {
  const parts = content.split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const inner = part.replace(/^[a-zA-Z0-9]*\n/, "");
      return (
        <pre
          key={i}
          className="my-2 overflow-x-auto rounded-lg border border-subtle bg-black/25 p-2.5 font-mono text-xs text-[var(--text-primary)]"
        >
          <code>{inner}</code>
        </pre>
      );
    }
    return <InlineText key={i} text={part} />;
  });
}

function InlineText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={k++} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={k++}
          className="rounded border border-subtle bg-black/25 px-1 py-0.5 font-mono text-[0.82em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}