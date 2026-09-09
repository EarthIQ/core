---
paths:
- "frontend/apps/web/src/**"
- "frontend/packages/**"
- "modules/*/frontend/src/**"
---

# Skill: Design Quality (Sumi-derived)

> Applies to any UI (pages, components, styles). Build on the core rules FIRST
> (§5.3 `@packages/ui`, §5.4 `globals.css` tokens). Do NOT invent competing
> design decisions.

## Non-negotiable UI rules
1. **One design system.** Reuse `@packages/ui` components + the `globals.css`
   tokens. No ad-hoc hex/oklch colors, radii, shadows, or spacing — use the vars.
2. **No AI-slop.** Reject: aurora/gradient blobs, default glassmorphism, emoji as
   icons, generic filler copy, "AI-ish" phrasing (unleash / seamless / elevate /
   empower), uniform card grids with identical visual weight, decorative shadow on
   everything. If a screen looks like a template, it fails.
3. **Every state exists.** Every interactive element and data view handles:
   default, hover, focus-visible, active, disabled, **loading**, **empty**,
   **error**. Happy-path-only = incomplete (see `13-skill-component-states.md`).
4. **Legibility first.** Body text ≥ 4.5:1 contrast, large text ≥ 3:1 (see
   `11-skill-accessibility.md`).

## Laws of UX (apply by instinct; cite when you fix)
- **Fitts's Law** — larger + closer targets are faster. Primary action gets the
  largest target in the natural gaze path.
- **Hick's Law** — fewer, clearer choices load faster; group secondary actions.
- **Miller's (7±2)** — chunk information; avoid option dumps / walls of text.
- **Jakob's Law** — users expect your UI to behave like the ones they know.
- **Peak-End Rule** — polish the hardest moment and the finish; the rest can be plain.
- **Doherty Threshold** — keep interactive feedback < ~400ms or show progress.

## Nielsen's 10 heuristics (review checklist)
1. **Visibility of system status** — show progress/results (loading, saved, sync).
2. **Match the real world** — geo/spatial language & real names, not DB ids.
3. **User control & freedom** — back, cancel, undo, clear filters.
4. **Consistency & standards** — follow `@packages/ui` + platform conventions.
5. **Error prevention** — constraints + confirmation for destructive actions.
6. **Recognition over recall** — show options/labels instead of asking to type.
7. **Flexibility & efficiency** — keyboard, sensible defaults, power-user shortcuts.
8. **Aesthetic & minimalist** — every element competes; remove noise.
9. **Help users recover from errors** — plain-language, actionable messages.
10. **Help & documentation** — discoverable when the UI can't speak for itself.

## Definition of done (UI)
- [ ] Uses `@packages/ui` + tokens; no stray CSS or raw colors.
- [ ] All states present (loading / empty / error / success).
- [ ] Keyboard operable + visible focus; WCAG contrast met.
- [ ] No AI-slop patterns (rule 2). Dark mode via tokens only.
