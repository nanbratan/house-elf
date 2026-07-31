# M0 — Foundation

**Goal:** A monorepo where `bun run dev` brings up Postgres, a Mastra server with one
trivial agent reachable in Studio, and a SvelteKit app that renders a page. Nothing
is connected yet.

**Why this is separate:** getting tooling wrong is the most common way a personal
project dies. Do it once, deliberately, before any interesting code exists.

---

## Tasks

### T0.1 — Repo and workspaces

- `git init`; add a `.gitignore` covering `node_modules`, `.env`, `dist`, `.svelte-kit`,
  `build`, `*.pdf` artifacts, and Postgres volume data.
- Root `package.json` with Bun workspaces: `apps/*`, `packages/*`.
- Root `tsconfig.base.json` per the conventions doc (ES2022, bundler resolution,
  strict). Each workspace extends it.
- Pin `typescript` to an **exact** version (no `^`). One compiler only — see D13
  before considering `tsgo`.
- Root scripts per [03-testing.md](03-testing.md): `dev`, `check`, `lint`, `format`,
  `format:check`, `test`, `test:unit`, `test:watch`, `test:e2e`, `build`, `verify`,
  `db:up`, `db:down`.

### T0.2 — Postgres + pgvector

- `infra/docker-compose.yml` with two Postgres services from `pgvector/pgvector:pg17`
  (or current equivalent):
  - `postgres` — dev, port `5432`, named volume, healthcheck
  - `postgres-test` — integration tests, port `5433`, **tmpfs or disposable volume**
    so it resets cleanly
- Confirm the `vector` extension can be created in both. Mastra's `PgVector` will
  create what it needs, but verify the extension is available in the image.
- `DATABASE_URL` and `TEST_DATABASE_URL` in `.env.example`.

### T0.3 — Mastra server skeleton

- Scaffold `apps/server` with `bunx create-mastra@latest server --empty --no-git
--no-skills`, run from `apps/`. **Consult the `mastra` skill's `create-mastra.md`
  reference first** and re-check the flags — do not follow a remembered procedure.
  - `--empty` is required. Without it the CLI clones the "Agent Harness" template,
    which brings shell/web-fetch/task tools, `ObservationalMemory` and dependencies
    on `@mastra/libsql` and `@mastra/duckdb` — contradicting D4 and D7.
  - `--empty` is mutually exclusive with `--llm`/`-l` and `--api-key`/`-k`
    ("The --llm option can only be used with the default template"). Set the
    provider key in the root `.env` by hand instead.
  - Afterwards, delete the scaffold's nested `bun.lock`, `node_modules` and
    `.gitignore`, rewrite its `package.json` for the workspace, and install from
    the repo root.
- Install `@mastra/core`, `@mastra/pg`, `@mastra/memory`, `@mastra/ai-sdk`,
  `@mastra/loggers`, `zod`, `ai`.
- `src/mastra/index.ts`: a `Mastra` instance configured with
  - `PostgresStore` pointed at `DATABASE_URL`
  - `PinoLogger`
  - one placeholder agent (`general`) with a verified model ID
- Secrets live in the **root** `.env`, but `mastra dev` runs its bundle in a Node
  subprocess that only reads `.env` from the server workspace. Point it at the root
  file explicitly: `mastra dev --env ../../.env`. Same for `mastra build`/`start`
  when those land.
- Verify `mastra dev` starts and Studio is reachable at `http://localhost:4111`.
- Send a message to the placeholder agent **from Studio** and get a response.

### T0.4 — SvelteKit skeleton

- Scaffold `apps/web` with SvelteKit 2, Svelte 5, TypeScript, Vite. Run from `apps/`:
  `bunx sv@latest create web --template minimal --types ts --add tailwindcss
--no-install --no-download-check`.
  - `--add` is mutually exclusive with `--no-add-ons`, and `--add tailwindcss` still
    prompts for the typography/forms plugins — answer with none.
  - Afterwards: rename the package to `@house-elf/web`, drop the scaffold's own
    `typescript` devDependency so the exact root pin (D13) governs, and delete its
    nested `.gitignore` and boilerplate README.
- Tailwind CSS v4 arrives as a Vite plugin (`@tailwindcss/vite`, not PostCSS). The
  scaffold puts the stylesheet at `src/routes/layout.css`, imported from
  `+layout.svelte` — not the older `src/app.css`.
- Define the theme as semantic tokens in a `@theme` block in that stylesheet
  (`--color-canvas`, `--color-surface`, `--color-accent`, …) and have components
  reference only those, never raw palette values.
- Two routes, both static placeholders for now:
  - `/` — conversation list
  - `/c/[id]` — a conversation
- A minimal app shell: sidebar (conversation list) + main pane. Dark theme. The
  sidebar collapses via a toggle in the main pane's header.
- Verify `bun run dev` serves it and Tailwind classes apply.

### T0.5 — Lint, format, types

- ESLint **10** flat config at the root, with `typescript-eslint`
  (`strictTypeChecked` + `stylisticTypeChecked`), `eslint-plugin-svelte`, and
  `eslint-config-prettier` last. (The plan originally said ESLint 9; both plugins
  now declare `eslint: ^8.57 || ^9 || ^10` — see the PROGRESS decision log.)
  Type-aware linting needs `projectService` enabled — verify it resolves both
  workspaces.
- Prettier with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`. Set
  `tailwindStylesheet` to `apps/web/src/routes/layout.css` — Tailwind v4 has no
  config file for the plugin to find.
- Exclude the vendored `.agents/` skills and `skills-lock.json` from **both** tools.
  They are third-party content and must stay byte-identical to upstream.
- `check` runs `tsc --noEmit` (server, shared) and `svelte-check` (web).
- Format the repo. Verify `check`, `lint`, and `format:check` all exit 0.

### T0.6 — Test infrastructure

Set this up **now**, before there is anything to test. Retrofitting a test setup onto
an existing codebase is how projects end up with no tests.

- Vitest 3 at the root using a `projects` config covering `apps/server`,
  `apps/web`, and `packages/shared`.
- `apps/web` project uses the `jsdom` environment with `@testing-library/svelte`,
  `@testing-library/jest-dom`, and `@testing-library/user-event`. Set
  `resolve.conditions: ['browser']` under Vitest as the Svelte docs require, and
  confirm this does not break the server project's resolution.
- `@vitest/coverage-v8` with the thresholds from [03-testing.md](03-testing.md),
  plus the exclusion list (each exclusion carries a comment explaining itself).
- Playwright installed and configured for E2E, with Chromium downloaded.
- Integration test helper that connects to `TEST_DATABASE_URL` and generates unique
  resource/thread prefixes per test.
- **Write one real test at each layer now** so the wiring is proven. Where possible
  point them at code that already exists rather than throwaway fixtures — T0.1–T0.5
  necessarily shipped untested, since the runner does not exist until this task, and
  this is where that debt gets paid.
  - a unit test in `packages/shared`
  - a rune test in a `.svelte.test.ts` file (proves `$state` works under Vitest)
  - an integration test that writes to and reads from `postgres-test`
  - a component test covering the **T0.4 app shell** — the only real behaviour M0
    produced, and currently verified by hand only:
    - the sidebar toggle collapses and expands it
    - `aria-expanded` and the button's accessible name track that state
    - the conversation matching the current path gets the active styling, others do
      not

    Query by role and accessible name, not CSS selectors, per
    [03-testing.md](03-testing.md) — the markup will change in M2 and the tests
    should survive it.

  - an E2E test loading `/` and asserting the shell renders

- Verify coverage reporting produces output and that dropping below a threshold
  actually fails the command (test this by temporarily raising a threshold).

### T0.7 — Automation

- `lefthook` with a pre-commit hook (`format:check`, `lint`, `test:unit` on staged
  files) and a pre-push hook (full `verify`).
- GitHub Actions workflow running `bun run verify` on push, with Postgres as a
  service container.
- Verify the hooks fire and that a deliberately broken commit is rejected.

### T0.8 — Dev orchestration

- Root `dev` script brings up Postgres, then runs the Mastra server and the SvelteKit
  dev server concurrently with clearly prefixed output.
- Document the ports: web `5173`, Mastra `4111`, Postgres `5432`.

---

## Definition of Done

- `docker compose up -d` starts both Postgres instances and they accept connections.
- `bun run dev` starts both apps with no errors.
- Studio at `:4111` lists the `general` agent, and chatting with it there returns a
  streamed response from a real provider.
- `http://localhost:5173` renders the shell; `/c/anything` renders the placeholder.
- **`bun run verify` passes** — types, lint, format, all four test layers, and both
  builds.
- Coverage reporting works, and artificially raising a threshold makes the command
  fail (proving the gate is real, not decorative).
- Pre-commit and pre-push hooks fire; CI is green.
- Deleting `node_modules` and the Postgres volumes, then `bun install` +
  `docker compose up` + `bun run verify`, reproduces all of the above.

## Notes for the executing agent

- Studio working is the real signal that Mastra is wired up correctly. Do not proceed
  to M1 until an agent responds in Studio.
- If `mastra dev` and your application both open the storage, ensure they use the
  same `DATABASE_URL`.
- **The test infrastructure is the point of this milestone**, more than the app
  skeletons. A working four-layer test setup with enforced coverage on day one is
  what makes the coverage goal achievable. Retrofitted test setups never reach it.
- Type-aware ESLint across a Bun monorepo with Svelte is the fiddliest part of M0.
  Budget time for it. If `projectService` misbehaves, fall back to explicit
  `project` paths per workspace.
- Resist adding anything to `packages/shared` beyond what its one proving test needs.
