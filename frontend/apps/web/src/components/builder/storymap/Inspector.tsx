/**
 * storymap/Inspector.tsx
 * ----------------------
 * Context-aware inspector for the story map editor. Top-to-bottom:
 *   1. Scene settings - name, title, subtitle and the scene layout
 *      (a visual 2×2 of the four arrangements).
 *   2. The selected block - fields per block type + reorder/duplicate/remove.
 *   3. "Add content" - the palette of block types, always available.
 *
 * Everything edits through the same callbacks the canvas uses, so the
 * inspector and canvas always agree on the selected block.
 */
import { Input, Textarea, cn } from "@packages/ui";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2, X } from "lucide-react";

import {
  BASEMAP_OPTIONS,
  BLOCK_DEFS,
  LAYOUT_OPTIONS,
  blockDef,
  type StoryBlock,
  type StoryBlockType,
  type StoryScene,
} from "./types";

import type { BlockAction } from "./StorySceneView";

export interface InspectorProps {
  scene: StoryScene;
  /** Published maps of the project (options for map blocks). */
  maps: Array<{ id: string; title: string }>;
  block: StoryBlock | null;
  blockIndex: number;
  blockCount: number;
  onScene: (patch: Partial<StoryScene>) => void;
  onAddBlock: (type: StoryBlockType) => void;
  onUpdateBlock: (id: string, patch: Partial<StoryBlock>) => void;
  onBlockAction: (id: string, action: BlockAction) => void;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
      {children}
    </p>
  );
};

const ToolButton = ({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      title={label}
      type="button"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        danger
          ? "text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        disabled && "pointer-events-none opacity-40"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

/** A styled native select (keeps keyboard + screen-reader behaviour intact). */
const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) => {
  return (
    <select
      aria-label={label}
      className="input w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option
          key={o.id}
          value={o.id}
        >
          {o.label}
        </option>
      ))}
    </select>
  );
};

/* ── Per-type block fields ───────────────────────────────────────────────── */

const BlockFields = ({
  block,
  maps,
  onUpdate,
}: {
  block: StoryBlock;
  maps: Array<{ id: string; title: string }>;
  onUpdate: (patch: Partial<StoryBlock>) => void;
}) => {
  const showHeading = ["text", "keyPoints", "kpi", "image"].includes(
    block.type
  );
  const bullets = block.bullets ?? [];

  return (
    <div className="space-y-3">
      {showHeading ? (
        <Input
          aria-label="Block heading"
          inputSize="sm"
          label="Heading (optional)"
          placeholder="e.g. Why it matters"
          value={block.heading ?? ""}
          onChange={(e) => onUpdate({ heading: e.target.value })}
        />
      ) : null}

      {block.type === "text" ? (
        <Textarea
          aria-label="Body text"
          className="min-h-28"
          inputSize="sm"
          label="Text"
          placeholder="Write the narrative for this part of the story…"
          value={block.text ?? ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
        />
      ) : null}

      {block.type === "keyPoints" ? (
        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--text-primary)]">
            Points
          </span>
          <div className="space-y-1.5">
            {bullets.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1"
              >
                <Input
                  aria-label={`Point ${i + 1}`}
                  inputSize="sm"
                  value={item}
                  onChange={(e) => {
                    const next = [...bullets];
                    next[i] = e.target.value;
                    onUpdate({ bullets: next });
                  }}
                />
                <button
                  aria-label={`Remove point ${i + 1}`}
                  className="cursor-pointer rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--error-text)]"
                  type="button"
                  onClick={() =>
                    onUpdate({ bullets: bullets.filter((_, j) => j !== i) })
                  }
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="text-primary hover:bg-primary/10 flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
            type="button"
            onClick={() => onUpdate({ bullets: [...bullets, ""] })}
          >
            <Plus size={13} />
            Add point
          </button>
        </div>
      ) : null}

      {block.type === "map" ? (
        <>
          <SelectField
            label="Map source"
            value={block.mapId ?? "project"}
            options={[
              { id: "project", label: "Project view" },
              ...maps.map((m) => ({ id: m.id, label: m.title })),
            ]}
            onChange={(v) => onUpdate({ mapId: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Basemap"
              options={BASEMAP_OPTIONS}
              value={block.basemap ?? "osm"}
              onChange={(v) => onUpdate({ basemap: v })}
            />
            <Input
              aria-label="Zoom"
              inputSize="sm"
              label="Zoom"
              placeholder="Auto"
              type="number"
              value={block.zoom ?? ""}
              onChange={(e) =>
                onUpdate({
                  zoom:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Centre longitude"
              inputSize="sm"
              label="Centre lng"
              placeholder="Auto"
              type="number"
              value={block.centerLng ?? ""}
              onChange={(e) =>
                onUpdate({
                  centerLng:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
            <Input
              aria-label="Centre latitude"
              inputSize="sm"
              label="Centre lat"
              placeholder="Auto"
              type="number"
              value={block.centerLat ?? ""}
              onChange={(e) =>
                onUpdate({
                  centerLat:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <p className="text-xs leading-snug text-[var(--text-tertiary)]">
            Leave the view fields empty to follow the selected map.
          </p>
        </>
      ) : null}

      {block.type === "image" ? (
        <>
          <Input
            aria-label="Image URL"
            inputSize="sm"
            label="Image URL"
            placeholder="https://…"
            value={block.imageUrl ?? ""}
            onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          />
          <Input
            aria-label="Image caption"
            inputSize="sm"
            label="Caption"
            placeholder="What the image shows"
            value={block.imageCaption ?? ""}
            onChange={(e) => onUpdate({ imageCaption: e.target.value })}
          />
        </>
      ) : null}

      {block.type === "kpi" ? (
        <>
          <Input
            aria-label="KPI value"
            inputSize="sm"
            label="Value"
            placeholder="e.g. 1.2M or 34%"
            value={block.kpiValue ?? ""}
            onChange={(e) => onUpdate({ kpiValue: e.target.value })}
          />
          <Input
            aria-label="KPI label"
            inputSize="sm"
            label="Label"
            placeholder="What the number measures"
            value={block.kpiLabel ?? ""}
            onChange={(e) => onUpdate({ kpiLabel: e.target.value })}
          />
        </>
      ) : null}

      {block.type === "quote" ? (
        <>
          <Textarea
            aria-label="Quote text"
            className="min-h-24"
            inputSize="sm"
            label="Quote"
            placeholder="A line that gives this scene a voice…"
            value={block.quoteText ?? ""}
            onChange={(e) => onUpdate({ quoteText: e.target.value })}
          />
          <Input
            aria-label="Quote attribution"
            inputSize="sm"
            label="Attribution"
            placeholder="Who said it"
            value={block.quoteAttribution ?? ""}
            onChange={(e) => onUpdate({ quoteAttribution: e.target.value })}
          />
        </>
      ) : null}
    </div>
  );
};

/** The inspector rail: scene settings, the selected block, and content palette. */
export const Inspector = ({
  scene,
  maps,
  block,
  blockIndex,
  blockCount,
  onScene,
  onAddBlock,
  onUpdateBlock,
  onBlockAction,
}: InspectorProps) => {
  const def = block ? blockDef(block.type) : null;
  const BlockIcon = def?.icon;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* ── Scene settings ─────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <SectionLabel>Scene</SectionLabel>
        <Input
          aria-label="Scene name"
          inputSize="sm"
          label="Name"
          placeholder="e.g. Introduction"
          value={scene.name}
          onChange={(e) => onScene({ name: e.target.value })}
        />
        <Input
          aria-label="Scene title"
          inputSize="sm"
          label="Title"
          placeholder="Shown at the top of the scene"
          value={scene.title}
          onChange={(e) => onScene({ title: e.target.value })}
        />
        <Input
          aria-label="Scene subtitle"
          inputSize="sm"
          label="Subtitle"
          placeholder="One line under the title"
          value={scene.subtitle ?? ""}
          onChange={(e) => onScene({ subtitle: e.target.value })}
        />
        <div
          aria-label="Scene layout"
          className="grid grid-cols-2 gap-1.5"
          role="radiogroup"
        >
          {LAYOUT_OPTIONS.map((l) => {
            const Icon = l.icon;
            const selected = scene.layout === l.id;
            return (
              <button
                key={l.id}
                aria-checked={selected}
                role="radio"
                title={l.blurb}
                type="button"
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  selected
                    ? "border-[var(--border-focus)] bg-[var(--surface-active)] text-[var(--text-primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
                onClick={() => onScene({ layout: l.id })}
              >
                <Icon
                  size={15}
                  className={
                    selected
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-tertiary)]"
                  }
                />
                {l.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px border-[var(--border-primary)]" />

      {/* ── Selected block ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Content block</SectionLabel>
          {block ? (
            <div className="flex items-center gap-0.5">
              <ToolButton
                disabled={blockIndex === 0}
                label="Move block up"
                onClick={() => onBlockAction(block.id, "up")}
              >
                <ChevronUp size={14} />
              </ToolButton>
              <ToolButton
                disabled={blockIndex === blockCount - 1}
                label="Move block down"
                onClick={() => onBlockAction(block.id, "down")}
              >
                <ChevronDown size={14} />
              </ToolButton>
              <ToolButton
                label="Duplicate block"
                onClick={() => onBlockAction(block.id, "duplicate")}
              >
                <Copy size={14} />
              </ToolButton>
              <ToolButton
                danger
                label="Delete block"
                onClick={() => onBlockAction(block.id, "delete")}
              >
                <Trash2 size={14} />
              </ToolButton>
            </div>
          ) : null}
        </div>

        {block && def ? (
          <div className="space-y-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              {BlockIcon ? <BlockIcon size={14} /> : null}
              {def.label}
            </span>
            <BlockFields
              block={block}
              maps={maps}
              onUpdate={(patch) => onUpdateBlock(block.id, patch)}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--border-primary)] px-3 py-4 text-xs leading-relaxed text-[var(--text-tertiary)]">
            Select a block on the canvas to edit its content here, or add a new
            one below.
          </p>
        )}
      </section>

      <div className="h-px border-[var(--border-primary)]" />

      {/* ── Add content palette ────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <SectionLabel>Add content</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {BLOCK_DEFS.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.type}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-primary)] px-2.5 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                title={b.blurb}
                type="button"
                onClick={() => onAddBlock(b.type)}
              >
                <Icon
                  className="text-[var(--text-tertiary)]"
                  size={15}
                />
                {b.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
