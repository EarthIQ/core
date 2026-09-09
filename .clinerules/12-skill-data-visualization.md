---
paths:
- "frontend/packages/charts/**"
- "frontend/apps/web/src/components/data/**"
- "frontend/apps/web/src/components/map/**"
- "frontend/apps/web/src/components/builder/**"
- "frontend/apps/web/src/pages/**"
- "frontend/apps/web/src/hooks/**"
- "modules/*/frontend/src/**"
---

# Skill: Data Visualization & Maps (Sumi-derived, EarthIQ-tailored)

> Applies to charts, tables, KPIs, and map views. EarthIQ is a geo/analytics
> platform — **data legibility IS the product.**

## Chart discipline
1. **State the point.** One chart, one message; the title = the conclusion, not
   "Monthly Values". Readable in <2s.
2. **Right chart, minimal ink.** Prefer one series over stacked; line over area
   unless part-to-whole matters; avoid 3-D, donut-with-legend, radar-as-default.
3. **Encode by the 4 channels** (position > length > area > angle > color). Color
   = category, never the only carrier of a magnitude.
4. **Token palette.** Use the brand scale (`--primary/-secondary/-accent`) +
   semantic (`--success/-warning/-error`) — not rainbow. Colorblind-safe; add a
   non-color cue (label/pattern/position).
5. **Honest scales:** bars start at 0; label axes + units; no misleading dual axes;
   consistent time base across a dashboard.
6. **Interactivity over cramming:** tooltips, zoom/brush, drill-down beat a wall
   of tiny charts.
7. **Loading/empty/error are first-class:** skeleton → clear empty state with a
   next action → inline error with retry. Never a blank plot.

## Tables & KPIs
- Sticky header; ONE of zebra/divider; right-align numbers with `tabular-nums`;
  sortable with visible affordance; a row count / filter summary.
- KPI cards: big number + label + delta (direction + reference period). A KPI
  with no context is decoration.

## Map (MapLibre) guidance
- A base-map weight that lets the data carry; avoid basemap clutter.
- Layered data: legend, layer toggles, and a "what am I looking at" readout.
- Performance: cluster/aggregate dense points; virtualize; debounce fit-bounds.
- Interaction: consistent zoom/pan, keyboard-accessible controls, and a non-map
  fallback (list/table) for the same data.

## Definition of done (data view)
- [ ] One clear takeaway; correct chart type; token-based palette.
- [ ] Loading / empty / error all handled.
- [ ] Accessible alternative (text/table) + keyboard operable.
- [ ] Numbers aligned, units labelled, deltas contextualized.
