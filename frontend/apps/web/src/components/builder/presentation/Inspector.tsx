/**
 * presentation/Inspector.tsx
 * --------------------------
 * The context-aware properties panel on the right of the builder.
 *
 *  - When a block is selected: its heading, arrangement (full/half), reorder /
 *    duplicate / delete, plus type-specific controls (text, bullets, live map
 *    source + basemap, chart dataset/type/columns, table dataset, KPI value,
 *    image URL).
 *  - When nothing is selected: the "Add content" palette + slide settings
 *    (background swatches and speaker notes).
 *
 * Built entirely from `@packages/ui` primitives + design tokens.
 */
import type { ReactNode } from "react";

import { Button, Input, Select, Textarea, cn } from "@packages/ui";

import type { ProjectData } from "./useProjectData";
import type { BlockAction } from "./SlideCanvas";
import {
  BASEMAP_OPTIONS,
  BLOCK_DEFS,
  CHART_KINDS,
  SLIDE_BACKGROUNDS,
  blockDef,
  type Slide,
  type SlideBlock,
  type SlideBlockType,
} from "./types";

/* ── Small form helpers ───────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold tracking-widest text-[var(--text-tertiary)] uppercase">
      {children}
    </h3>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          )}
          type="button"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function datasetOptions(data: ProjectData) {
  return data.datasets.map((d) => ({ value: d.id, label: d.name }));
}

function columnsFor(data: ProjectData, datasetId?: string) {
  if (!datasetId) return [];
  return data.datasets.find((d) => d.id === datasetId)?.attributes ?? [];
}

function mapOptions(data: ProjectData) {
  return [
    { value: "project", label: "Project view" },
    ...data.maps.map((m) => ({ value: m.id, label: m.title })),
  ];
}

/* ── "Add content" palette ────────────────────────────────────────────────── */
function AddPalette({ onAdd }: { onAdd: (type: SlideBlockType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {BLOCK_DEFS.map((def) => {
        const Icon = def.icon;
        return (
          <button
            key={def.type}
            className="flex flex-col gap-1.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
            type="button"
            onClick={() => onAdd(def.type)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Icon size={16} />
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {def.label}
            </span>
            <span className="text-[0.7rem] leading-tight text-[var(--text-tertiary)]">
              {def.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Slide-level panel (no block selected) ────────────────────────────────── */
function SlidePanel({
  slide,
  onUpdateSlide,
  onAddBlock,
}: {
  slide: Slide;
  onUpdateSlide: (patch: Partial<Slide>) => void;
  onAddBlock: (type: SlideBlockType) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionTitle>Add content</SectionTitle>
        <AddPalette onAdd={onAddBlock} />
      </section>

      <section>
        <SectionTitle>Slide</SectionTitle>
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input
              inputSize="sm"
              value={slide.title}
              onChange={(e) => onUpdateSlide({ title: e.target.value })}
            />
          </Field>
          <Field label="Subtitle">
            <Input
              inputSize="sm"
              value={slide.subtitle ?? ""}
              onChange={(e) => onUpdateSlide({ subtitle: e.target.value })}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Background
            </span>
            <div className="flex gap-2">
              {SLIDE_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  aria-label={`${bg.label} background`}
                  aria-pressed={slide.background === bg.id}
                  className={cn(
                    "h-9 flex-1 rounded-lg border transition",
                    slide.background === bg.id
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                      : "border-[var(--border-primary)] hover:border-[var(--border-hover)]"
                  )}
                  style={{ background: bg.swatch }}
                  type="button"
                  onClick={() => onUpdateSlide({ background: bg.id })}
                />
              ))}
            </div>
          </div>
          <Field label="Speaker notes">
            <Textarea
              autoResize
              inputSize="sm"
              placeholder="Notes only you will see, in present mode…"
              value={slide.notes ?? ""}
              onChange={(e) => onUpdateSlide({ notes: e.target.value })}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

/* ── Block panel (a block is selected) ────────────────────────────────────── */
function BlockPanel({
  block,
  data,
  onAction,
  onUpdate,
}: {
  block: SlideBlock;
  data: ProjectData;
  onAction: (id: string, action: BlockAction) => void;
  onUpdate: (id: string, patch: Partial<SlideBlock>) => void;
}) {
  const def = blockDef(block.type);
  const Icon = def.icon;
  const columns = columnsFor(data, block.datasetId);
  const columnOptions = columns.map((c) => ({ value: c.field, label: c.field }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {def.label} block
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">{def.blurb}</p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>Arrange</SectionTitle>
        <Field label="Width">
          <Segmented
            value={block.span === 2 ? "full" : "half"}
            options={[
              { value: "full", label: "Full width" },
              { value: "half", label: "Half" },
            ]}
            onChange={(v) => onUpdate(block.id, { span: v === "full" ? 2 : 1 })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="ghost" onClick={() => onAction(block.id, "up")}>
            Move up
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction(block.id, "down")}>
            Move down
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction(block.id, "duplicate")}>
            Duplicate
          </Button>
          <Button size="sm" variant="error" onClick={() => onAction(block.id, "delete")}>
            Delete
          </Button>
        </div>
        <Field label="Heading (optional)">
          <Input
            inputSize="sm"
            value={block.heading ?? ""}
            onChange={(e) => onUpdate(block.id, { heading: e.target.value })}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Content</SectionTitle>

        {block.type === "text" ? (
          <Field label="Text">
            <Textarea
              autoResize
              inputSize="sm"
              value={block.text ?? ""}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            />
          </Field>
        ) : null}

        {block.type === "bullets" ? (
          <Field label="Bullets (one per line)">
            <Textarea
              autoResize
              inputSize="sm"
              value={(block.bullets ?? []).join("\n")}
              onChange={(e) =>
                onUpdate(block.id, { bullets: e.target.value.split("\n") })
              }
            />
          </Field>
        ) : null}

        {block.type === "map" ? (
          <>
            <Field label="Map">
              <Select
                size="sm"
                options={mapOptions(data)}
                value={block.mapId ?? "project"}
                onChange={(v) => onUpdate(block.id, { mapId: v })}
              />
            </Field>
            <Field label="Basemap">
              <Select
                size="sm"
                options={BASEMAP_OPTIONS.map((b) => ({
                  value: b.id,
                  label: b.label,
                }))}
                value={block.basemap ?? "osm"}
                onChange={(v) => onUpdate(block.id, { basemap: v })}
              />
            </Field>
            <p className="text-[0.7rem] leading-snug text-[var(--text-tertiary)]">
              Center and zoom come from the chosen map (or the project view).
            </p>
          </>
        ) : null}

        {block.type === "chart" ? (
          <>
            <Field label="Dataset">
              <Select
                size="sm"
                options={datasetOptions(data)}
                placeholder={
                  data.datasets.length ? "Select a dataset" : "No datasets in scope"
                }
                value={block.datasetId ?? ""}
                onChange={(v) =>
                  onUpdate(block.id, {
                    datasetId: v,
                    valueColumn: undefined,
                    labelColumn: undefined,
                  })
                }
              />
            </Field>
            <Field label="Chart type">
              <Select
                size="sm"
                options={CHART_KINDS.map((c) => ({ value: c.id, label: c.label }))}
                value={block.chartType ?? "bar"}
                onChange={(v) =>
                  onUpdate(block.id, { chartType: v as SlideBlock["chartType"] })
                }
              />
            </Field>
            <Field label="Value column">
              <Select
                disabled={!columns.length}
                size="sm"
                options={columnOptions}
                placeholder="Auto"
                value={block.valueColumn ?? ""}
                onChange={(v) => onUpdate(block.id, { valueColumn: v })}
              />
            </Field>
            <Field label="Label column">
              <Select
                disabled={!columns.length}
                size="sm"
                options={columnOptions}
                placeholder="Auto"
                value={block.labelColumn ?? ""}
                onChange={(v) => onUpdate(block.id, { labelColumn: v })}
              />
            </Field>
          </>
        ) : null}

        {block.type === "table" ? (
          <Field label="Dataset">
            <Select
              size="sm"
              options={datasetOptions(data)}
              placeholder={
                data.datasets.length ? "Select a dataset" : "No datasets in scope"
              }
              value={block.datasetId ?? ""}
              onChange={(v) => onUpdate(block.id, { datasetId: v })}
            />
          </Field>
        ) : null}

        {block.type === "kpi" ? (
          <>
            <Field label="Value">
              <Input
                inputSize="sm"
                placeholder="e.g. 42%"
                value={block.kpiValue ?? ""}
                onChange={(e) => onUpdate(block.id, { kpiValue: e.target.value })}
              />
            </Field>
            <Field label="Label">
              <Input
                inputSize="sm"
                placeholder="e.g. Coverage this year"
                value={block.kpiLabel ?? ""}
                onChange={(e) => onUpdate(block.id, { kpiLabel: e.target.value })}
              />
            </Field>
          </>
        ) : null}

        {block.type === "image" ? (
          <Field label="Image URL">
            <Input
              inputSize="sm"
              placeholder="https://…"
              value={block.imageUrl ?? ""}
              onChange={(e) => onUpdate(block.id, { imageUrl: e.target.value })}
            />
          </Field>
        ) : null}
      </section>
    </div>
  );
}

/* ── Main inspector ───────────────────────────────────────────────────────── */
export function Inspector({
  slide,
  block,
  data,
  onBlockAction,
  onUpdateBlock,
  onAddBlock,
  onUpdateSlide,
}: {
  slide: Slide;
  block: SlideBlock | null;
  data: ProjectData;
  onBlockAction: (id: string, action: BlockAction) => void;
  onUpdateBlock: (id: string, patch: Partial<SlideBlock>) => void;
  onAddBlock: (type: SlideBlockType) => void;
  onUpdateSlide: (patch: Partial<Slide>) => void;
}) {
  return block ? (
    <BlockPanel
      block={block}
      data={data}
      onAction={onBlockAction}
      onUpdate={onUpdateBlock}
    />
  ) : (
    <SlidePanel
      onAddBlock={onAddBlock}
      onUpdateSlide={onUpdateSlide}
      slide={slide}
    />
  );
}