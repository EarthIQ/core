import { Button } from "@packages/ui";
import {
  Send,
  X,
  Bot,
  User,
  Sparkles,
  Loader2,
  Wrench,
  MapPin,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import {
  aiChat,
  dispatchToolCall,
  listAITools,
  type AITool,
  type AIToolCall,
  type MapHandle,
  type ToolDispatchContext,
} from "@/lib/ai";

/* ── Message types ─────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  tone?: "ok" | "error" | "info";
  /** True when this AI message is the result of a tool being executed. */
  toolName?: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mapRef: React.RefObject<any>;
  mapReady: boolean;
  /** Current basemap id (e.g. "opentopomap"). */
  basemap: string;
  /** Switch the basemap (MapPage re-renders the map style). */
  setBasemap: (id: string) => void;
  /** Toggle a layer's visibility in the layer tree. */
  setLayerVisible: (id: string, visible: boolean) => void;
  /** The map's layers (id/name/type/visible) for the AI context. */
  layers?: { id: string; name: string; type?: string; visible: boolean }[];
}

const SUGGESTIONS = [
  "Zoom to Rotterdam",
  "Fit the Rhine delta in view",
  "Switch to the satellite basemap",
  "List the layers on my map",
];

const CHAT_PROMPT =
  "You are the EarthIQ AI map assistant, embedded in an environmental GIS platform. " +
  "You can answer questions about the active basemap, layers, and the loaded data using " +
  "the map state provided, AND you can act on the user's live map by calling one of the " +
  "available tools when the user asks you to do something. " +
  "Be concise, technically accurate and actionable. If a value is missing, say so.";

let _id = 0;
const nextId = () => `ai-msg-${++_id}-${Date.now()}`;

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function AIChatPanel({
  isOpen,
  onClose,
  mapRef,
  _mapReady,
  basemap,
  setBasemap,
  setLayerVisible,
  layers = [],
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text:
        "Hi! Ask me to navigate, zoom, switch basemaps, or show/hide layers - " +
        "or just ask a question about your data. I'll get it done.",
      tone: "info",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [tools, setTools] = useState<AITool[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load the tool list once when the panel opens.
  useEffect(() => {
    if (!isOpen) return;
    listAITools()
      .then(setTools)
      .catch(() => setTools([]));
  }, [isOpen]);

  const pushMessage = (
    sender: Message["sender"],
    text: string,
    tone?: Message["tone"],
    toolName?: string
  ) =>
    setMessages((prev) => [
      ...prev,
      { id: nextId(), sender, text, tone, toolName, timestamp: new Date() },
    ]);

  /* ── Build the context.data block the server needs ───────────────────────── */

  const buildContext = useCallback(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const c = map.getCenter?.();
    const z = typeof map.getZoom?.() === "number" ? map.getZoom() : 5;
    return {
      data: {
        center: c ? [c.lng, c.lat] : [0, 20],
        zoom: z,
        basemap,
        layers: Array.isArray(layers) ? layers : [],
      },
    };
  }, [mapRef, basemap, layers]);

  /* ── Dispatch a front-end tool call against the live map ────────────────── */

  const dispatchCall = useCallback(
    async (call: AIToolCall): Promise<string> => {
      const map: MapHandle = mapRef.current as MapHandle;
      const ctx: ToolDispatchContext = {
        map,
        setBasemap,
        setLayerVisible,
        basemapStyles: BASEMAP_STYLES,
      };
      return dispatchToolCall(call, ctx);
    },
    [mapRef, setBasemap, setLayerVisible]
  );

  /* ── Main send handler ───────────────────────────────────────────────────── */

  const handleSubmit = async (text: string) => {
    if (!text.trim() || busy) return;

    pushMessage("user", text.trim());
    setInputValue("");
    setBusy(true);

    try {
      const toolNames = tools.map((t) => t.name);
      const resp = await aiChat({
        system_prompt: CHAT_PROMPT,
        messages: [{ role: "user", content: text.trim() }],
        context: buildContext(),
        tools: toolNames,
        execute_tools: true, // let the server run server tools (get_map_summary etc.)
        sampling: { temperature: 0.3, max_tokens: 500 },
        metadata: { section: "map/assistant" },
      });

      const parts: string[] = [];

      // 1) Server-executed tool result is already folded into resp.content.
      if (resp.content && resp.content.trim()) {
        parts.push(resp.content.trim());
      }

      // 2) Front-end tool call → dispatch it here.
      if (resp.tool_call) {
        const tc = resp.tool_call;
        try {
          const confirmation = await dispatchCall(tc);
          if (confirmation) parts.push(confirmation);
          pushMessage(
            "ai",
            parts.join("\n\n") || `Executed **${tc.name}**.`,
            "ok",
            tc.name
          );
        } catch (err) {
          const msg =
            err instanceof Error && err.message ? err.message : "Tool failed.";
          pushMessage(
            "ai",
            `Couldn't run that tool - ${msg}`,
            "error",
            tc.name
          );
        }
        return; // already pushed the message above
      }

      // 3) Plain text reply (no tool call).
      pushMessage("ai", resp.content?.trim() || "…", "ok");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "The AI service is unavailable right now.";
      pushMessage("ai", `I couldn't do that - ${msg}`, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div
      className={`bg-surface border-border-primary relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r transition-all duration-300 ease-in-out ${
        isOpen
          ? "w-[360px] opacity-100"
          : "pointer-events-none w-0 border-r-0 opacity-0"
      }`}
    >
      {/* Header */}
      <div className="border-border-secondary bg-surface-hover/30 flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary border-primary/20 flex h-8 w-8 items-center justify-center rounded-lg border">
            <Sparkles
              className="animate-pulse"
              size={16}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-text-primary text-xs font-bold">
              EarthIQ AI
            </span>
            <span className="text-success flex items-center gap-1 text-[10px] font-medium">
              <span className="bg-success h-1.5 w-1.5 rounded-full" /> Online
            </span>
          </div>
        </div>
        <Button
          iconOnly
          aria-label="Close AI panel"
          className="text-text-secondary hover:text-text-primary"
          size="xs"
          variant="ghost"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 scrollbar-thin flex-col gap-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex max-w-[85%] gap-3 ${
              msg.sender === "user" ? "flex-row-reverse self-end" : "self-start"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                msg.sender === "user"
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-surface-hover border-border-primary text-text-secondary"
              }`}
            >
              {msg.sender === "user" ? (
                <User size={14} />
              ) : msg.toolName ? (
                <Wrench size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
            <div
              className={`rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-primary text-text-on-primary rounded-tr-none"
                  : msg.tone === "error"
                    ? "bg-danger/10 text-danger border-danger/20 rounded-tl-none border"
                    : msg.tone === "info"
                      ? "bg-surface-hover/60 text-text-tertiary border-border-secondary rounded-tl-none border"
                      : "bg-surface-hover/80 text-text-secondary border-border-secondary rounded-tl-none border"
              }`}
            >
              {msg.toolName ? (
                <span className="text-primary mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                  <MapPin size={10} /> {msg.toolName}
                </span>
              ) : null}
              {msg.text}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="text-text-quaternary flex items-center gap-2 self-start text-[11px]">
            <Loader2
              className="animate-spin"
              size={13}
            />
            Thinking…
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips (only before the user has acted) */}
      {messages.length === 1 && !busy && (
        <div className="bg-surface flex shrink-0 flex-col gap-2 px-4 py-2">
          <span className="text-text-quaternary text-[10px] font-bold tracking-wider uppercase">
            Try asking
          </span>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="text-text-secondary hover:text-primary hover:border-primary/40 border-border-primary bg-surface-hover/20 cursor-pointer truncate rounded-lg border px-3 py-2 text-left text-[11px] transition-all"
                onClick={() => handleSubmit(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-border-secondary bg-surface shrink-0 border-t p-4">
        <form
          className="bg-surface-hover/40 border-border-secondary focus-within:border-primary/50 relative flex items-center rounded-xl border p-1.5 transition-colors"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(inputValue);
          }}
        >
          <input
            className="input input-sm placeholder:text-text-quaternary w-full border-none bg-transparent p-2 text-xs focus:ring-0 focus:outline-none"
            disabled={busy}
            placeholder="Ask AI to navigate, switch basemaps, or explain the data…"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button
            iconOnly
            aria-label="Send"
            className="shrink-0 rounded-lg"
            disabled={!inputValue.trim() || busy}
            size="xs"
            type="submit"
            variant="primary"
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}
