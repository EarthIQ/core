import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { Button } from "@packages/ui";
import {
  aiChat,
  dispatchToolCall,
  listAITools,
  type AITool,
  type AIToolCall,
  type MapHandle,
  type ToolDispatchContext,
} from "@/lib/ai";
import { BASEMAP_STYLES } from "@/hooks/useMapLibre";

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
  mapReady,
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
        "Hi! Ask me to navigate, zoom, switch basemaps, or show/hide layers — " +
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
    toolName?: string,
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
    [mapRef, setBasemap, setLayerVisible],
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
            tc.name,
          );
        } catch (err) {
          const msg =
            err instanceof Error && err.message ? err.message : "Tool failed.";
          pushMessage(
            "ai",
            `Couldn't run that tool — ${msg}`,
            "error",
            tc.name,
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
      pushMessage("ai", `I couldn't do that — ${msg}`, "error");
    } finally {
      setBusy(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div
      className={`h-full flex flex-col bg-surface border-r border-border-primary transition-all duration-300 ease-in-out shrink-0 overflow-hidden relative z-20 ${
        isOpen
          ? "w-[360px] opacity-100"
          : "w-0 opacity-0 pointer-events-none border-r-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border-secondary bg-surface-hover/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-primary">
              EarthIQ AI
            </span>
            <span className="text-[10px] text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          onClick={onClose}
          aria-label="Close AI panel"
          className="text-text-secondary hover:text-text-primary"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${
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
              className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-primary text-text-on-primary rounded-tr-none"
                  : msg.tone === "error"
                    ? "bg-danger/10 text-danger border border-danger/20 rounded-tl-none"
                    : msg.tone === "info"
                      ? "bg-surface-hover/60 text-text-tertiary border border-border-secondary rounded-tl-none"
                      : "bg-surface-hover/80 text-text-secondary border border-border-secondary rounded-tl-none"
              }`}
            >
              {msg.toolName && (
                <span className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  <MapPin size={10} /> {msg.toolName}
                </span>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[11px] text-text-quaternary self-start">
            <Loader2 size={13} className="animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips (only before the user has acted) */}
      {messages.length === 1 && !busy && (
        <div className="px-4 py-2 flex flex-col gap-2 shrink-0 bg-surface">
          <span className="text-[10px] text-text-quaternary font-bold uppercase tracking-wider">
            Try asking
          </span>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="text-left text-[11px] text-text-secondary hover:text-primary hover:border-primary/40 px-3 py-2 rounded-lg border border-border-primary bg-surface-hover/20 transition-all cursor-pointer truncate"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border-secondary bg-surface shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(inputValue);
          }}
          className="relative flex items-center bg-surface-hover/40 border border-border-secondary rounded-xl p-1.5 focus-within:border-primary/50 transition-colors"
        >
          <input
            type="text"
            placeholder="Ask AI to navigate, switch basemaps, or explain the data…"
            className="input input-sm border-none bg-transparent w-full p-2 text-xs focus:ring-0 focus:outline-none placeholder:text-text-quaternary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={busy}
          />
          <Button
            type="submit"
            variant="primary"
            size="xs"
            iconOnly
            disabled={!inputValue.trim() || busy}
            className="shrink-0 rounded-lg"
            aria-label="Send"
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}
