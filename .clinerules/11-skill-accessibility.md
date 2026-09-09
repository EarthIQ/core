---
paths:
- "frontend/apps/web/src/**"
- "frontend/packages/**"
- "modules/*/frontend/src/**"
---

# Skill: Accessibility — WCAG 2.2 AA (Sumi-derived)

> Applies to all UI. Target **WCAG 2.2 AA**. When fixing, cite the SC so the
> change is auditable.

## Must-pass (AA)
- **1.4.3 Contrast** — text/graphics ≥ 4.5:1 (large ≥ 3:1). Verify against the
  CURRENT token values in BOTH light and `.dark`.
- **1.4.11 Non-text Contrast** — controls & focus indicators ≥ 3:1.
- **1.4.13 Content on Hover/Focus** — dismissable, hoverable, persistent.
- **2.1.1 Keyboard** — every feature usable by keyboard alone.
- **2.4.3 Focus Order** — logical DOM order; no focus traps.
- **2.4.7 Focus Visible** — visible, consistent ring (use `--ring` / `--border-focus`).
- **2.4.11 Focus Not Obscured** — focus target not hidden by sticky headers.
- **2.5.8 Target Size** — pointer targets ≥ 24×24 CSS px.
- **3.3.1 Error Identification** — errors described in text, not color alone.
- **4.1.2 Name, Role, Value** — correct ARIA/roles on custom controls.
- **2.5.10 Reflow (320px)** + **1.4.12 Text Spacing** — verify at narrow widths.

## React / `@packages/ui` specifics
- Interactive elements are `<button>`/`<a>` by default; if using a div, add
  `role`, `tabIndex={0}`, and full key handling (Enter/Space, arrows, Esc).
- Icon-only controls need an accessible name (`aria-label`).
- Modal/Drawer: move focus in on open, restore on close, `role="dialog"` +
  labelled by, close on Esc + backdrop, lock body scroll.
- Forms: visible `<label>` per field; errors announced via `aria-live="polite"`;
  required + hint text provided.
- Tables: `<caption>` / `<th scope>`; charts need a text alternative + a data
  table fallback.
- **Maps (MapLibre):** keyboard/scroll-zoom fallback, keyboard-operable "locate
  me" control, and an alternative text list of the key features/markers shown.

## Quick audit
1. Tab through the whole flow — every control reachable & clearly focused?
2. Zoom to 200% — nothing clipped or unusable?
3. Reading-order (screen-reader) pass — does the story make sense?
4. Any color-only meaning? Status needs text/icon, not just hue.
