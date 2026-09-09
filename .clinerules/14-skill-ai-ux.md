---
paths:
  - "modules/ai-module/frontend/**"
  - "modules/*/frontend/src/**"
  - "frontend/apps/web/src/pages/**"
---

# Skill: AI / Agentic Interface UX

> Applies to the AI module and any LLM/agent-facing surface. AI features are
> judged on **trust**, not just output.

## Trust & transparency

1. **Show confidence & limits.** Never present a guess as a fact; surface
   uncertainty, sources/grounding, and when to verify.
2. **Attribution.** If an answer is generated/retrieved, say so and show provenance
   (which module/tool/data). No silent "magical" results.
3. **Explainable actions.** For agentic steps, show plan → act → result and allow
   inspection of what the agent did.

## Interaction

- **Streaming UX:** progressive output, a clear "thinking" indicator, a stop
  control, and graceful partial-failure handling.
- **Latency:** respond fast (ack + skeleton), meet the ~400ms feedback bar, and
  degrade gracefully (timeout → partial → retry), never a frozen spinner.
- **Grounding over confabulation:** prefer retrieved/typed data; when unsure, ask a
  clarifying question instead of inventing.
- **Guardrails in the UI:** gate destructive/irreversible auto-actions behind an
  explicit confirm; show rate limits / quota.

## Failure handling

- Retry with context; show the error in plain language; **never lose the user's
  draft** on an error.

## Definition of done (AI surface)

- [ ] Provenance + uncertainty communicated.
- [ ] Streaming, stop, and error/retry all handled.
- [ ] Destructive actions gated behind confirmation.
- [ ] Keyboard operable + accessible (see `11-skill-accessibility.md`).
