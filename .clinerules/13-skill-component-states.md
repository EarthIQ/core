---
paths:
- "frontend/packages/ui/src/**"
- "frontend/apps/web/src/components/**"
- "modules/*/frontend/src/components/**"
---

# Skill: Component Completeness & Design Tokens (Sumi-derived)

> Applies when building/modifying any UI component. A component is not done until
> it is a complete, reusable primitive.

## Every component ships these states
default · hover · focus-visible · active · disabled · **loading** · **error** ·
**empty** (where data is involved). Missing any = incomplete.

## Build rules
1. **Prefer `@packages/ui`** (§5.3) — check the existing primitive (Button, Input,
   Select, Modal, ...) BEFORE writing a new one; extend the package over inlining.
2. **Tokens only** (§5.4) — colors/radii/shadows/spacing via `globals.css` vars;
   never hard-code `#hex`/`oklch`/px radii in a component.
3. **Accessible + polymorphic** — semantic element by default; `aria-*` where the
   pattern requires; keyboard parity for any pointer behavior.
4. **Variants, not forks** — drive appearance via props/variants, not copy-pasted
   classes. Keep the API small and predictable.
5. **Motion is functional** — 120–240ms, ease-in/out; respect
   `prefers-reduced-motion`.

## Quality bar
- [ ] All 8 states render and are testable.
- [ ] Focus ring visible & consistent; disabled is clearly non-interactive.
- [ ] Works in light + dark (tokens flip, no per-theme CSS).
- [ ] Responsive to mobile; no horizontal overflow.
- [ ] Documented props (JSDoc) + a Storybook story if the package uses one.
