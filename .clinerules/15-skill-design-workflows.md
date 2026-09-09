---
paths:
  - "frontend/apps/web/src/**"
  - "frontend/packages/**"
  - "modules/*/frontend/src/**"
---

# Skill: Design Workflows (Sumi "commands", adapted for Cline)

> On-demand protocols. When the user names one (or describes it), follow the
> steps and **cite the principle behind each change**. If no target is given,
> ASK what to work on — never invent a target to analyze.

## `/design:audit` — diagnose an existing UI

1. Identify the scope (the file/dir/component the user named).
2. Evaluate against: Nielsen 10, Laws of UX, WCAG 2.2 AA, anti-slop, and
   `@packages/ui`/token consistency.
3. Report findings ranked by impact: symptom → cause → concrete fix → the
   principle it violates. No vague "improve the design".

## `/design:fix` — repair AI-slop / weak UI

1. Detect slop (`10-skill-design-quality.md`).
2. Rewrite using `@packages/ui` + tokens; preserve behavior/props.
3. Cite the principle for each change; offer a before/after summary.

## `/design:grade` — score 0–100

Weighted: Clarity 25 · Consistency 20 · Accessibility 20 · Affordances 15 ·
Polish 10 · Trust 10. Give a number + the 3 highest-leverage fixes.

## `/design:preflight` — pre-ship checklist

Run the Definition-of-Done from `10-`, `11-`, and (if data) `12-skill` together;
report pass/fail per item with the offending code.

## `/design:component` — build a component properly

Deliver a complete `@packages/ui` component: all 8 states, tokens, a11y, motion,
variants, and a Storybook story (see `13-skill-component-states.md`).
