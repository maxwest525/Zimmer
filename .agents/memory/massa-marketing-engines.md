---
name: MASSA marketing engines
description: How the Marketing Command Center is structured and the no-fabrication rule for engine content.
---

# MASSA Marketing Command Center

The Marketing Command Center (MarketingView in artifacts/massa/src/pages/Overview.tsx) is **engine-led**: the user's proprietary marketing "engines" are the primary display; integrations/connectors are demoted to a secondary collapsible section. There is also a Documents list section and an Autonomous Loop image-upload affordance.

Known engine names: **Autonomous Loop, Scout, Killshot, Tree** (plus "a couple others" the user has not named yet).

**Rule:** Do NOT fabricate descriptions, metrics, or capability claims for the engines. The user strongly dislikes fake/mock content and is sending documents that define each engine. Until those arrive, non–Autonomous-Loop engines stay in a "Specification pending" Setup state.

**Why:** The user explicitly said they will send docs/spec + an autonomous-loop diagram; guessing engine behavior would be both fake content (which they reject) and likely wrong/rework.

**How to apply:** When the docs arrive, populate engine taglines/status from them. The Autonomous Loop card's vision is: upload a loop diagram → it gets built out and automated as a workflow (currently only a local FileReader preview; real persistence/automation would need object-storage + backend, not yet built).
