import { motion, AnimatePresence } from "framer-motion";
import React, { useState, type ReactNode } from "react";

import { cn } from "../../../utils/cn";

interface AccordionItem {
  key: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultActiveKeys?: string[];
  activeKeys?: string[];
  onChange?: (keys: string[]) => void;
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion = ({
  items,
  defaultActiveKeys = [],
  activeKeys: controlledActiveKeys,
  onChange,
  allowMultiple = false,
  className,
}: AccordionProps) => {
  const [internalActiveKeys, setInternalActiveKeys] =
    useState<string[]>(defaultActiveKeys);

  const activeKeys = controlledActiveKeys ?? internalActiveKeys;

  const handleToggle = (key: string) => {
    let newKeys: string[];

    if (activeKeys.includes(key)) {
      newKeys = activeKeys.filter((k) => k !== key);
    } else {
      newKeys = allowMultiple ? [...activeKeys, key] : [key];
    }

    if (!controlledActiveKeys) {
      setInternalActiveKeys(newKeys);
    }
    onChange?.(newKeys);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => {
        const isActive = activeKeys.includes(item.key);

        return (
          <div
            key={item.key}
            className={cn(
              "card overflow-hidden",
              item.disabled && "opacity-50"
            )}
          >
            <button
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center justify-between p-4 text-left transition-colors",
                "hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:outline-none",
                item.disabled && "cursor-not-allowed"
              )}
              onClick={() => !item.disabled && handleToggle(item.key)}
            >
              <div className="flex items-center gap-3">
                {item.icon ? <span className="text-[var(--text-secondary)]">
                    {item.icon}
                  </span> : null}
                <span className="font-medium text-[var(--text-primary)]">
                  {item.title}
                </span>
              </div>

              <motion.svg
                animate={{ rotate: isActive ? 180 : 0 }}
                className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]"
                fill="none"
                stroke="currentColor"
                transition={{ duration: 0.2 }}
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 9l-7 7-7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </motion.svg>
            </button>

            <AnimatePresence initial={false}>
              {isActive ? <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <div className="border-t border-[var(--border-secondary)] px-4 pb-4">
                    <div className="pt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {item.content}
                    </div>
                  </div>
                </motion.div> : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
