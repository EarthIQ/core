/**
 * PublishedGrid.tsx
 * -----------------
 * Shared grid for a project's **published content** items (maps, story maps,
 * presentations) - every one of them is a `maps` row with a `kind` and an
 * optional JSON `content` payload. The grid is data-driven: the page supplies
 * the fetcher, a meta line, the share URL and the open/new/duplicate/delete/
 * share handlers. Search, access filter (all / public / private), sorting,
 * loading, empty and error states, and delete confirmation are handled here.
 *
 * Built on `@packages/ui` primitives + `globals.css` tokens only.
 */
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
  cn,
} from "@packages/ui";
import {
  Copy,
  ExternalLink,
  Globe,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapItem } from "@/lib/maps";

/* ── Relative time ("2d ago") - tiny, dependency-free ────────────────────── */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface PublishedGridProps {
  /** Icon component (lucide-compatible) shown in each card's chip. */
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Optional Tailwind classes to tint the icon chip (accent colour). */
  iconClassName?: string;
  /** The kind of item in words, for copy: "story map", "map", "presentation". */
  noun: string;
  /** Fetch the items to list (already filtered by project + kind). */
  fetchItems: () => Promise<MapItem[]>;
  /** One short meta line per card, e.g. "4 scenes". */
  metaFor: (item: MapItem) => string;
  /** Absolute share URL for a card (used by Copy link + View). */
  shareUrlFor: (item: MapItem) => string;
  /** Whether the current user can manage (share/duplicate/delete) this item. */
  canManage?: (item: MapItem) => boolean;
  /** Open the item in its editor. */
  onOpen: (item: MapItem) => void;
  /** Create a new item (page decides what that means). */
  onNew: () => void;
  /** Duplicate an item (page performs the create). */
  onDuplicate: (item: MapItem) => void;
  /** Delete an item (page performs the delete). */
  onDelete: (item: MapItem) => void;
  /** Open the share dialog for an item (page renders it). */
  onShare: (item: MapItem) => void;
  /** Bump to refetch (after create/duplicate/delete). */
  refreshKey?: number;
}

type AccessFilter = "all" | "public" | "private";

/* ── Card ─────────────────────────────────────────────────────────────────── */

const actionBtn =
  "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex h-7 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

const PublishedCard = ({
  item,
  Icon,
  iconClassName,
  meta,
  canManage,
  shareHref,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
  onCopyLink,
  copied,
}: {
  item: MapItem;
  Icon: PublishedGridProps["Icon"];
  iconClassName?: string;
  meta: string;
  canManage: boolean;
  shareHref: string;
  onOpen: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) => {
  return (
    <article
      aria-label={`Published item: ${item.title}`}
      className="card group flex flex-col gap-3 rounded-xl p-4 transition-colors hover:border-[var(--border-hover)]"
    >
      {/* Top row: identity + visibility */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconClassName ?? "bg-[var(--primary)]/10 text-[var(--primary)]"
          )}
        >
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <button
            className="max-w-full truncate text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
            title={`Open "${item.title}"`}
            type="button"
            onClick={onOpen}
          >
            {item.title || "Untitled"}
          </button>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {meta ? `${meta} · ` : ""}
            {timeAgo(item.updated_at)}
          </p>
        </div>
        {item.is_public ? (
          <Badge
            size="xs"
            variant="success"
          >
            <Globe
              aria-hidden
              size={10}
            />
            Public
          </Badge>
        ) : (
          <Badge
            size="xs"
            variant="outline"
          >
            <Lock
              aria-hidden
              size={10}
            />
            Private
          </Badge>
        )}
      </div>

      {item.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>
      ) : null}

      {/* Actions */}
      <div className="mt-auto flex flex-wrap items-center gap-0.5 border-t border-[var(--border-secondary)] pt-2.5">
        <button
          type="button"
          className={cn(
            actionBtn,
            "text-[var(--primary)] hover:text-[var(--primary)]"
          )}
          onClick={onOpen}
        >
          <Pencil
            aria-hidden
            size={12}
          />
          Open
        </button>
        {canManage ? (
          <>
            <button
              aria-label={`Share "${item.title}"`}
              className={actionBtn}
              type="button"
              onClick={onShare}
            >
              <Share2
                aria-hidden
                size={12}
              />
              Share
            </button>
            <button
              aria-label={`Copy share link for "${item.title}"`}
              className={actionBtn}
              type="button"
              onClick={onCopyLink}
            >
              <Copy
                aria-hidden
                size={12}
              />
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              aria-label={`Duplicate "${item.title}"`}
              className={actionBtn}
              type="button"
              onClick={onDuplicate}
            >
              <Plus
                aria-hidden
                size={12}
              />
              Duplicate
            </button>
          </>
        ) : null}
        <a
          aria-label={`Open public view of "${item.title}"`}
          className={actionBtn}
          href={shareHref}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink
            aria-hidden
            size={12}
          />
          View
        </a>
        {canManage ? (
          <button
            aria-label={`Delete "${item.title}"`}
            className={cn(actionBtn, "ml-auto hover:text-[var(--error-text)]")}
            type="button"
            onClick={onDelete}
          >
            <Trash2
              aria-hidden
              size={12}
            />
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
};

/* ── Grid ─────────────────────────────────────────────────────────────────── */

export const PublishedGrid = ({
  Icon,
  iconClassName,
  noun,
  fetchItems,
  metaFor,
  shareUrlFor,
  canManage = () => true,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  onShare,
  refreshKey = 0,
}: PublishedGridProps) => {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<MapItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchItems());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load published items"
      );
    } finally {
      setLoading(false);
    }
    // fetchItems is recreated by the page; identity churn is fine because we
    // gate on refreshKey below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((m) =>
        q
          ? (m.title + " " + (m.description ?? "")).toLowerCase().includes(q)
          : true
      )
      .filter((m) =>
        access === "all"
          ? true
          : access === "public"
            ? m.is_public
            : !m.is_public
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [items, query, access]);

  const handleCopyLink = (item: MapItem) => {
    const url = shareUrlFor(item);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  };

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        aria-label={`Loading ${noun} list`}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="status"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card rounded-xl p-4"
            style={{ minHeight: 148 }}
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div
        className="card rounded-xl p-6"
        role="alert"
      >
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error-bg)] text-[var(--error-text)]">
            <Lock
              aria-hidden
              size={20}
            />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            Couldn't load your {noun}s
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{error}</p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => void load()}
          >
            <RefreshCcw size={14} />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  /* ── Toolbar + grid ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Input
            aria-label={`Search ${noun}s`}
            inputSize="sm"
            placeholder={`Search ${noun}s…`}
            value={query}
            leftIcon={
              <Search
                className="text-[var(--text-tertiary)]"
                size={14}
              />
            }
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          placeholder="All access"
          size="sm"
          value={access}
          options={[
            { value: "all", label: "All access" },
            { value: "public", label: "Public only" },
            { value: "private", label: "Private only" },
          ]}
          onChange={(v) => setAccess(v as AccessFilter)}
        />
        <span
          aria-live="polite"
          className="text-xs text-[var(--text-tertiary)] tabular-nums"
        >
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
        <Button
          className="ml-auto"
          size="sm"
          onClick={onNew}
        >
          <Plus size={14} />
          New {noun}
        </Button>
      </div>

      {/* Grid / empty state */}
      {visible.length === 0 ? (
        <EmptyState
          action={
            items.length === 0
              ? { label: `New ${noun}`, onClick: onNew }
              : {
                  label: "Clear filters",
                  onClick: () => {
                    setQuery("");
                    setAccess("all");
                  },
                }
          }
          description={
            items.length === 0
              ? `Publish a ${noun} from this project to share it with anyone - with a link, a group, or everyone on the internet.`
              : "Try a different search or clear the access filter."
          }
          icon={
            <Icon
              className="text-[var(--text-tertiary)]"
              size={22}
            />
          }
          title={
            items.length === 0
              ? `No ${noun}s yet`
              : `No ${noun}s match your filters`
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <PublishedCard
              key={item.id}
              Icon={Icon}
              canManage={canManage(item)}
              copied={copiedId === item.id}
              iconClassName={iconClassName}
              item={item}
              meta={metaFor(item)}
              shareHref={shareUrlFor(item)}
              onCopyLink={() => handleCopyLink(item)}
              onDelete={() => setDeleteTarget(item)}
              onDuplicate={() => onDuplicate(item)}
              onOpen={() => onOpen(item)}
              onShare={() => onShare(item)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        confirmLabel="Delete"
        isOpen={!!deleteTarget}
        title={`Delete this ${noun}?`}
        variant="danger"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" and its share link will stop working. This can't be undone.`
            : undefined
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
