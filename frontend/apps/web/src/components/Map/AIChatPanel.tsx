import React, { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@packages/ui";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Find environmental changes",
  "Analyse soil hydrology",
  "Show NDVI variations in 2024",
];

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your EarthIQ AI Assistant. How can I help you analyze the map data today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: `Analyzing: "${text}". I am currently running geospatial queries on the loaded map layers. Let me know if you would like me to toggle any specific layers.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <div
      className={`h-full flex flex-col bg-surface border-r border-border-primary transition-all duration-300 ease-in-out shrink-0 overflow-hidden relative z-20 ${
        isOpen ? "w-[360px] opacity-100" : "w-0 opacity-0 pointer-events-none border-r-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border-secondary bg-surface-hover/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text-primary">EarthIQ AI</span>
            <span className="text-[10px] text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" /> Online
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          onClick={onClose}
          aria-label="Close chat panel"
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
              {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-text-on-primary rounded-tr-none"
                  : "bg-surface-hover/80 text-text-secondary border border-border-secondary rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div className="px-4 py-2 flex flex-col gap-2 shrink-0 bg-surface">
          <span className="text-[10px] text-text-quaternary font-bold uppercase tracking-wider">Suggestions</span>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
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
            handleSend(inputValue);
          }}
          className="relative flex items-center bg-surface-hover/40 border border-border-secondary rounded-xl p-1.5 focus-within:border-primary/50 transition-colors"
        >
          <input
            type="text"
            placeholder="Ask AI about map analysis..."
            className="input input-sm border-none bg-transparent w-full p-2 text-xs focus:ring-0 focus:outline-none placeholder:text-text-quaternary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="xs"
            iconOnly
            disabled={!inputValue.trim()}
            className="shrink-0 rounded-lg"
          >
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}
