# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## User preferences

- Hyper / HyperFX is a top priority for this project — treat its integration as central, deepen it faithfully, and use the official docs (hyperfx.ai/docs) as the source of truth rather than guessing.
- No fake/mock/placeholder content. Software should fail explicitly rather than fall back silently.
- No emojis, and no code comments unless explicitly requested.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── massa/              # Main MASSA web app (React + Vite)
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health`; `src/routes/ai.ts` exposes `POST /ai/suggest` and `POST /ai/clarify`; `src/routes/ideas.ts` exposes CRUD for ideas (`GET /ideas`, `POST /ideas`, `PATCH /ideas/:id`, `DELETE /ideas/:id`, `GET /ideas/quick`, `POST /ideas/inbound`); `src/routes/video.ts` exposes `POST /ideas/:id/video` for video upload + transcription
- Lib: `src/lib/resend.ts` — Resend email client via Replit connectors integration; `src/lib/videoStorage.ts` — GCS-backed video storage via Replit sidecar auth; `src/lib/transcription.ts` — OpenAI Whisper transcription; `src/lib/enrichment.ts` — AI enrichment pipeline (Instagram + video transcript)
- AI integration: Uses OpenAI via Replit AI Integrations proxy (env vars `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`), models `gpt-4o-mini` (enrichment/suggestions) and `whisper-1` (video transcription)
- Object storage: Uses Replit Object Storage (GCS-backed) for video file uploads via `@google-cloud/storage` + sidecar auth; files stored in `PRIVATE_OBJECT_DIR/videos/`
- Email: Resend integration for email backup of ideas (forwarded to Maxw@trumoveinc.com)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openai`, `resend`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas
- `src/schema/ideas.ts` — ideas table (id, content, category, source, starred, archived, videoPath, transcript, enrichment*, createdAt, updatedAt)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/massa` (`@workspace/massa`)

React + Vite frontend-only workspace for the MASSA AI command workspace. Dark-themed, desktop-first with full mobile/tablet responsive support.

- Pages: `/` (Overview dashboard), `/inside` (Inside MASSA system explainer)
- Responsive: `useScreenSize()` hook in Overview.tsx with breakpoints 768px (mobile) / 1024px (tablet)
  - Desktop: 3-column layout (240px sidebar + center + 300px right panel)
  - Tablet: 2-column layout (center + 260px right panel), hamburger menu
  - Mobile: single column, hamburger menu, slide-out nav drawer, right panel hidden
- InsideMassa.tsx has its own `useIsMobileIM()` hook for responsive behavior
- Design: Terminal-inspired dark theme — bg `#0a0d10`, panel `#0a0d10`, terminal `#080a0e`, border `#14181e`/`#1c2028`, green accent `#34d399` with glow effects; monospace `JetBrains Mono` in UI chrome; `panel-header` CSS class for section labels; all inline styles, no Tailwind
- Color palette: green `#34d399`, amber `#f59e0b`, red `#f87171`, blue `#60a5fa`, violet `#a78bfa`, text `#e8eaed`, muted `#6b7280`, dim `#4b5563`
- Features: project cards (row/card views), build cards, chat modal, arch map modal, attachment menus, code stream, AI-powered prompt suggestions, vague mode clarify wizard, Ideas page (persistent idea capture with star/archive/edit/delete, inbound API for email/SMS)
- AI Suggestions: Debounced (800ms) call to `/api/ai/suggest` when prompt is 12+ chars; shows AI-generated prompt expansions in the terminal console
- Clarify Wizard: Single-question-at-a-time modal with multiple-choice options, powered by `/api/ai/clarify`; shows Q&A history, "Other" free-text option, skip-to-build, and ready-to-build summary
- Vite proxy: `/api` requests proxied to API server at `http://localhost:8080`
- Model registry: `src/data/modelRegistry.ts` — central registry of 12 AI models/tools (Claude, Claude Code, GPT-4o, Gemini, Lovable, Replit, Cursor, Bolt, Windsurf, n8n, Perplexity, Mistral) with categories, colors, capabilities, and contextual "why chosen" reason strings
- ModelTooltip component: `src/components/ModelTooltip.tsx` — custom hover tooltip with 300ms delay, fade animation, dark theme styling; used on all model pill/badge instances
- Logos: `src/lib/logos.ts` — SVG fallback logos for all models

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
