---
name: DB schema project references
description: Why api-server typecheck breaks after editing lib/db schema, and how to fix.
---

The api-server (`artifacts/api-server`) consumes `@workspace/db` via TypeScript
**project references** against the package's emitted `dist/*.d.ts`, not its source.

**Symptom:** After adding/changing a table in `lib/db/src/schema/*`, running
`pnpm typecheck` in api-server reports `Module '"@workspace/db"' has no exported
member 'X'` — even for tables that already existed (e.g. `ideasTable`). The whole
module resolution fails because the stale `dist` lacks the new declarations.

**Fix:** Rebuild the db declarations before typechecking dependents:
`npx tsc --build lib/db/tsconfig.json` (regenerates `lib/db/dist/**/*.d.ts`).

**Why:** The runtime build uses esbuild (bundles from source) so the app runs
fine regardless, but tsc-based typecheck reads the emitted dist d.ts. Keep them
in sync after schema edits.
