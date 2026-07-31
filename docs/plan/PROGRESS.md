# Progress

Source of truth for what is actually done. **Update this as you work**, not at the
end of a session — an interrupted session that updated nothing is a session lost.

Rules:

- Tick a task only when `bun run verify` passed with it.
- A milestone is done only when its DoD was verified **by running the app**.
- Record deviations and surprises in the log below. That is the part future sessions
  cannot reconstruct from the code.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Pre-flight

- [x] **Scaffold check** — in `/tmp`, run `create-mastra` under Bun, record the
      directory structure and exact `@mastra/*` versions, then delete it. Results
      below.

### Scaffold check results

Done 2026-07-30, `/tmp/he-spike` deleted. Also checked: `mastra dev` starts, Studio
renders at :4111 and lists the agent, and `typst compile` produces a valid PDF (typst
0.15.1, installed via Homebrew). An agent **responding** is only partially confirmed —
no provider API key was available, so the call was proven to reach Anthropic and be
rejected with `invalid x-api-key`. The full round trip is deferred to T0.3.

**Structure produced** (default template, see decision log): `src/mastra/index.ts`,
`src/mastra/agents/agent.ts`, `src/mastra/tools/*.ts`, `tsconfig.json`, `.env` /
`.env.example`, `AGENTS.md`. Flat and single-package — it does not disagree with the
`apps/*` + `packages/*` layout, it simply has no opinion about it.

**Versions installed** (2026-07-30): `@mastra/core` 1.55.0 · `@mastra/server` 1.55.0 ·
`@mastra/deployer` 1.55.0 · `@mastra/memory` 1.24.0 · `@mastra/libsql` 1.18.0 ·
`@mastra/observability` 1.16.3 · `@mastra/duckdb` 1.5.2 · `@mastra/loggers` 1.2.0 ·
`@mastra/schema-compat` 1.3.4 · `mastra` CLI 1.21.0 · `zod` 4.4.3 · `typescript`
6.0.3 · no `ai` package. Scaffold declares `engines: node >=22.13.0`; ran fine under
Bun 1.2.13.

Later sessions read `node_modules/@mastra/*/dist/docs/` for version-exact API docs.

## M0 — Foundation → [10-m0-foundation.md](10-m0-foundation.md)

Split across two sessions; T0.6 is large.

Session A:

- [x] T0.1 Repo and workspaces
- [x] T0.2 Postgres + pgvector
- [x] T0.3 Mastra server skeleton
- [x] T0.4 SvelteKit skeleton

Session B:

- [x] T0.5 Lint, format, types
- [x] T0.6 Test infrastructure
- [x] T0.7 Automation
- [x] T0.8 Dev orchestration
- [ ] **DoD verified**

## M1 — Chat end to end → [11-m1-chat-e2e.md](11-m1-chat-e2e.md)

- [ ] T1.1 Expose an AI SDK chat endpoint
- [ ] T1.2 A tool worth watching
- [ ] T1.3 SvelteKit proxy route
- [ ] T1.4 Chat UI
- [ ] T1.5 Streaming quality
- [ ] T1.6 Tests
- [ ] **DoD verified**

## M2 — Threads and memory → [12-m2-threads-memory.md](12-m2-threads-memory.md)

- [ ] T2.1 Memory configuration
- [ ] T2.2 Thread lifecycle
- [ ] T2.3 Conversation list
- [ ] T2.4 Thread titles
- [ ] T2.5 Load an existing conversation
- [ ] T2.6 New conversation page
- [ ] T2.7 Tests
- [ ] **DoD verified** — incl. the cross-thread working-memory check

## M3 — Menu agent → [13-m3-menu-agent.md](13-m3-menu-agent.md)

- [ ] T3.1 Multi-agent support in the UI
- [ ] T3.2 Semantic recall
- [ ] T3.3 Menu agent
- [ ] T3.4 Tools
- [ ] T3.5 Structured output where it helps
- [ ] T3.6 Tests
- [ ] **DoD verified** — incl. "renderer needed no changes"

## M4 — CV agent → [14-m4-cv-agent.md](14-m4-cv-agent.md)

Consider splitting at the RAG / PDF boundary (after T4.4).

- [ ] T4.1 Document ingestion
- [ ] T4.2 Upload UI
- [ ] T4.3 Retrieval tool
- [ ] T4.4 CV agent
- [ ] T4.5 Typst in the container
- [ ] T4.6 The render tool
- [ ] T4.7 Typst starting point
- [ ] T4.8 Download & preview
- [ ] T4.9 Tests — incl. the Typst sandbox-escape test
- [ ] **DoD verified**

## M5 — Workflows → [15-m5-workflows.md](15-m5-workflows.md)

- [ ] T5.1 Choose the workflow
- [ ] T5.2 Build the workflow
- [ ] T5.3 Suspend and resume
- [ ] T5.4 Workflow UI
- [ ] T5.5 Scheduling
- [ ] T5.6 Notification
- [ ] T5.7 Tests — incl. rehydrate-from-Postgres resume
- [ ] **DoD verified**

## M6 — Auth and deploy → [16-m6-auth-deploy.md](16-m6-auth-deploy.md)

- [ ] T6.1 Choose the mechanism
- [ ] T6.2 Enforce it in two places
- [ ] T6.3 Nothing to do for identity (confirm, do not build)
- [ ] T6.4 Build artifacts
- [ ] T6.5 Production compose
- [ ] T6.6 Backups — incl. a **tested restore**
- [ ] T6.7 Deploy flow
- [ ] T6.8 Host hardening
- [ ] **DoD verified** — running on the VPS over HTTPS

---

## Decision log

Append an entry whenever the plan turned out to be wrong, an API differed from what
was assumed, or you chose something the plan did not specify. Newest at the bottom.

Format: `### YYYY-MM-DD — <what>` then what the plan said, what was true, what you
did, and which plan doc you corrected.

### 2026-07-30 — TypeScript 7 shipped; pin is 6.0.3, not `latest`

**Plan said:** D13 pinned "a stable TypeScript" and treated the Go port as unreleased,
shipping only as `@typescript/native-preview`, to be revisited when its README's API
row says "done".

**What is true:** `typescript@latest` on npm is **7.0.2** — TS 7 has shipped, and it
_is_ the Go port, published under the main `typescript` package name. So
`typescript@latest` now silently swaps the compiler implementation. But the two
type-aware tools this plan depends on both refuse it:
`typescript-eslint@8.65.0` declares `typescript: ">=4.8.4 <6.1.0"` and
`svelte-check@4.7.4` declares `^5.0.0 || ^6.0.0`. The typescript-go README still marks
the compiler **API "not ready"** and the language service "in progress", which is
exactly why those ranges stop where they do.

**Did:** pinned `typescript` to exactly `6.0.3` (highest stable 6.x, verified
installed and reporting `Version 6.0.3`). D13's reasoning was correct; only its
version numbers were stale.

**Corrected:** `01-decisions.md` D13 — retitled, rewritten around the 6-vs-7 trap,
and the revisit trigger changed from "read the README" to "check the published peer
ranges of typescript-eslint and svelte-check", with the exact commands.

### 2026-07-30 — `create-mastra` defaults to a template, not a bare skeleton

**Plan said:** T0.3 — scaffold `apps/server`, then add `@mastra/pg`, memory, etc.,
implying a minimal starting point.

**What is true:** with no `--template`/`--empty` flag, `create-mastra` clones a
template called **"Agent Harness"**: an agent with shell, web-fetch, task-tracking and
schedule tools, `ObservationalMemory`, and dependencies on `@mastra/libsql`,
`@mastra/duckdb` and `@mastra/observability`. That contradicts D4 (Postgres only) and
D7 (do not adopt observational memory before M4).

Also: `bun create mastra@latest` cannot pass the CLI's own flags — `-l` fails with
`error: Invalid Argument '-l'`. Use `bunx create-mastra@latest`.

**Did:** applied at T0.3 — scaffolded with `bunx create-mastra@latest server --empty
--no-git --no-skills`. `--empty` also turned out to be mutually exclusive with `-l`
and `-k` ("The --llm option can only be used with the default template"), so the
provider key was set by hand in the root `.env`.

**Corrected:** `10-m0-foundation.md` T0.3 — now names the exact command, both flag
constraints, and the post-scaffold cleanup.

### 2026-07-30 — agent HTTP API takes `memory: { thread, resource }`

**What is true:** `POST /api/agents/<id>/generate` ignores top-level `threadId` /
`resourceId`. Supplying them produces a misleading 500
("requires a threadId, but none was found"). The correct shape is
`{"messages": [...], "memory": {"thread": "...", "resource": "..."}}`.

**Did:** recorded only. Relevant from M2 onward.

### 2026-07-30 — T0.1 declares the full script surface before it works

**Plan said:** T0.1 — add all root scripts (`dev`, `check`, `lint`, … `db:up`).

**What is true:** at T0.1 none of them can pass — there are no workspaces, no ESLint
config, no Vitest, no compose file.

**Did:** declared all script names in the root `package.json` as the plan asks, each
pointing at its real eventual command rather than a fake `exit 0` stub. They fail
until their own task lands. Live after T0.1: none — T0.1's verification is
`bun install` succeeding and the pinned compiler resolving. `db:*` go live at T0.2,
`check`/`lint`/`format*` at T0.5, `test*` at T0.6, `dev` at T0.8. A green `bun run
verify` is first possible at T0.6/T0.8.

**Corrected:** nothing — this is the plan working as intended, recorded so a future
session does not mistake the failing scripts for breakage.

### 2026-07-30 — local Postgres credentials live in the compose file, not `.env`

**Plan said:** `02-conventions.md` — "all secrets in `.env`, never committed".

**What is true:** `docker compose -f infra/docker-compose.yml` treats `infra/` as the
project directory, so it would look for `infra/.env`, not the root `.env`. Plumbing
the root `.env` into compose means an `--env-file` flag on every invocation, for a
local-only throwaway password.

**Did:** hardcoded `houseelf`/`houseelf` in `infra/docker-compose.yml` with a comment
saying it is local-only and unused in production. The _connection strings_ still live
in `.env` (`DATABASE_URL`, `TEST_DATABASE_URL`), which is what the apps actually read,
so the convention holds where it matters. M6's production compose takes credentials
from the environment.

**Corrected:** nothing — the convention is about secrets, and a local dev password
reachable only on loopback is not one.

### 2026-07-30 — `postgres-test` reset behaviour verified, not assumed

**What is true:** the tmpfs-backed test database was empirically confirmed to lose all
data on **both** `docker compose restart postgres-test` and a full `down` + `up` — a
marker table created beforehand was gone in both cases. The dev database's named
volume survived `down` + `up` (the `vector` extension was still installed), so the two
instances behave as intended and oppositely.

**Did:** recorded. Integration tests (T0.6) can therefore rely on a clean database per
run without any teardown SQL.

### 2026-07-30 — `mastra dev` does not see the root `.env`

**Plan said:** `02-conventions.md` — secrets live in a single root `.env`.

**What is true:** `mastra dev` bundles to `.mastra/output/` and runs it in a **Node**
subprocess, which reads `.env` from the server workspace only. Running the script
through `bun run --filter` from the repo root is not enough — the server died with
"Missing required environment variable DATABASE_URL". The CLI has `-e, --env <file>`
for exactly this.

**Did:** set the server's dev script to `mastra dev --env ../../.env`. No secrets are
duplicated and the root `.env` stays the single source.

**Corrected:** `10-m0-foundation.md` T0.3 now states this.

### 2026-07-30 — `sv create` flag constraints and scaffold layout

**Plan said:** T0.4 — scaffold `apps/web`, add Tailwind v4 via the Vite plugin.

**What is true:** `sv create --add tailwindcss` cannot be combined with
`--no-add-ons` ("option '--no-add-ons' cannot be used with option '--add'"), and
`--add tailwindcss` still prompts interactively for the typography/forms plugins.
Neither was taken. The scaffold also puts the stylesheet at
`src/routes/layout.css` imported from `+layout.svelte`, not the older `src/app.css`.

Command used: `bunx sv@latest create web --template minimal --types ts
--add tailwindcss --no-install --no-download-check`, run from `apps/`, answering the
plugin prompt with none.

**Did:** dropped the scaffold's `typescript` devDependency so the exact root pin
(D13) governs, removed its nested `.gitignore` and boilerplate README, and renamed
the package to `@house-elf/web`.

**Corrected:** `10-m0-foundation.md` T0.4 now records the command and constraints.

### 2026-07-30 — theme tokens chosen (user decision)

Slate-based dark palette with a low-chroma periwinkle accent
(`oklch(0.72 0.09 265)`), chosen to read as a developer tool rather than an "AI
product": desaturated, neither bright nor dim. Defined as semantic tokens
(`--color-canvas`, `--color-surface`, `--color-raised`, `--color-line`,
`--color-content`, `--color-muted`, `--color-faint`, `--color-accent`,
`--color-accent-soft`) in a Tailwind v4 `@theme` block in
`apps/web/src/routes/layout.css`. Components must use these tokens, never raw
palette values, so the theme stays changeable from one block.

Sidebar is collapsible via a toggle in the main pane's header (user's choice over a
fixed or off-canvas sidebar).

### 2026-07-30 — M0 tasks before T0.6 ship untested by construction

**Plan said:** `03-testing.md` — "no failing tests … No exceptions, no 'I'll add
tests later'", and AGENTS.md rule 5 requires every task to end green including tests.

**What is true:** the task order makes that impossible for T0.1–T0.5. There is no
Vitest, no jsdom and no Testing Library until T0.6, which the plan deliberately
sequences after the scaffolding. So those tasks ended green on `check` alone.

Most of that work is config and static markup, which cannot regress. The exception is
the T0.4 app shell: the sidebar collapse toggle and the active-conversation
highlighting are real behaviour, currently verified only by clicking through a
browser.

**Corrected:** `10-m0-foundation.md` T0.6 now names the app shell as the subject of
its component test, with the specific assertions, instead of a throwaway component.
The debt is scheduled rather than remembered.

### 2026-07-31 — D13's pin re-verified at T0.5; still 6.0.3

Ran D13's own revisit check before installing anything. Unchanged:

| Tool                | Version | Declared `typescript` peer | Accepts 7? |
| ------------------- | ------- | -------------------------- | ---------- |
| `typescript-eslint` | 8.65.0  | `>=4.8.4 <6.1.0`           | **No**     |
| `svelte-check`      | 4.7.4   | `^5.0.0 \|\| ^6.0.0`       | **No**     |

`6.0.3` remains the newest version the whole toolchain agrees on. No change.
`svelte-check@4.7.4` also carries a direct `typescript: ^6.0.3` dependency, which the
root pin dedupes — worth knowing if a future bump appears to do nothing.

**Corrected:** nothing.

### 2026-07-31 — ESLint 10, not 9

**Plan said:** T0.5 and `02-conventions.md` — "ESLint 9 flat config".

**What is true:** `eslint@latest` is **10.8.0**, and both type-aware plugins already
admit it: `typescript-eslint@8.65.0` and `eslint-plugin-svelte@3.22.0` each declare
`eslint: ^8.57 || ^9.0.0 || ^10.0.0`. ESLint 10 is flat-config-only, which is what the
plan actually wanted; the "9" was just the current major when the plan was written.
Nothing forced 9, so installing it deliberately would have been choosing staleness.

**Did:** installed `eslint@10.8.0` + `@eslint/js@10.0.1`. Config is
`eslint.config.js` (plain ESM, so no `jiti` needed). `projectService: true` resolved
both workspaces on the first try — the plan's warning about falling back to explicit
`project` paths did not materialise. `.js` files get `projectService: false` plus
`disableTypeChecked`, since root config files belong to no tsconfig.

**Corrected:** `10-m0-foundation.md` T0.5 and `02-conventions.md` toolchain summary.

### 2026-07-31 — vendored `.agents/` must be excluded from lint and format

**What is true:** the first `eslint .` failed on
`.agents/skills/mastra/scripts/provider-registry.mjs` ("not found by the project
service"), and the first `prettier --write .` rewrote five vendored skill files plus
`skills-lock.json`. That content is third-party and tracked; reformatting it would
produce permanent diff noise against upstream and defeat `skills-lock.json`.

**Did:** added `.agents/` to `eslint.config.js` ignores and `.agents` +
`skills-lock.json` to `.prettierignore`, then `git checkout --` to restore the files
Prettier had already touched.

**Corrected:** `10-m0-foundation.md` T0.5 now states the exclusion.

### 2026-07-31 — T0.4's app shell had two real type/lint defects

**What is true:** the T0.4 shell shipped before any type-aware linting existed, and
type-aware lint immediately found two genuine bugs in it, not style nits:

- `let { children } = $props()` left `children` implicitly `any`, so
  `{@render children()}` tripped `@typescript-eslint/no-unsafe-call`.
- `href="/c/{conversation.id}"` tripped `svelte/no-navigation-without-resolve`.

**Did:** typed the props as `{ children: Snippet }` and switched the link to
`resolve('/c/[id]', { id: conversation.id })` from `$app/paths`. Both are behaviour-
preserving. Note `svelte-check` passed on this file both before and after — the
type-aware ESLint pass caught what `check` did not, which is the argument for keeping
both in `verify`.

**Corrected:** nothing — this is T0.5 doing its job on T0.4's output.

### 2026-07-31 — `docs/plan/` is tracked after all; open question closed

**Previously recorded:** an open question claiming `docs/plan/` was added to
`.gitignore` after T0.1, which would have made "fix the plan doc in the same commit"
impossible.

**What is true:** `.gitignore` contains no `docs/` entry, and `git status` lists every
`docs/plan/*.md` file as tracked and modified. The concern was unfounded.

**Did:** removed the open question. No `.gitignore` change was needed.

### 2026-07-31 — Prettier style chosen (user decision)

Tabs, single quotes, `printWidth` 100, `trailingComma: "none"` — the SvelteKit-
idiomatic defaults, matching how `apps/web` was already scaffolded. The whole repo was
reformatted once at T0.5, so this touches nearly every file; later diffs are clean.
`prettier-plugin-tailwindcss` needs `tailwindStylesheet` pointed at
`apps/web/src/routes/layout.css`, since Tailwind v4 has no config file for it to find.

### 2026-07-31 — Prettier could not stabilise this file; Pre-flight restructured

**What is true:** `format:check` failed on `PROGRESS.md` even immediately after
`format`. The Pre-flight entry was a `- [x]` task-list item containing several
follow-on paragraphs, and Prettier added **four more spaces of indentation on every
run** — a genuine non-idempotency, not a one-off. `prettier --write` twice in a row
produced two different files, so no amount of reformatting would ever converge.

**Did:** moved the long-form detail out of the list item into a top-level
`### Scaffold check results` section, leaving a one-line checkbox. Prettier reaches a
fixpoint immediately.

**Watch out:** when adding to this file, keep multi-paragraph prose at top level.
Deeply-indented continuation content inside a checkbox item will break
`format:check`, and therefore `verify`, in a way that looks like a Prettier bug
rather than a content problem.

**Corrected:** nothing — `PROGRESS.md` content only.

### 2026-07-31 — Vitest 4, not 3

**Plan said:** `01-decisions.md`, `02-conventions.md` and T0.6 all specify Vitest 3.

**What is true:** Vitest 3 does not support the Vite 8 that `apps/web` already runs
on. Vitest 4 is current and works with it. Nothing in the plan depends on a Vitest 3
API; `projects`, `--project` and the v8 coverage provider all behave as described.

**Corrected:** all three plan documents now say Vitest 4.

### 2026-07-31 — `.ts` import extensions enabled repo-wide

**Plan said:** nothing either way.

**What is true:** the new test files import siblings as `./truncate.ts`, which
matches how Bun resolves and how the files actually sit on disk, but `tsc` rejected it
with TS5097 until `allowImportingTsExtensions` was set. Every project here is
`noEmit`, so the flag has no downside.

**Did:** added it to `tsconfig.base.json`.

### 2026-07-31 — root-level TypeScript was unchecked; added a root tsconfig

**What is true:** `bun run check` only ran per workspace, so `vitest.shared.ts`,
`playwright.config.ts` and `tests/**` were type-checked by nothing. ESLint's
`projectService` also refused to lint them for the same reason.

**Did:** added a root `tsconfig.json` covering those files, and prefixed the root
`check` script with `tsc --noEmit -p tsconfig.json`.

**Watch out:** `apps/web` extends the SvelteKit-generated tsconfig, not
`tsconfig.base.json`, so it does **not** inherit `noUncheckedIndexedAccess`. Files
under `apps/web` are therefore checked more loosely than the rest of the repo, and a
type-aware lint rule can disagree with `tsc` about whether an index lookup can be
`undefined`. Not fixed here — it belongs with a web-side task.

### 2026-07-31 — `test:unit` covers component tests too

**Plan said:** T0.7's pre-commit hook runs `test:unit` and must stay "under a few
seconds".

**What is true:** running only the server's `unit` project would leave the web tests —
the ones covering real behaviour — out of the pre-commit gate, while the whole suite
runs in under a second. Only the server's `integration` project needs a container.

**Did:** `test:unit` is `bun run --filter '*' test:unit`, which is every suite except
the server's integration project.

### 2026-07-31 — Mastra storage is composite; threads go through a domain store

**Plan said:** nothing specific about the storage API shape.

**What is true:** in `@mastra/pg` 1.55 `PostgresStore` extends `MastraCompositeStore`.
There are no thread methods on the store itself — they live on a domain store reached
via `await store.getStore('memory')`, which returns `MemoryPG | undefined`. Also,
`init()` is only called automatically when the store is handed to the `Mastra` class;
using it directly, as tests do, requires an explicit `await store.init()` or the
tables never exist.

**Corrected:** nothing — the plan never claimed otherwise. Recorded because M2 will
need it.

### 2026-07-31 — jsdom cannot see `inert`, and Playwright's role engine ignores it

**What is true:** two separate gaps found while writing the sidebar tests. jsdom does
not implement `inert`, so a component test asserting it fails even though the
behaviour is correct. Playwright's `getByRole` respects `aria-hidden` but not `inert`,
so a collapsed-but-inert link still matches a role query.

**Did:** the `inert` guarantee is asserted in E2E via the attribute, and the
visual-clipping guarantee via `toBeInViewport`, which uses a real IntersectionObserver
and so honours the zero-width clipping ancestor. The component test file carries a
comment saying where the assertion went, so it does not look forgotten.

### 2026-07-31 — T0.4 defect: a collapsed sidebar was still keyboard-reachable

**What is true:** collapsing set `w-0` with `overflow-hidden`. That hides the links
from sighted users but leaves them with a layout box, in the tab order and in the
accessibility tree — a keyboard user tabs into invisible links. The browser check at
T0.4/T0.5 could not have caught this; the first E2E test did, immediately.

**Did:** added `inert={!sidebarOpen}` to the `<aside>`. This is the third defect in
the T0.4 shell found by tooling rather than by looking at it.

### 2026-07-31 — E2E clicks need retrying, because `goto` resolves before hydration

**What is true:** the first sidebar test failed for five seconds of retries while the
sidebar stayed open. The click was landing on a button Vite had not yet made
interactive — `page.goto` resolves as soon as the HTML arrives, and the dev server
compiles client modules on demand. Playwright retries assertions but never retries
clicks, so the click was a silent no-op and only the assertion after it failed.

**Did:** `tests/e2e/shell.spec.ts` wraps the toggle click in `expect(...).toPass()`.
Retrying is safe because the button renames itself on success, so the locator stops
matching and it cannot double-toggle.

**Watch out:** any future E2E test whose _first_ interaction is a click needs the same
treatment. A plain `.click()` immediately after `goto` will pass or fail depending on
how warm the dev server is.

### 2026-07-31 — coverage thresholds proven to fail the build

The plan asks for proof the gate is real. Running the suite with coverage widened to
include the untested Mastra wiring dropped lines to 71.42% and exited **1** with
`ERROR: Coverage for lines (71.42%) does not meet global threshold (80%)`. No files
were edited to produce this, so there was nothing to revert.

Per-directory thresholds for `tools`, `workflows` and the web `lib` are deliberately
absent: Vitest errors when a threshold glob matches no files, so they land with the
code they govern.

### 2026-07-31 — `packages/shared` is an empty placeholder, and its test is gone

**What is true:** the plan asked for "a unit test in `packages/shared`". Nothing is
shared yet — M2 is the first milestone with a cross-app consumer — so satisfying that
line meant inventing a function purely to have something to test. A test of a guessed
API proves the runner works and nothing else, at the cost of code that has to be
maintained and then deleted.

**Did:** deleted `truncate.ts` and its test. `packages/shared/src/index.ts` is now
`export {}` with a comment saying why. The unit layer is proven by
`apps/server/src/env.test.ts`, which covers real code with real branches.
[10-m0-foundation.md](10-m0-foundation.md) corrected in the same change, both in the
task list and in the closing note.

### 2026-07-31 — every workspace owns its Vitest config; shared policy lives in one file

**What is true:** the plan implied one root `vitest.config.ts` with a project per test
layer. That cannot include `apps/web`, because SvelteKit's Vite plugin
([`src/exports/vite/index.js`](../../node_modules/@sveltejs/kit/src/exports/vite/index.js))
sets `root: cwd` from `process.cwd()` and lists `root`, `$lib` and `$app` in
`enforced_config` — it overrides whatever the config says. From the repo root that
breaks `$lib` and sends it looking for `<repoRoot>/src/app.html`.

Working around it meant hand-writing stubs for `$app/paths` and `$lib` — test-support
code with branches of its own that nothing tests. If such a stub is wrong, the
component tests agree with the bug instead of catching it. (An intermediate version
deep-imported Kit's internal `resolve_route` by file path to avoid writing the logic;
that traded invented logic for a reach past the package boundary plus an ambient
`.d.ts`, which is no better.)

A second intermediate state kept a root config for the server and a nested one for
web. That worked but was asymmetric — two different rules for where a test config
lives, and coverage settings restated in both.

**Did:** made it symmetric. Every workspace owns its test config, and the policy they
share lives in exactly one place.

- `vitest.shared.ts` at the root exports coverage provider, reporters, universal
  excludes and thresholds. Nothing in it names a directory.
- `apps/server/vitest.config.ts` and `apps/web/vite.config.ts` each `mergeConfig` it
  and add only what is specific to them: the `unit`/`integration` projects and the
  Mastra exclusions for the server; jsdom, the Svelte plugin and the route exclusions
  for web.
- Each declares `test`, `test:unit` and `test:watch`, so the root scripts are
  `bun run --filter '*' test` — the same shape as `dev`, `build` and `check` already
  had. There is no root `vitest.config.ts`.
- `tests/` at the root now holds only the Playwright E2E suite, which genuinely is
  cross-workspace. `load-env.ts` moved to `apps/server/tests/setup/`.
- `packages/shared` has no test config, because it has no tests. `--filter` skips a
  workspace that lacks the script.

Coverage is now reported and gated per workspace rather than as one repo-wide number.
That is the more honest measure anyway — an 80% repo average can hide a 40% app.

**Watch out:** two things were needed to make the plugin work under Vitest, both from
the Svelte testing docs. `resolve.conditions` must be `['browser']` when
`mode === 'test'`, or Svelte resolves to its SSR build and every rune throws
`rune_outside_svelte`. And `@testing-library/svelte` ships `.svelte.js` source that
uses runes, so it must be inlined via `test.server.deps.inline` rather than
externalised, or it fails the same way.

The only remaining test double is `$app/state`, via `vi.mock` in
`apps/web/tests/setup/app-state.ts`. It holds a URL and hands it back — state, not
logic, so there is nothing in it to be wrong. `$app/paths`, `$lib` and the project's
runes compiler options are the real ones.

### 2026-07-31 — `apps/web` tests default to jsdom, and can opt out

A review question worth recording: not everything under `apps/web` is a component
test — utilities will live there too. Rather than classify by directory, the web
project defaults to `environment: 'jsdom'` (it is a browser app; that is the common
case) and any test that genuinely wants plain Node opts out with a
`// @vitest-environment node` docblock. That is a stock Vitest feature, so there is no
naming convention to remember and no glob to keep in sync.

### 2026-07-31 — env vars are scoped per app; the web app reads no `.env` yet

**What is true:** Vite resolves `import.meta.env` from `envDir` and SvelteKit resolves
`$env/*` from `kit.env.dir`, both defaulting to the config's own directory — so
`apps/web` cannot see the repo-root `.env`. That was first treated as a gap and
"fixed" by pointing both at the root. Verified it worked: with `kit.env.dir: '../../'`
the root variables appear in `.svelte-kit/ambient.d.ts`; with the default they do not
(4 matches versus 0).

**Did:** reverted it. The default is the correct behaviour, not a gap. The SvelteKit
app is a thin proxy to the Mastra server — it has no use for `DATABASE_URL` or
`ANTHROPIC_API_KEY`, and handing its process those violates least privilege for no
gain. There is also nothing to duplicate: the two apps' variables do not overlap, so
the usual argument for a single shared file does not apply here.

The root `.env` is therefore server-and-integration-tests scope, and `.env.example`
now says so. `apps/web` gets its own `.env` + `.env.example` when it first needs a
variable — likely the Mastra server URL in M1.

**Watch out:** Kit's `$env/static/private` already refuses to be imported into client
code, so this is defence in depth rather than the only thing standing between a secret
and the browser. It still matters for the server process's ambient environment.

**Open question for M1:** whether the root `.env` should move to `apps/server/.env`
for the same reason. Everything in it today is the server's. Left alone for now
because `mastra dev --env ../../.env` and the integration-test loader both point at
the root, and T0.8 revisits dev orchestration anyway.

Two review questions, answered rather than actioned. Vite 8.1.5 depends directly on
`rolldown@1.1.5` — the Rust bundler is already what builds and what Vitest 4 uses;
`rolldown-vite` was the transitional package and is no longer relevant. And the E2E
suite stays on a single `chromium` project: extra browsers buy cross-browser coverage
this single-user app does not need, and the `chromium-headless-shell` channel saves
negligible time while giving up `--headed` debugging.

### 2026-07-31 — pre-commit runs `vitest related`, not `test:unit`

**Plan said:** T0.7 — a pre-commit hook running "`format:check`, `lint`, `test:unit` on
staged files".

**What is true:** `test:unit` is a whole-workspace script; it cannot take a file list,
so "on staged files" was only ever achievable for the first two. `vitest related --run
<files>` is the primitive that does what the plan meant: it runs the tests whose module
graph includes the changed files. Verified — staging `apps/server/src/env.ts` selects
`src/env.test.ts` (4 tests), staging `apps/web/src/routes/+layout.svelte` selects
`tests/app-shell.test.ts` (8 tests), across the source/test directory boundary.

**Did:** four parallel pre-commit jobs — `format`, `lint`, `test-server`, `test-web`.
The two test jobs use lefthook's `root:` option, which both filters the staged list to
that workspace and runs the command there; the latter is not optional, since
SvelteKit's Vite plugin resolves `$lib` and `$app` against the working directory (the
same constraint that shaped T0.6). Corrected `10-m0-foundation.md`.

### 2026-07-31 — everything in a git hook is cached or scoped

**Not in the plan.** A slow hook is a skipped hook, so nothing in pre-commit runs over
the whole repo: `prettier --check --cache`, `eslint --cache` (both writing to
`node_modules/.cache/`, already git-ignored), and `vitest related` for the tests.
Measured at 0.13–1.7s. The full unscoped gate is pre-push.

**Caching is not only for the hooks.** `--cache` moved into the root `lint`, `format`
and `format:check` scripts rather than being duplicated in `lefthook.yml`, so pre-push,
local `bun run verify` and CI all share one warm cache. Unscoped and uncached were
never the same property: pre-push still checks every file, it just stops re-deriving
answers it already has. Measured here — lint 2200ms → 443ms, format 560ms → 173ms.

**Cache locations:** Prettier's `--cache-location` was specified and then removed — its
default is already `node_modules/.cache/prettier/.prettier-cache`, confirmed by
deleting the directory and watching Prettier recreate exactly that path. ESLint uses
its default `.eslintcache` too; both are git-ignored, alongside `*.tsbuildinfo`. Both
use `--cache-strategy content` over the default `metadata`: a cache an mtime can fool
does not belong in front of a commit.

**The hooks call scripts, never commands.** `lefthook.yml` contains no tool
invocations — every job is `bun run <script>`. The hooks decide _when_ and over _what_,
package.json decides _how_, so there is one definition of how to lint this repo. That
needed two small changes: `format:check` no longer hard-codes `.` (callers pass a
target, so hook-supplied paths scope the run instead of adding to a whole-repo one, and
`verify` passes `.` explicitly), and each app gained a `test:related` script. `lint`
needs no target — ESLint defaults to the working directory, verified.

**Why that is safe, checked rather than assumed:** ESLint keys entries on
`hash(eslintVersion + nodeVersion + resolvedConfig)`
(`lib/cli-engine/lint-result-cache.js:56`), so editing `eslint.config.js` invalidates
them. Proven end to end — with a warm cache, adding an error to `env.ts`, a file the
cache had already recorded as clean, still failed the lint. The residual gap is a
plugin upgrade that adds rules without changing config, which is why the CI cache key
includes `bun.lock`.

Lefthook 2.1.10 uses `jobs:`, not the 1.x `commands:` map — confirmed against the
`schema.json` the package ships rather than from memory. `bunx lefthook validate`
passes. Hooks install from the root `prepare` script, so a fresh clone gets them from
`bun install`; added `packageManager: bun@1.2.13` so CI pins the same Bun.

**Proven, not assumed:** a file with two ESLint errors was staged and `git commit` was
attempted for real. The commit was rejected and `HEAD` stayed on `92838e6`.

### 2026-07-31 — the gate parallelises by workspace, not by stage

**Not in the plan.** `verify` is five stages run with `&&`. Measured warm, serially:
build 5.3s, check 1.8s, test 1.5s, lint 0.45s, format 0.17s — 10.3s total against a
5.8s critical path, so pre-push was first written to run the five stages as parallel
lefthook jobs. That was wrong, and the comment claiming the stages were independent was
wrong with it.

**What is actually shared.** `check`, `test` and `build` all run SvelteKit's sync.
Kit's `write_if_changed` (`@sveltejs/kit/src/core/sync/utils.js`) compares against a
per-process `Map`, not against disk, so the map is empty in every fresh process and all
of `apps/web/.svelte-kit/` is rewritten unconditionally with a non-atomic
`writeFileSync` — three writers and several readers on the same files, every run.
Vitest is louder about it: it deletes and recreates `coverage/.tmp` and aborts with
"Something removed the coverage directory … Make sure you are not running multiple
Vitests with the same `coverage.reportsDirectory`". Repeated sequential runs of the
racy config all passed, which is exactly what an intermittent race looks like; it was
found by reading Kit's source, not by re-running the hook.

**Then measured, because source-reading is not proof.** A second sync with byte-identical
content still moves the file's mtime, confirming the rewrite is unconditional across
processes. With a reader spinning on `.svelte-kit/types/src/routes/$types.d.ts` while 12
syncs ran: 28,231,863 correct reads, 400 zero-length reads, and 5,775 reads where the
file did not exist. The window is not theoretical — it is thousands of observations wide
per sync, and `svelte-check`, `vite build` and Vitest are all readers of that file.

**The fix.** Parallelise along the axis where nothing is shared: lint, format, the root
`tsc` and each workspace run concurrently, while `check → test → build` within a
workspace are `piped`. Warm, ten runs: 7.1s against `verify`'s 9.1s. Smaller than the
5.9s the racy version reported — some of that number was concurrency the code could not
actually support.

**`root:` is not a working directory for `bun run`.** The first fix used lefthook's
`root: apps/web/`. It scopes the staged file list, but `bun run check` still resolved
the root `package.json` and fanned back out over every workspace — so both groups ran
the whole test suite at once, which is what triggered the coverage collision above. The
jobs use `bun run --filter '@house-elf/web' …` instead, which resolves the package
directly.

**Scoped to what is being pushed.** The per-workspace groups carry a `glob`, so a
web-only push does not build the server. The shared inputs — the lockfile,
`package.json`, `tsconfig.base.json`, `vitest.shared.ts`, `packages/**` — appear in
every list, because they can break every workspace.

The repetition is deliberate. YAML cannot concatenate sequences, so it cannot express
"the shared list plus my own directory". It can be avoided by inverting the lists into
"everything except the other workspaces" and factoring the common part out with an
anchor, which was tried and reverted: it worked, but reading it required knowing both
why the list was inverted and what `&code` referred to, to save six lines that change
about once a year. Plain and repetitive beat clever and terse.

Putting the shared inputs inside each workspace's own scope, rather than giving them a
separate job that runs `verify`, is also deliberate. A push touching both the lockfile
and `apps/web` would then have run that job concurrently with the web group — two
SvelteKit syncs at once, reintroducing exactly the race above.

Verified with `lefthook run pre-push --file`: a web file runs web alone (4.1s), a server
file runs server alone (6.8s), `packages/shared/src/index.ts` and `bun.lock` each run
all three (7.1s), and a docs-only push runs lint, format and the root `tsc` and nothing
else — 0.5s, where previously it built and tested both apps.

`lint`, `format` and the root `tsc` stay unscoped; together they are under two seconds
and narrowing them would buy nothing while adding a way to miss something.

The fallback is the safe one: with no upstream configured, lefthook does not compute an
empty push list and skip everything — it runs the lot. Confirmed on `master`, which has
a remote but no upstream.

`verify` itself stays serial and stays the canonical one-command gate — cheapest checks
first, so a failure surfaces fast, and CI keeps running it as a single command so the
definition is exercised rather than only its decomposition.

CI is split differently: two parallel jobs, `verify` and `e2e`, rather than per-stage. A
five-way matrix would pay five checkouts and installs to parallelise stages that take
under two seconds each. E2E is the case worth splitting — it shares no state with
`verify` and is the longest pole, browsers plus a build plus a dev server, so running
it after the other checks only added its cost to the wall clock.

### 2026-07-31 — `--incremental` helps tsc, but tsc is not the bottleneck

**Not in the plan.** Added to the root and server `tsc --noEmit` invocations, which is
allowed and writes `*.tsbuildinfo` beside each config. Honest numbers: root 1787ms →
1719ms (that project is three files), server 747ms → 611ms. Real but small.

Two things it does not fix. `svelte-check` is the largest part of `check` at 1312ms and
has no incremental mode. And `bun run --filter '*'` already fans the workspaces out in
parallel, so `check` was never the sum of its parts.

### 2026-07-31 — the CI workflow triggered on a branch that does not exist

**What was true:** it was written against `main`; the repository's only branch is
`master`, and there is no remote configured at all. It would never have fired, so the
claim that "CI must go green" was unfalsifiable.

**Did:** pointed the trigger at `master` (`19ce74c`). The larger question — whether a
single-developer project needs CI, and whether the host is GitHub or Codeberg — is
deliberately parked until a remote exists. Everything the workflow does is
`bun run verify`, so the logic is portable; only the `uses:` lines are host-specific.
Forgejo Actions mirrors the syntax but resolves actions differently, and Codeberg's
runner and service-container support needs checking rather than assuming.

**Update, same day:** `origin` now exists (`github.com:nanbratan/house-elf`), so the
host question is settled and the workflow can finally be falsified. `master` has no
upstream yet — the first push will be the first real test of both CI and the pre-push
hook's file selection.

### 2026-07-31 — `dev` does not start Docker; `dev:all` does

**Plan said:** T0.8 — "Root `dev` script brings up Postgres, then runs the Mastra server
and the SvelteKit dev server".

**What was decided:** two scripts instead of one. `dev` runs only the app servers;
`dev:all` is `db:up && dev`. Starting containers is a side effect worth opting into,
and it keeps `dev` usable when Postgres is already running — the common case.

`db:up` gained `--wait` (Compose v5.1.2), so it returns only once both containers pass
their health checks rather than once they exist. Without it `db:up && dev` would
reintroduce the very race the sequencing exists to remove. Costs 636ms when the
containers are already healthy.

Not done, deliberately: no teardown on Ctrl-C, since that would wipe the tmpfs test
database and make the next start pay a full init; and no starting of the Docker daemon
itself, which is not a dev script's business.

Worth stating plainly because it caused confusion: **nothing but Postgres runs in
Docker.** Both apps run natively under Bun, so Vite HMR and `mastra dev`'s watcher are
unaffected.

**Verified by running it:** `bun run dev:all` waits for both containers to report
healthy, then starts both servers with prefixed output. `http://localhost:5173/` and
`/c/abc` return 200, Studio returns 200 on `:4111`, and `/api/agents` lists `general`
on `anthropic/claude-haiku-4-5`. Ports documented in a new root `README.md`, which did
not exist before. Corrected `10-m0-foundation.md`.

**One defect found by running it**, which is the point of running it: Vite watches the
project directory, and the coverage reporter writes HTML into it, so running the tests
while `dev` was up produced a burst of page reloads — one per generated file. Fixed
with `server.watch.ignored: ['**/coverage/**']` in `apps/web/vite.config.ts`. Confirmed
by starting `dev`, running the coverage suite and counting zero coverage-triggered
reloads, against dozens before.

### 2026-07-31 — CI Postgres must be the pgvector image

**Plan said:** "GitHub Actions workflow running `bun run verify` on push, with Postgres
as a service container."

**What is true:** the stock `postgres:17` image would fail the integration suite, which
asserts `CREATE EXTENSION vector` works. The service container uses
`pgvector/pgvector:pg17`, matching `infra/docker-compose.yml`.

**Did:** `.github/workflows/verify.yml` — `verify` then E2E, with three caches: Bun's
global module cache keyed on `bun.lock`, `node_modules/.cache` (ESLint, Prettier, Vite
transforms) keyed on lockfile + branch with fallbacks, and the Playwright browsers
keyed on `bun.lock`. The HTML report uploads on failure. No `.env` file is written;
the connection strings are workflow `env`, which works because the integration-test
loader treats the `.env` file as optional and falls through to the environment.
`ANTHROPIC_API_KEY` is deliberately absent — nothing in `verify` calls a provider, and
that stays true until M1.

## Open questions

Things needing a human answer. Remove once resolved.

- _(none)_
