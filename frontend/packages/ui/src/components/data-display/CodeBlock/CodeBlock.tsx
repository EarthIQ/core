import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import { useCopyToClipboard } from "../../../hooks/useCopyToClipboard";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  title?: string;
  showCopy?: boolean;
  maxHeight?: string | number;
  className?: string;
}

export function CodeBlock({
  code,
  language = "plaintext",
  showLineNumbers = true,
  highlightLines = [],
  title,
  showCopy = true,
  maxHeight,
  className,
}: CodeBlockProps) {
  const { copy } = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  const lines = code.split("\n");

  const handleCopy = async () => {
    await copy(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{
        backgroundColor: "var(--bg-tertiary)",
        border: "1px solid var(--border-primary)",
      }}
    >
      {/* Header */}
      {(title || language || showCopy) && (
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: "1px solid var(--border-primary)",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Window Buttons */}
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: "var(--error)" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: "var(--warning)" }}
              />
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: "var(--success)" }}
              />
            </div>

            {title && (
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {language && (
              <span
                className="text-xs font-medium uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                {language}
              </span>
            )}

            {showCopy && (
              <button
                type="button"
                onClick={handleCopy}
                className="cursor-pointer rounded-md p-1.5 transition-all duration-200 focus:outline-none"
                style={{
                  color: isCopied ? "var(--success)" : "var(--text-secondary)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                title={isCopied ? "Copied!" : "Copy to clipboard"}
              >
                <AnimatePresence mode="wait">
                  {isCopied ? (
                    <motion.svg
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    <motion.svg
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Content */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <pre className="p-4 text-sm">
          <code>
            {lines.map((line, index) => (
              <div
                key={index}
                className="flex"
                style={
                  highlightLines.includes(index + 1)
                    ? {
                        backgroundColor: "var(--info-bg)",
                        borderLeft: "2px solid var(--primary)",
                        marginLeft: "-1rem",
                        marginRight: "-1rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                      }
                    : undefined
                }
              >
                {showLineNumbers && (
                  <span
                    className="w-8 flex-shrink-0 pr-4 text-right select-none"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {index + 1}
                  </span>
                )}
                <span
                  className="flex-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {line || " "}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Simple Copy Button ───────────────────────────────────────────────────────

interface CopyButtonProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

export function CopyButton({ text, className, children }: CopyButtonProps) {
  const { copy } = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await copy(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium",
        "cursor-pointer rounded-md transition-all duration-200 focus:outline-none",
        className
      )}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border-primary)",
        color: isCopied ? "var(--success)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-hover)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border-primary)";
      }}
    >
      {children || text}

      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.svg
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
