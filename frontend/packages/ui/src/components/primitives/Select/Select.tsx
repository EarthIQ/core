import React, { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { cn } from "../../../utils/cn";
import { useClickOutside } from "../../../hooks/useClickOutside";
import { useKeyboard } from "../../../hooks/useKeyboard";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface BaseSelectProps {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  noResultsMessage?: string;
}

interface SingleSelectProps extends BaseSelectProps {
  multiple?: false;
  value?: string;
  onChange?: (value: string) => void;
}

interface MultiSelectProps extends BaseSelectProps {
  multiple: true;
  value?: string[];
  onChange?: (value: string[]) => void;
  maxSelections?: number;
}

type SelectProps = SingleSelectProps | MultiSelectProps;

const sizeClasses = {
  sm: "text-sm px-3 py-2",
  md: "text-base px-4 py-2.5",
  lg: "text-lg px-5 py-3",
};

function SelectionPill({
  label,
  onRemove,
  disabled,
}: {
  label: string;
  onRemove: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: "var(--surface-hover)",
        color: "var(--primary)",
        border: "1px solid var(--border-primary)",
      }}
    >
      {label}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="rounded-full transition-colors hover:opacity-70 focus:outline-none"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div
      className="relative border-b px-3 py-2"
      style={{ borderColor: "var(--border-primary)" }}
    >
      {/*
        Search icon
        ─ left-2.5 so it sits inside the input's visual boundary
        ─ pointer-events-none so it never blocks clicks
      */}
      <span
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
        style={{ color: "var(--text-tertiary)" }}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </span>

      {/*
        pl-8  = 2rem  — clears the 1rem icon + 0.625rem left-2.5 gap
        pr-8  = room for the clear button on the right
      */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search options"
        onKeyDown={(e) => {
          // Let the parent handle arrow-key navigation
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.stopPropagation();
          }
        }}
        className="w-full rounded-md py-1.5 pr-8 pl-4 pl-8 text-sm focus:outline-none"
        style={{
          backgroundColor: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--text-primary)",
          caretColor: "var(--primary)",
        }}
      />

      {/* Clear-search button */}
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12 }}
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-5 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:opacity-70 focus:outline-none"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Select(props: SelectProps) {
  const {
    options,
    placeholder = "Select an option",
    label,
    error,
    disabled,
    className,
    size = "md",
    searchable = false,
    searchPlaceholder = "Search...",
    onSearchChange,
    noResultsMessage = "No results found",
  } = props;

  const isMultiple = props.multiple === true;

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
  });

  const containerRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchQuery("");
  }, isOpen);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const selectedValues: string[] = isMultiple
    ? (props.value ?? [])
    : props.value
      ? [props.value]
      : [];

  const selectedOptions = options.filter((opt) =>
    selectedValues.includes(opt.value)
  );

  const maxReached =
    isMultiple && props.maxSelections !== undefined
      ? selectedValues.length >= props.maxSelections
      : false;

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFocusedIndex(-1);
    onSearchChange?.(query);
  };

  const handleSelect = (optionValue: string) => {
    if (isMultiple) {
      const current = props.value ?? [];
      const alreadySelected = current.includes(optionValue);

      if (alreadySelected) {
        props.onChange?.(current.filter((v) => v !== optionValue));
      } else {
        if (
          props.maxSelections !== undefined &&
          current.length >= props.maxSelections
        ) {
          return;
        }
        props.onChange?.([...current, optionValue]);
      }
    } else {
      (props as SingleSelectProps).onChange?.(optionValue);
      setIsOpen(false);
      setFocusedIndex(-1);
      setSearchQuery("");
    }
  };

  const handleRemovePill = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMultiple) return;
    const current = props.value ?? [];
    props.onChange?.(current.filter((v) => v !== optionValue));
  };

  const handleToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    setIsOpen(next);

    if (next) {
      const firstSelectedIdx = filteredOptions.findIndex(
        (opt) => selectedValues.includes(opt.value) && !opt.disabled
      );
      setFocusedIndex(firstSelectedIdx >= 0 ? firstSelectedIdx : -1);

      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setFocusedIndex(-1);
      setSearchQuery("");
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMultiple) return;
    props.onChange?.([]);
  };

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  const findNextEnabledIndex = (current: number): number => {
    for (let i = current + 1; i < filteredOptions.length; i++) {
      if (!filteredOptions[i].disabled) return i;
    }
    return current;
  };

  const findPrevEnabledIndex = (current: number): number => {
    for (let i = current - 1; i >= 0; i--) {
      if (!filteredOptions[i].disabled) return i;
    }
    return current;
  };

  useKeyboard({
    key: "ArrowDown",
    handler: (e) => {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => {
          if (prev === -1)
            return filteredOptions.findIndex((opt) => !opt.disabled);
          return findNextEnabledIndex(prev);
        });
      }
    },
    enabled: isOpen,
  });

  useKeyboard({
    key: "ArrowUp",
    handler: (e) => {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => findPrevEnabledIndex(prev));
      }
    },
    enabled: isOpen,
  });

  useKeyboard({
    key: "Enter",
    handler: (e) => {
      e.preventDefault();
      if (
        isOpen &&
        focusedIndex >= 0 &&
        !filteredOptions[focusedIndex]?.disabled
      ) {
        handleSelect(filteredOptions[focusedIndex].value);
      }
    },
    enabled: isOpen,
  });

  useKeyboard({
    key: "Escape",
    handler: () => {
      setIsOpen(false);
      setFocusedIndex(-1);
      setSearchQuery("");
    },
    enabled: isOpen,
  });

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderTriggerContent = () => {
    if (isMultiple) {
      if (selectedOptions.length === 0) {
        return (
          <span style={{ color: "var(--input-placeholder)" }}>
            {placeholder}
          </span>
        );
      }
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          {selectedOptions.map((opt) => (
            <SelectionPill
              key={opt.value}
              label={opt.label}
              disabled={disabled}
              onRemove={(e) => handleRemovePill(opt.value, e)}
            />
          ))}
        </span>
      );
    }

    const selectedOption = options.find(
      (opt) => opt.value === selectedValues[0]
    );
    return (
      <span
        style={{
          color: selectedOption
            ? "var(--text-primary)"
            : "var(--input-placeholder)",
        }}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2">
            {selectedOption.icon}
            {selectedOption.label}
          </span>
        ) : (
          placeholder
        )}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="w-full"
    >
      {label && (
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
          {isMultiple && props.maxSelections !== undefined && (
            <span
              className="ml-2 font-normal"
              style={{ color: "var(--text-tertiary)" }}
            >
              ({selectedValues.length}/{props.maxSelections})
            </span>
          )}
        </label>
      )}

      <div
        ref={refs.setReference}
        className="relative"
      >
        {/* ── Trigger button ── */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-multiselectable={isMultiple}
          aria-label={label || placeholder}
          className={cn(
            "w-full rounded-lg text-left transition-all",
            "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isMultiple && selectedOptions.length > 0
              ? "px-4 py-2 pr-16"
              : sizeClasses[size],
            className
          )}
          style={{
            backgroundColor: "var(--input-bg)",
            border: `1px solid ${
              error
                ? "var(--error-border)"
                : isOpen
                  ? "var(--input-focus-border)"
                  : "var(--input-border)"
            }`,
            color: "var(--text-primary)",
            borderRadius: "var(--radius-md)",
            boxShadow: isOpen
              ? "0 0 0 3px oklch(from var(--primary) l c h / 0.15)"
              : "none",
            transitionDuration: "var(--transition-fast)",
            outlineColor: "var(--ring)",
            minHeight: "2.5rem",
          }}
        >
          {renderTriggerContent()}

          <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
            {isMultiple && selectedValues.length > 0 && !disabled && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClearAll}
                aria-label="Clear all selections"
                className="rounded-full p-0.5 transition-colors hover:opacity-70 focus:outline-none"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            )}

            <span style={{ color: "var(--text-tertiary)" }}>
              <motion.svg
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </motion.svg>
            </span>
          </span>
        </button>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                zIndex: "var(--z-dropdown)",
                /*
                  DO NOT set overflow:hidden here.
                  It was swallowing the inner scroll container.
                */
              }}
              role="listbox"
              aria-label={label || placeholder}
              aria-multiselectable={isMultiple}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full"
            >
              {/* Search input — sticky at the top of the dropdown */}
              {searchable && (
                <SearchInput
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  inputRef={searchInputRef}
                />
              )}

              {/* Max-selection notice */}
              {isMultiple && maxReached && (
                <div
                  className="border-b px-4 py-2 text-xs"
                  style={{
                    color: "var(--text-tertiary)",
                    borderColor: "var(--border-primary)",
                    backgroundColor: "var(--surface-hover)",
                  }}
                >
                  Maximum of {props.maxSelections} items selected
                </div>
              )}

              {/*
                Options list
                ─ maxHeight in px so the browser always respects it
                ─ overflowY:auto renders the native scrollbar when needed
                ─ overflowX:hidden prevents horizontal bleed
              */}
              <div
                className="py-1"
                style={{
                  maxHeight: "240px",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {filteredOptions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <span style={{ color: "var(--text-tertiary)" }}>
                      <svg
                        className="h-8 w-8 opacity-40"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                        />
                      </svg>
                    </span>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {searchQuery ? noResultsMessage : "No options available"}
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => handleSearchChange("")}
                        className="text-xs font-medium underline-offset-2 transition-opacity hover:opacity-70 focus:outline-none"
                        style={{ color: "var(--primary)" }}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = selectedValues.includes(option.value);
                    const isFocused = focusedIndex === index;
                    const isEffectivelyDisabled =
                      option.disabled || (maxReached && !isSelected);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={isEffectivelyDisabled}
                        onClick={() =>
                          !isEffectivelyDisabled && handleSelect(option.value)
                        }
                        onMouseEnter={() =>
                          !isEffectivelyDisabled && setFocusedIndex(index)
                        }
                        onMouseLeave={() => setFocusedIndex(-1)}
                        disabled={isEffectivelyDisabled}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm transition-colors",
                          "focus:outline-none",
                          isEffectivelyDisabled &&
                            "cursor-not-allowed opacity-50"
                        )}
                        style={{
                          backgroundColor: isSelected
                            ? isFocused
                              ? "var(--surface-active)"
                              : "var(--surface-hover)"
                            : isFocused
                              ? "var(--surface-hover)"
                              : "transparent",
                          color: isSelected
                            ? "var(--primary)"
                            : "var(--text-primary)",
                          transitionDuration: "var(--transition-fast)",
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {isMultiple && (
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                              style={{
                                backgroundColor: isSelected
                                  ? "var(--primary)"
                                  : "transparent",
                                borderColor: isSelected
                                  ? "var(--primary)"
                                  : "var(--border-primary)",
                              }}
                            >
                              {isSelected && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="white"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </span>
                          )}

                          {option.icon}

                          <span className="flex-1">
                            {searchable && searchQuery
                              ? highlightMatch(option.label, searchQuery)
                              : option.label}
                          </span>

                          {!isMultiple && isSelected && (
                            <svg
                              className="h-4 w-4 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Multi-select footer */}
              {isMultiple && options.length > 0 && (
                <div
                  className="flex items-center justify-between border-t px-4 py-2"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {selectedValues.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setFocusedIndex(-1);
                      setSearchQuery("");
                    }}
                    className="rounded px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 focus:outline-none"
                    style={{ color: "var(--primary)" }}
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p
          className="mt-1.5 text-sm"
          style={{ color: "var(--error-text)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Highlights the matched portion of an option label
// ---------------------------------------------------------------------------
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <mark
        style={{
          backgroundColor: "oklch(from var(--primary) l c h / 0.18)",
          color: "var(--primary)",
          borderRadius: "2px",
          padding: "0 1px",
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}
