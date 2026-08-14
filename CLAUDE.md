# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Finding code — hard rule

Four tools, one decision tree — walk it in order for every question about this
codebase:

1. **The question is vague — you don't know exactly what you're looking for**, e.g.
   "where is auth handled" rather than "where is `handleAuth` used" → **claude-context**.
   Semantic search over the already-indexed repo; it matches meaning, not exact
   names or patterns.
2. **The question is a specific lookup, not a modification.** Two branches:
   - **Structural or cross-cutting questions** — architecture, module structure,
     complexity/hotspot signals, a call trace across repos/services, dead code,
     impact/blast-radius analysis, cross-service HTTP/async links, or anything else
     the persisted knowledge graph is built for → **codebase-memory**. Its
     call/usage edges are confidence-scored, not exact — confirm with serena before
     acting on one.
   - **Anything else** — you know or can pattern-match the symbol's name and want
     its exact declaration, references, or implementations in this repo →
     **serena**. LSP-backed, so the answer is exact, not inferred.
3. **You want to make a modification** — rename, delete, insert, or rewrite a
   symbol → **serena**, always. It is the only one of the four allowed to write
   code.
4. **Only once 1–3 have genuinely been tried and none of them answer the
   question** → fall back to opening/reading/editing files directly, or bash
   commands (`grep`/`rg`/`find`/`glob` included). This is the last resort, not a
   shortcut.

Read a file only once a tool has told you which one, and read the smallest part of it
that answers the question.

None of these prove an export is unused — a JSX-only usage is easy to miss. `bun run
check` is the arbiter before any delete, rename, or signature change.

## What this is

A personal AI assistant platform. Single-user substrate, not a product — the value is
in making it cheap to add a new specialised agent, not in any one agent.

```
apps/web (TanStack Start + React, :5173) → HTTP+SSE → apps/server (Mastra/Hono/Bun, :4111) → Postgres 17 + pgvector
```

Mastra **is** the backend — agents, tools, durable workflows, and all persistence
(conversations, memory, workflow snapshots, traces, schedules) go through its storage
adapters. `apps/web`'s server routes are a thin proxy only (auth cookie attachment
later); they carry zero business logic. **Do not add a third backend service.**

`packages/shared` holds only Zod schemas/types genuinely needed by both `web` and
`server` (e.g. tool input schemas the UI also renders) — it stays nearly empty by
design.

## Layout

```
apps/web/src/
  routes/            TanStack Start routes (routes/c = conversation pages, routes/api = proxy)
  lib/components/<area>/   components, one concern per component, nothing else lives here
  lib/components/ui/       shadcn registry primitives — ours, not vendored (ui.instructions.md)
  lib/components/assistant-ui/  @assistant-ui registry components — same rules
  lib/components/elements/      @assistant-ui/elements-* components — same rules
  lib/hooks/          use-prefixed shared hooks
  lib/constants/, lib/utils/
apps/server/src/mastra/
  index.ts            wiring only, no logic
  agents/             one agent per file
  tools/              one tool per file
  middleware/         one middleware per file
  models.ts           the only place model ids are written down
packages/shared/       Zod schemas + types shared by web and server
.agents/skills/        vendored agent skills: ai-elements, beads, mastra
.github/instructions/  how code here is written and tested (below)
```

## Commands

Bun only — never `npm`, `pnpm`, `yarn`, `npx` (use `bunx` for one-off tools). Run
workspace commands from the repo root, not inside `apps/*` — e.g. `bun run test`
inside `apps/web` only runs that workspace and silently skips the server tests.

| Command                     | Does                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun install`               | Also installs git hooks (lefthook).                                                                                                                                      |
| `bun run dev:all`           | `db:up` then both app servers.                                                                                                                                           |
| `bun run dev`               | Both app servers; assumes DB is already up.                                                                                                                              |
| `bun run verify:fast`       | Pre-commit gate, scoped to the diff: format, lint, types, tests touching changed files. Seconds — run before every commit.                                               |
| `bun run verify`            | Full gate: types, lint, format, tests, builds. Slow; pre-push hook and CI already run it — only run by hand for a dependency bump, config change, or moved/deleted file. |
| `bun run test`              | Unit + integration + component tests, with coverage, across workspaces.                                                                                                  |
| `bun run test:e2e`          | Playwright; starts its own dev server.                                                                                                                                   |
| `bun run db:up` / `db:down` | Dev + test Postgres containers (test DB is tmpfs, resets on stop).                                                                                                       |

Single test file/name: use the workspace's vitest directly, e.g.
`cd apps/server && bunx vitest run path/to/file.test.ts -t "test name"`.

Ports: web `5173`, Mastra `4111` (Studio at `/`, API at `/api`), Postgres dev `5432`,
Postgres test `5433`.

## Working agreement (full detail in `.github/instructions/*.md`)

- **Prove it, don't assert it.** "Tests pass" means you ran them and are quoting
  output. A UI change is verified in a browser, not by an HTTP 200. Never state a
  fact about a dependency from memory — read the installed source.
- **Finish green**: `verify:fast` before every commit.
- Conventional commits, one per completed task; a bug-fix commit contains the
  failing test that reproduces it. Never commit or push without explicit approval.
- Ask rather than guess on anything user-visible or ambiguous.
- If an issue contradicts what an installed package actually does, the package is
  right — fix the issue.
- A taught convention gets proposed as an edit to the relevant instructions file
  (via the `capture-convention` skill), not applied silently.
- Issue tracking is **Beads**: `bd ready` for available work, `bd show <id>` for
  context, `bd list --all --type decision` for why a technology was chosen, `bd
prime` for full workflow context.

### TypeScript & code style (`typescript.instructions.md`)

- No `any`, no assertions to silence the compiler. Validate boundaries with Zod,
  trust the type inside; prefer `z.infer<>` over restating a shape.
- Typed errors (`class FooError extends Error`), `instanceof` discrimination, no
  bare `catch {}`, no defensive handling for cases that can't happen.
- Comment **why**, never what — only if a future reader would act differently for
  having read it. No changelog comments, no comments on absent code.
- No new abstraction for a single call site; nothing added beyond what was asked.
- **Mastra**: your training data on it is wrong (signatures/options/methods have
  changed) — never write it from memory. Try the `mastra` MCP server first, but it
  under-reports; when thin, read `node_modules/@mastra/<pkg>/dist/docs/` and the
  `.d.ts` directly. Never invent a model id — run
  `.agents/skills/mastra/scripts/provider-registry.mjs`; `apps/server/src/mastra/models.ts`
  is the only place ids live.
- Placement: one agent/tool/middleware per file; no `utils/` junk drawer; `index.ts`
  is wiring only.

### React & TanStack Start (`react.instructions.md`)

- App is a composition of small, single-responsibility components; question the
  component boundary every time you add to one.
- React Compiler owns memoisation — no hand-written `memo`/`useMemo`/`useCallback`
  without a written justification of what was measured. A compiler bail-out is a
  defect in the component, not a reason to memoise by hand.
- Named exports only (no default exports — breaks serena's rename). Props get a
  named `interface FooProps` above the component. Handlers are named functions in
  the component body.
- Props spreading (`{...props}`) only in leaf DOM wrappers; app components list
  props explicitly.
- Every `useEffect` needs a comment justifying why the sync can't be done during
  render or in a handler.
- JSX: ternary only for conditionals (`&&` is banned — falsy non-boolean renders
  literally); keys are stable data ids, never array index.
- Tailwind utility classes inline using `layout.css` tokens; CSS modules only for
  what Tailwind can't express.

### shadcn components (`ui.instructions.md`)

- `lib/components/ui/`, `lib/components/assistant-ui/` and `lib/components/elements/`
  are **ours** — full house style, lint, types and tests. No carve-out, no prettierignore entry, no coverage
  exclude. `shadcn add` output is a starting point, restyled in the same commit.
- Bring in only what the app imports and delete the rest; the registry is the backup.
- base-ui only, never radix. The style resolves from `apps/web/components.json`, so
  every CLI call needs `--cwd apps/web` or it silently serves radix.
- A component earns its own test when it has behaviour that can fail independently of
  how it looks; a props-to-class-names wrapper is covered by its consumers' tests.

### Testing (`testing.instructions.md`)

- Never assert on model prose. Mock the model (`MockLanguageModelV2` from
  `ai/test`); no network in unit/integration tests.
- Assert outcomes, not mechanisms — a test must survive a rewrite that doesn't
  change observable behavior. Never assert a value your own stub produced.
- Component tests: render the component under test, stub every in-repo child (stub
  renders nothing/invents nothing beyond a marker + recorded props). Query by role
  and accessible name. Cross-component flows belong in E2E.
- No logic in a test body (no branches/loops/derived expected values).
- A test isn't done until a mutation of the code proves it fails for the right
  reason.
- Bug fixes start with a failing test.
- Placement: `src/**/*.test.ts` unit (fast, no I/O — what pre-commit runs);
  `tests/**/*.integration.test.ts` needs real Postgres (`bun run db:up`);
  `tests/e2e/*.spec.ts` Playwright, kept to under ten. Tests must be
  order-independent and parallel-safe (unique ids/prefixes per test).
- Coverage floors: `packages/shared` 100%/100%, `apps/server/src/mastra/tools`
  90%/85%, `apps/server/src/mastra/workflows` 85%/80%, `apps/web/src/lib` 85%/80%,
  global floor 80%/75%. Coverage is a floor, not a goal — don't write a test just to
  move the number.
