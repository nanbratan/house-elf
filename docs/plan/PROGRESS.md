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
- [x] **DoD verified** — 2026-07-31

Every item checked by running it, not by reading it: both Postgres containers start and
accept connections; `bun run dev:all` brings them up and starts both servers with no
errors; Studio lists `general` and returns a real streamed response; `bun run verify`
passes; the coverage gate was proven to fail on purpose in T0.6; pre-commit rejected a
real commit containing lint errors; `:5173` and `/c/anything` render the shell and their
placeholders, and the sidebar toggle works; CI is green on `master` (runs 30624218672
and 30624316521, ~1m10s each); and a full teardown — volumes and `node_modules` removed
— rebuilt and passed from scratch.

## M1 — Chat end to end → [11-m1-chat-e2e.md](11-m1-chat-e2e.md)

- [x] T1.1 Expose an AI SDK chat endpoint
- [x] T1.2 A tool worth watching
- [x] T1.3 SvelteKit proxy route
- [x] T1.4 Chat UI
- [x] T1.5 Streaming quality
- [x] T1.6 Tests
- [x] **DoD verified**

## M1.5 — Choosing the model → [11b-m1.5-model-selection.md](11b-m1.5-model-selection.md)

- [x] T1.5.1 The allowlist
- [x] T1.5.2 Reject an unnamed or unknown model at the chat route
- [x] T1.5.3 Carry the choice through the proxy
- [x] T1.5.4 The picker
- [ ] T1.5.5 A scripted model for the E2E
- [ ] T1.5.6 Documentation
- [ ] **DoD verified**

## M1.6 — Thinking on demand → [11c-m1.6-polish.md](11c-m1.6-polish.md)

- [x] T1.6.1 Thinking is a toggle, not a model property
- [x] T1.6.2 A quieter focus ring on the composer
- [x] T1.6.3 Clicking the composer's empty space focuses the input
- [x] T1.6.4 Documentation
- [x] **DoD verified**

## M1.7 — Any OpenRouter model → [11d-m1.7-openrouter.md](11d-m1.7-openrouter.md)

Plan reviewed against the live OpenRouter API on 2026-08-03 and substantially
corrected before any code — see the decision-log entry of that date.

- [x] T1.7.0 OpenRouter becomes the transport
- [x] T1.7.1 Server-side catalog fetch
- [x] T1.7.1b The catalog comes from `/models/user`
- [x] T1.7.3 A mid-stream error says what actually went wrong
- [x] T1.7.2 Shared schema rewrite
- [x] T1.7.4 Searchable, filterable, date-grouped model picker (model choice only)
- [x] T1.7.5 Documentation
- [x] T1.7.6 Pinned / favorite models
- [ ] T1.7.7 Per-model settings: the server contract
- [ ] T1.7.8 The settings picker
- [ ] **DoD verified**

T1.7.3 (provider icons) was removed during the review, not skipped; the number was
reused on 2026-08-04 for the mid-stream error task. T1.7.1b and T1.7.3 were split
out of T1.7.2 the same day and run before it — both change committed code, and
T1.7.2 is already the largest task in the milestone. Numbering of the surviving
tasks is otherwise left alone so the plan doc and this list agree.

## M2 — Threads and memory → [12-m2-threads-memory.md](12-m2-threads-memory.md)

- [ ] T2.1 Memory configuration
- [ ] T2.2 Thread lifecycle
- [ ] T2.3 Conversation list
- [ ] T2.4 Thread titles
- [ ] T2.5 Load an existing conversation
- [ ] T2.6 New conversation page
- [ ] T2.7 Tests
- [ ] **DoD verified** — incl. the cross-thread working-memory check

## M2.1 — Prompt caching → [12a-m2.1-prompt-caching.md](12a-m2.1-prompt-caching.md)

Stub only. Raised during M1.7. Placed after M2 because caching needs a long prefix
that is stable across turns, and thread history does not exist until M2; placed
before M2.5 because web search injects per-turn content that must not land ahead of
the cache breakpoint. Carries a correctness item beyond cost: without an explicit
`session_id`, `openrouter/auto` can resolve to a different model on each turn of one
conversation.

## M2.5 — Web search → [12b-m2.5-web-search.md](12b-m2.5-web-search.md)

Stub only. Raised during M1.7 and deliberately deferred; the document records why
and what is already verified. Needs a planning session before any task list.

## M2.6 — Image generation → [12c-m2.6-image-generation.md](12c-m2.6-image-generation.md)

Stub only. Placed after M2.5 so the message-part renderer and its persistence are
extended once rather than invented twice. Needs a planning session before any task
list, and its first decision — which of OpenRouter's three image routes this app
uses — changes the shape of everything after it.

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

### 2026-07-31 — custom `apiRoutes` mount at the root, not under `/api`

**Plan said:** nothing explicit, but the README's port table ("Studio at `/`, agent API
at `/api`") invites the assumption that a custom route lands at `/api/chat/:agentId`.

**What is true:** measured, not assumed. `POST /chat/general` → `200`,
`content-type: text/event-stream`. `POST /api/chat/general` → `404 Not Found`. The
`/api` prefix belongs to Mastra's _built-in_ routes (`/api/agents/:id/generate`);
`server.apiRoutes` entries mount at the origin root. Mastra's own docs agree — their
`useChat` example points a transport at `http://localhost:4111/chat`.

Also worth knowing: `GET /chat/general` returns `200 text/html`, which looks like the
route answering a wrong method but is Studio's SPA catch-all. Confirmed by the
`content-type` and an HTML body. Not a defect.

**Did:** recorded. T1.3's `MASTRA_URL` must therefore be the bare origin
(`http://localhost:4111`) with the proxy targeting `/chat/${agentId}` — no `/api`.

**Corrected:** nothing yet; T1.3 will state the URL shape when it lands.

### 2026-07-31 — `ai@7` is installed; `chatRoute`'s `version` only knows v5 and v6

**Plan said:** `11-m1-chat-e2e.md` — "If AI SDK v6 typings are in play, `chatRoute()`
needs `version: 'v6'`. Check which major version of `ai` got installed and match it."

**What is true:** the installed `ai` is **7.0.42**, so "match it" has no valid answer —
`version` accepts only `'v5' | 'v6'`. `@mastra/ai-sdk@1.7.0` declares no `ai` peer
dependency at all and vendors both v5 and v6 type trees under `dist/_types/`.

Tested rather than reasoned about: the emitted chunk sequence was captured under both
settings for the same prompt and diffed. **Identical** — `start`, `start-step`,
`text-start`, `text-delta{id,delta}`, `text-end`, `finish-step`, `finish`, `[DONE]`.
The `text-delta` shape also matches `UIMessageChunk` as declared in the installed
`ai@7`'s `index.d.ts` (`{ type, id, delta, providerMetadata? }`). A text-only response
cannot discriminate the two; the difference lives in tool and approval parts (the v6
path has an `extractV6NativeApprovals` the v5 path does not).

**Did:** left `version` unset (default `'v5'`) with a comment in
`apps/server/src/mastra/index.ts` recording why, and deferred the decision to T1.4 when
`@ai-sdk/svelte` is installed and tool parts exist to test against.

**Corrected:** `11-m1-chat-e2e.md` — the v6 note now states the `ai@7` situation and
points the decision at T1.4.

### 2026-07-31 — streaming is progressive; first measurement was an artifact

**What is true:** the first timing run spawned a `python3` process per SSE line, which
added ~18 ms of latency per line and made the stream look like it arrived in two
chunks. Re-measured with a single long-lived reader: text deltas arrive from 923 ms to
2186 ms in roughly 200 ms increments. Streaming is genuinely incremental; the
batching is provider/transport granularity, not buffering in our stack.

**Did:** recorded, as a caution that a slow consumer can masquerade as a
non-streaming server. Kept for T1.5, which has to make this same judgement again in
the browser.

### 2026-07-31 — agent errors surface as in-stream chunks, not HTTP status codes

**What is true:** `POST /chat/general` with `{"messages": []}` returns **200** and a
normal SSE stream whose payload contains
`{"type":"error","errorText":"...AI_APICallError..."}`. An unknown agent
(`/chat/nope`) is different — it fails before streaming starts, returning `500` with
`{"error":"Internal Server Error"}` in ~10 ms and no detail leaked.

**Did:** recorded. This is directly load-bearing for M1 DoD item 4 ("trigger an error
→ the UI shows a readable error"): the UI must render `error` **parts**, not rely on a
non-2xx response, and T1.3's proxy must not try to interpret status codes.

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

### 2026-07-31 — `bun run verify` breaks a running Studio until the dev server restarts

**What is true:** `verify` ends in `mastra build`, which rewrites
`apps/server/.mastra/output` — the same directory `mastra dev` serves Studio's static
assets from. The build removes `output/studio/`, so a Studio tab that worked a moment
earlier starts returning `500` with `{"error":"Internal Server Error"}`, and the dev
log shows `ENOENT ... /output/studio/index.html`. The **API keeps working** throughout;
only Studio's own UI breaks, which makes it look like a code fault rather than a
clobbered directory.

**Did:** restarted `mastra dev`, which regenerates the assets. Recorded rather than
worked around — the fix is simply to restart the dev server after running `verify`.
Worth knowing before debugging a "broken" Studio for the second time.

### 2026-07-31 — `createTool()` differs from the plan's assumptions in three ways

**What is true**, all found by `tsc` rather than by reading:

- `execute` receives the **validated input directly** as its first parameter, not a
  `{ context }` wrapper. Its second parameter is **required** when calling the tool
  by hand, and that context has two non-optional members, `observe` and
  `requestContext`. Mastra exports `noopObserve` from `@mastra/core/tools` and
  `RequestContext` from `@mastra/core/request-context` for exactly this.
- `execute` is **optional** on the resulting `Tool` type, so a direct call has to
  narrow it first.
- `tool.outputSchema` is a `StandardSchemaWithJSON`, **not** the Zod object that was
  passed in — it has no `.parse()`. Tool schemas are Standard JSON Schema, so Valibot
  and ArkType work too.

Also worth noting: the editor's inline diagnostics reported this file clean while
`tsc` reported five errors in it. `bun run check` is the authority, not the squiggles.

**Did:** unit-tested the pure `currentTimeIn(timeZone, now)` function (the clock is a
parameter, per `02-conventions.md`) and called `execute` once through a real context to
cover the wiring. Added the `src/mastra/tools/**` coverage threshold (90/85) that
`vitest.config.ts` had left a comment reserving; confirmed via the resolved config that
it merges with, rather than replaces, the shared global 80/75.

### 2026-07-31 — streamed tool parts are keyed by the agent's tool key, not the tool id

**What is true:** the tool is declared with `id: 'get-current-time'`. Whatever key it is
registered under in the agent's `tools` object becomes the `toolName` in the stream —
the `id` never appears. Registered as a shorthand `{ getCurrentTimeTool }`, the model
and the UI both saw `getCurrentTimeTool`, import-name warts and all.

**Did:** registered it explicitly as `{ getCurrentTime: getCurrentTimeTool }` so the
model-facing name is deliberate rather than a side effect of the import name, and
corrected the agent instructions, which had been referring to the tool by its `id`
(`get-current-time`) — a name the model never sees. Re-verified over curl that
`toolName` is now `getCurrentTime`.

That drift was the argument for deleting the sentence entirely: when and how to call a
tool belongs in the tool's own `description`, beside the code, where it cannot fall out
of step with the registration. `generalAgent`'s instructions are now one line of
behaviour. Confirmed empirically that nothing was lost — with the sentence gone, "What
time is it in Tokyo?" and the indirect "What day of the week is it today?" both still
call `getCurrentTime`, and "What is the capital of France?" still does not.

Observed lifecycle for "What time is it in Tokyo?": `tool-input-start` →
`tool-input-delta` (×2, the JSON arriving in fragments: `{"timeZone": "Asia/Tokyo`
then `"}`) → `tool-input-available` → `tool-output-available`, then a second
`start-step` for the text answer.

Two consequences for T1.4: the renderer keys `tool-*` parts off the registration key,
so renaming that key is a model- and UI-visible change; and the partial-input deltas
are real, which is what the milestone means by "must render sensibly while arguments
are still streaming in".

### 2026-07-31 — the web app now has its own `.env`, as the root one predicted

**What is true:** the root `.env.example` and `apps/web/vite.config.ts` both already
said the SvelteKit app would get its own `apps/web/.env` when it first needed a
variable, and that Kit resolves `$env/*` against `kit.env.dir`, which defaults to
`apps/web`. T1.3 is that moment. Created `apps/web/.env.example` holding exactly one
variable, `MASTRA_URL`.

It is read through `$env/dynamic/private` — not `static`, so the origin can change at
deploy time without a rebuild, and not `PUBLIC_`, so it never reaches the browser. The
handler throws a 500 when it is unset rather than defaulting to `localhost:4111`: a
silent fallback would turn a production misconfiguration into a connection error
pointing at the wrong machine.

### 2026-07-31 — proving the proxy does not buffer

**What is true:** "streams through unchanged" is easy to assert and easy to get subtly
wrong, so it is asserted two ways.

In the unit test, by **identity**: the `ReadableStream` handed to the fake `fetch` must
be the very object that comes back out (`expect(response.body).toBe(body)`). Nothing
can have read it to completion on the way through. Comparing contents would have passed
even for a fully buffered copy.

In the browser-facing check, by **timing** — through the proxy, using a single
long-lived reader, as the T1.1 lesson requires: first frame at 0 ms, then 854 ms,
1078 ms, 1163 ms. Arrivals spread across the reply, not delivered in one lump at the
end.

Also confirmed live through `localhost:5173`: `content-type: text/event-stream`,
`Transfer-Encoding: chunked`, and the full tool lifecycle (`tool-input-start` →
deltas → `tool-input-available` → `tool-output-available`) arriving intact, plus a
`500` from an unknown agent passed through unexamined.

**Did:** the handler reads the request body in full (`await request.text()`) but never
touches the response body. That asymmetry is deliberate and commented: the request is
a complete JSON message list that has already arrived, so buffering it costs nothing,
while the response is the thing that must stay live.

### 2026-07-31 — T1.4 is two commits, and where the chat lives

**What is true:** T1.4 as planned bundles "talk to the agent at all" with "render every
part type well". Those fail differently, so they are split: (a) a `Chat` wired to the
proxy rendering text parts only, proven in a browser; (b) the full part renderer,
auto-scroll and error handling.

The UI decisions, all confirmed with the user: the chat lives at **`/c/new`**, keeping
the `/c/` namespace so M2 can swap the URL to `/c/<id>` on first message without moving
files; messages are **Claude-style** — both roles full width, distinguished by a subtle
background and a small role label, not by side; tool cards will **auto-expand while
running and collapse to one line when done**, with a running indicator so a slow tool
never looks frozen; scrolling up **stops the auto-follow** and offers a "jump to
latest" button. The last two are part (b).

### 2026-07-31 — `resolve.conditions: []` is not "the default"

**What is true:** the browser crashed on `ReferenceError: process is not defined`, from
`@vercel/oidc` reading `process.version` at module scope — reached via `ai` →
`@ai-sdk/gateway`. The first fix attempted was a `window.process` shim in `app.html`.
That was whack-a-mole: it merely advanced the crash to `os.platform is not a function`.
It was reverted.

The real cause was ours. `apps/web/vite.config.ts` carried
`resolve: { conditions: mode === 'test' ? ['browser'] : [] }`. An empty array does not
mean "leave Vite alone" — it **replaces** Vite's defaults, dropping `browser`. So
`@vercel/oidc`, which ships `"browser": "./dist/index-browser.js"` in its exports map
and whose browser build is a no-op, resolved to its Node build in the browser.

**Did:** spread the key in only when it is needed —
`...(mode === 'test' ? { resolve: { conditions: ['browser'] } } : {})` — so outside
test the option is absent rather than empty. Lesson: for Vite resolution options,
"absent" and "empty" are opposites.

### 2026-07-31 — one copy of `ai` in the browser

**What is true:** `@ai-sdk/svelte@5.0.44` declares an exact `ai@7.0.44` dependency
(its dist-tags map majors: `ai-v5` → 3.x, `ai-v6` → 4.x, `latest` → ai v7). The root
already had `ai@7.0.42` for the server via Mastra. `ai` is therefore pinned exactly at
7.0.44 in `apps/web` so the app and its Svelte binding share one instance rather than
shipping two subtly different stream parsers.

### 2026-07-31 — a SIGKILLed esbuild binary, not a broken build

**What is true:** `mastra build` began failing with `Mastra Build failed: The service
was stopped`, which reads like a Mastra problem and is not. Running
`node_modules/@esbuild/darwin-arm64/bin/esbuild --version` directly exited **137** —
SIGKILL. macOS was killing the binary because its ad-hoc code signature no longer
matched its contents after a `bun install` rewrote it.

**Did:** `codesign --force --sign - node_modules/@esbuild/darwin-arm64/bin/esbuild`.
Binary runs, build green. Worth remembering: any "the service was stopped" from esbuild
on macOS should be checked by running the platform binary by hand before believing the
tool that reported it.

### 2026-07-31 — rendering model output: escape everything, highlight synchronously

Four decisions taken while building the part-driven renderer (T1.4 part (b), chunk 1).

**Sanitising.** All raw HTML in a model's markdown is escaped at the parser, and links
whose scheme is not `http:`, `https:` or `mailto:` are rendered as plain text. No
DOMPurify, no allow-list of "safe" tags. The model's output is untrusted input that
lands in `{@html}`; the only cheap way to be sure is for the pipeline to be incapable
of emitting markup the renderer did not write. Rejected: allowing a subset of HTML —
it buys nothing a chat reply needs and turns every future escape from the sanitiser
into an XSS.

**`marked` 18 replaces the renderer, it does not merge it.** Passing a partial
`renderer` in `parse()` options throws `this.renderer.paragraph is not a function`,
because the object supplied becomes the renderer. Partial overrides have to go through
`new Marked(options, { renderer })` (or `.use()`), which is what `src/lib/markdown.ts`
does.

**The highlighter is awaited at module scope.** `createHighlighterCore` is async but
`HighlighterCore.codeToHtml` is not, so awaiting once at import time makes
`renderMarkdown` synchronous — and that lets `Markdown.svelte` use a plain `$derived`
instead of an `$effect` that assigns to `$state`. The Svelte MCP autofixer flagged the
`$effect` version as malpractice and it was right: with an effect, every streamed token
re-renders through a pending state that can flicker.

**Theme: `catppuccin-mocha`, exported as `codeTheme`.** Chosen for legibility against
the near-black canvas without being garish. It is the only place code colours are set,
so swapping themes is a one-line change; the surrounding frame lives in `layout.css`.

**Deviation from the plan: `source` parts are not built.** `11-m1-chat-e2e.md` lists a
citation chip. Nothing in the app emits a source part yet, so it would be untested
scaffolding — against the "do not scaffold ahead" rule. The milestone doc has been
amended in this commit to defer it to M4. `reasoning` _is_ built, because M2's
Definition of Done requires reasoning from previous turns to survive a reload.

### 2026-08-01 — we are not the first people to build a chat UI

**The question:** whether choosing Svelte was a mistake, given that Vercel's AI
Elements already provides every component being hand-written here — and whether the
project should move to React to use it.

**Answer: stay on Svelte, but stop starting from a blank page.** Two things settled
it. First, AI Elements is a _registry_, not a library: `npx ai-elements add` copies
`.tsx` into your repo and you own it from then on. Adopting it means owning ~29 React
files plus shadcn, Radix and CVA — the maintenance does not disappear, only the first
draft does. Second, the genuinely hard part of M1 was Mastra's stream protocol meeting
the client, and `@ai-sdk/svelte` had already solved that; AI Elements sits above that
layer and never touched the risk. The frontend decision in `01-decisions.md` (D2)
stands unchanged.

**But the survey was worth it, and four things came back.** Both repos are cloned to
`~/reference/` for future milestones. Vercel's is the source of truth; the unofficial
Svelte port is only consulted for how a pattern translates into runes.

**`remend`, not `streamdown`.** AI Elements renders markdown with `streamdown`, which
is React ("a drop-in replacement for react-markdown"). But its self-healing half is
published separately as `remend`: 12 KB, zero dependencies, no framework, Apache-2.0,
`(text: string) => string`. Measured against our renderer, half-arrived text really
did render its markup literally — `a **bol` showed the asterisks until the pair
closed, then snapped into bold. Fenced code and tables were already fine. `remend` now
runs in front of `marked`. Worth noting `streamdown` itself is built on `marked`, so
the pipeline chosen here was not the naive one — only the repair step was missing.

**The tool card had the wrong states.** Ours collapsed the two approval states into
one and never handled `output-denied`. All seven are now enumerated in a `Record` keyed
by the SDK's own union, so a state we have not considered is a compile error rather
than a mislabelled card. Input and output are highlighted with the Shiki instance the
markdown renderer already builds. Their `Tool` has no auto-expand behaviour, so ours
was kept.

**Reasoning now measures itself.** Ported from their `reasoning.tsx`: open while the
model thinks, report the duration in seconds, and collapse one second after the last
token so the final words stay readable. Writing to state from an `$effect` is
deliberate here — elapsed time is not derivable from current state — and is the same
approach they take with `useEffect`. Building it surfaced a real bug: keying `open` on
`streaming` closed the pane the instant streaming stopped, so the linger never
happened. It is keyed on having _started_ instead, and there is a test for it.

**Enter and IME composition.** Their prompt input tracks `compositionstart` /
`compositionend` in addition to reading `KeyboardEvent.isComposing`, because that flag
is unreliable in some browsers. Ours read only the flag, which means Enter could have
sent half-composed Japanese, Chinese or Korean. Both signals are now checked.

**Attribution.** No source was copied — theirs is React — but the behaviours above came
from reading their work, so `NOTICE.md` credits it. Apache-2.0.

**Still deliberately not ported:** their `prompt-input` is 1,463 lines across ~60
exports (attachments, slash commands, model selection, tabs). Our composer is 60 lines
and does what M1 needs. `sources` and `inline-citation` are the M4 pieces; `canvas`,
`node`, `edge` and `connection` are the M5 ones.

### 2026-08-01 — a place for each file, decided once

Review of the first chat components found three things drifting, all the same
mistake in different clothes: naming a concept twice, and putting files wherever
the last one landed.

**Disclosure is one concept, so it has one module — and it is behaviour, not a
type.** `ToolCard` and `ReasoningPart` had independently invented "open, closed,
or follow whatever I am reporting on" — the card as `'auto' | 'closed' | 'open'`,
the reasoning pane as a `boolean | undefined` where `undefined` quietly meant the
same thing. Both now call `createExpansion(() => …)` from
`lib/state/expansion.svelte.ts` and read `expansion.isOpen` / `expansion.toggle()`.
This is Svelte's answer to a React hook: a module named `.svelte.ts` may use runes,
so a factory can own `$state` and `$derived` and hand back getters. No `use`
prefix — in Svelte `use:` means an action, so `useExpansion` would mislead. The
three states stay private to the module; callers get a question and a verb.

**A component does one thing.** The six-dot loader — markup, delay table,
keyframes and the `prefers-reduced-motion` fallback — was a third of `ToolCard`
and had nothing to do with tool calls. It is now `WorkingDots.svelte`.

**Effects do not use flags to undo their own damage.** `ReasoningPart`'s timing
effect reset `startedAt` to `null` both to mean "not started" and to mean "already
handled". Splitting it in two made it worse, not better — two effects, four
variables, and names (`measured`, `thoughtStartedHere`) that described the
bookkeeping rather than the thought. The real fix was to notice _why_ the guards
existed: an effect re-runs when reactive state it **reads** changes, and re-running
fires its cleanup, which was cancelling the linger timer. So there is one effect
again, it reads `streaming` and nothing else, and therefore runs exactly twice per
thought — no guard needed. The four booleans collapse into one named `phase`
(`absent → thinking → lingering → read`) plus a plain `startedAtMs`. Reactive state
is for what renders; plain variables are for what an effect remembers.

**Constants are not components.** `tool-state.ts` sat in `lib/components/chat/`
because that is where it was used, not because it belonged there. It is now
`lib/constants/tool-state.ts`.

**Layout mirrors itself.** `src/lib/markdown.ts` was in the root of `lib/` because
it was the first non-component thing written; it is now `lib/utils/markdown.ts`.
`apps/web/tests/` was flat, which forced test files into awkward names to stay
unique — `markdown.test.ts` versus `markdown-view.test.ts` for the module and the
component that renders it. Tests now mirror `src/`: `tests/utils/`,
`tests/components/chat/`, `tests/routes/`, with shared `tests/stubs/` and
`tests/setup/`. Component tests are named for their component, `ToolCard.test.ts`.
Vitest's `tests/**/*.test.ts` was already recursive, so no config change.

**Stubs assert at the level of the contract.** The `MessagePart` stub serialised
its props to JSON so `ChatView`'s tests could parse them back out — machinery
protecting an assertion `ChatView` does not owe. What `ChatView` owes its children
is a part of the right kind in the right order, so the stub now prints the part and
the tests read text. The three deeper stubs keep JSON, because `MessagePart`'s
contract genuinely _is_ the props it passes on.

### 2026-08-01 — sticking to the bottom with one rule instead of four

The Svelte port of AI Elements answers "are we at the bottom?" four ways at once:
a scroll listener, a `MutationObserver` on the subtree, an `IntersectionObserver`
watching a 1 px sentinel it injects into the DOM, and a `ResizeObserver` — feeding
two pieces of state, `isAtBottom` and `userHasScrolled`, that can disagree.

`lib/state/stick-to-bottom.svelte.ts` keeps the behaviour and drops the machinery:

- **One question, asked of the scroll position.** Distance from the bottom already
  says whether the reader has taken over. Within 200 px is following; further is
  not; scrolling back re-pins. There is no separate `userHasScrolled` flag to fall
  out of step with what is on screen, and no sentinel node to inject and clean up.
- **One signal for "there is more".** A `ResizeObserver` on the content box covers
  every cause at once — a token, a whole message, an image loading, the window
  narrowing and text reflowing — where the `MutationObserver` catches only DOM
  changes and needs a `requestAnimationFrame` to see their effect.
- **Two Svelte actions rather than a context.** The viewport and the content are
  `use:` targets, so nothing is exported through `setContext`/`getContext` and the
  wiring is visible in the markup.

Chasing the bottom is instant; the jump button is smooth. A smooth scroll would
still be animating when the next token lands, and the two would fight — but a
deliberate journey back to the end should be visible.

The scroller is `role="log"`, which is the correct role for a running transcript
and gives the tests a handle that is not a CSS class.

**Verified in a browser, because jsdom cannot judge this:** distance from the
bottom stayed at 0 through a 20-item streamed list; a real wheel scroll up revealed
the button; clicking it smooth-scrolled back and re-pinned. jsdom has no layout and
no `ResizeObserver`, so `tests/setup/resize-observer.ts` installs an inert one
globally and the tests swap in a controllable one.

**The rules are tested where they live.** The first version put all eight tests on
the component, which meant rendering a harness, a snippet and a `role="log"` lookup
in order to ask whether 200 px from the bottom counts as the bottom. The threshold,
the re-pinning and the two scroll behaviours belong to `stick-to-bottom.svelte.ts`
and are now tested against a bare `document.createElement('div')`; the component
substitutes a fake for the module and keeps four tests for the wiring only. Named
for that split: `StickToBottom.svelte`, not `Conversation.svelte`, because handling
the scroll is the whole of what it does.

**A stub that cannot fail is worse than no test.** Faking `ResizeObserver` and the
layout numbers risks tests that assert the fake. Two specific holes were found and
closed: the fake now records what it was asked to `observe`, so deleting
`observer.observe(node)` fails rather than passes; and the scroller is attached to
an element already scrolled partway up, so the first measurement on mount is
actually tested rather than agreeing with the `true` it was initialised to.

Then the suite was checked the only way that means anything — by breaking the
source ten ways (threshold moved, `if (pinned)` deleted, `auto` swapped for
`smooth`, `observe` removed, listener never removed, observer never disconnected,
`clientHeight` dropped from the arithmetic, first measurement skipped, the `{#if}`
inverted, the two actions swapped) and confirming each one goes red. All ten were
caught, and spot-checking two showed exactly one test failing, and the right one.

### 2026-08-01 — a failure is part of the conversation, not a dead end

T1.4 asked for "show the error, offer regenerate". Four decisions in how:

**Two sentences, in that order.** `error.message` is frequently "Failed to fetch",
which explains nothing to the person reading it and is the first thing you want in
a bug report. So the alert leads with "That reply did not arrive." and keeps the
raw text underneath in smaller, fainter print.

**The alert sits in the transcript**, where the reply would have been, rather than
floating over the page. The failure belongs to the exchange it interrupted, and
scrolling back should find it there.

**Nothing to dismiss.** `AbstractChat.setStatus` clears `state.error` on every new
request (verified in `node_modules/ai/dist/index.js`), so both Try again and simply
typing something else clear the warning. An explicit `clearError()` call and a
dismiss button would both be redundant.

**Try again re-asks rather than asking the reader to retype.** `regenerate()` with
no message id trims back to the last message and keeps it if it was the user's, so
the original question is re-sent as it stood.

The composer was already left usable in the `error` status — `Composer`'s `busy`
only covers `submitted` and `streaming` — and there is now a test saying so, since
it was true by accident rather than on purpose.

**Verified in a browser** by intercepting the proxy route with a 500, sending a
message, then removing the fault and pressing Try again: the original question was
re-asked without retyping, the alert cleared itself, and a real reply streamed in.
The invalid-API-key path from the milestone's manual checklist is still to do.

This does mean the unit tests dispatch their own `scroll` events, and so could
never have caught "nothing fires a scroll event here" — which is exactly the class
of bug the browser check is for. `03-testing.md` now says where that line falls.

### 2026-08-01 — the stream is chunkier than the UI, and it is not the UI's fault

T1.5 asks for three confirmations. All three are done, with numbers rather than
impressions.

**Tokens arrive progressively.** A 1,565-character reply painted in 18 separate DOM
updates, first paint at 1.0s, median 184ms between updates.

That works out at ~100 characters per update on a suspiciously regular cadence, so
the obvious follow-up was whether the UI was the thing batching. It is not. Reading
the raw stream off the proxy gave 21 network chunks at a 211ms median gap, and
`curl` straight to Mastra on :4111 put text deltas at 0.625, 0.853, 1.062, 1.275,
1.482 … — every ~210ms. The UI paints what it is given, as fast as it is given it.

What produces that ~210ms cadence is **not established**. It could be Anthropic's
delta size or something in Mastra's pipeline; a regular timer smells like batching,
but that is a guess and is recorded here as one.

**A mid-stream refresh loses the thread and nothing else.** Reloading 1.8s into a
stream gave no page errors, no stuck spinner, no phantom alert, and a usable
composer. The in-flight POST ended `net::ERR_ABORTED`, which is correct. The empty
transcript afterwards is expected — persistence is M2.

**Stop aborts, and the plan asked for weaker evidence than we have.** In the
browser, text froze mid-sentence at 999 characters and stayed frozen through four
further seconds, the Stop button went away, the composer came back, and the request
ended `net::ERR_ABORTED`.

The milestone said to confirm this by reading the server log. That was dropped, and
`11-m1-chat-e2e.md` is corrected to match. A dev-server log line is poor evidence:
an aborted request may log nothing at all, so absence proves nothing, and it is a
one-shot eyeball nobody repeats. The link we actually own is asserted on every test
run instead — `chat-proxy.test.ts` aborts a client controller and checks the
_upstream_ signal flips to `aborted`. Client abort → forwarded signal is proven;
what Mastra then does with a dead socket is the framework's responsibility.

Smoothing the cadence was considered and deferred: `chatRoute` takes an
`experimentalTransform` option and `@mastra/ai-sdk` exports a `smoothStream()`
factory for it, which would re-pace the existing backlog word by word. It is
cosmetic, it slightly delays the final token, and it would mask the ~210ms question
rather than answer it. Not done.

### 2026-08-01 — stubbing the stream at `fetch`, so the E2E can hold it still

T1.6's auto-scroll E2E needs a streaming reply, and the Playwright run starts the
SvelteKit dev server only — there is no Mastra behind it — so the stream has to come
from somewhere else.

**Not a route fulfilment.** `route.fulfill()` delivers a body whole. A transcript
that grows in one jump cannot distinguish "follows a stream" from "lands at the end
of one", and the interesting case — text arriving _while the reader is elsewhere_ —
cannot be staged at all.

**So `fetch` is patched in an init script**, exposing `window.__chat.emit()` and
`.finish()`. The test decides when each delta lands, which removes the timing
guesswork entirely: nothing is waited out, so there is nothing to flake. The chunk
shape was copied from a real response off the running server rather than invented,
so a change in Mastra's stream protocol will surface here.

This does skip the SvelteKit proxy, which is deliberate — the proxy is thin and has
its own tests, and these tests are about layout, which is the one thing jsdom cannot
judge.

`tsconfig.json` gained `"lib": ["ES2022", "DOM"]`: E2E code now runs partly inside
the browser via `page.evaluate`, which `shell.spec.ts` never needed.

**Mutated to prove it fails.** Removing the `scroll` listener failed exactly one
test, `lets a reader scroll back without dragging them down again` — and that is the
mutation the unit tests provably cannot catch, since they dispatch their own scroll
events. Dropping the `if (pinned)` guard so the view always chases the bottom failed
the same single test, at the "clicking Jump to latest returns to the end" step. Two
for two, right test both times.

### 2026-08-01 — the model belongs to the request, not the environment

D6 said model IDs live in environment variables, reasoning that swapping a model
should be "a restart rather than a commit". That undersold how often the swap
happens: asking two models the same question is the ordinary case, and an env var
makes it a restart _and_ a lost conversation.

Mastra's `Agent` takes `model` as either a value or a function of the request
context (`reference-agents-agent.md`), so per-request selection is native — no
restart, no rebuild. D6 has been rewritten; env vars now supply defaults rather than
the only option.

**With one condition.** The model name becomes user input on a path that spends
money and reaches every configured provider, so the server resolves it against an
allowlist or rejects it. The AI SDK's own reference implementation passes the request
body's `model` straight into `streamText()`; that is demo code. Mastra takes the
stricter line and documents it — request context is client-influencable, so it
reserves keys whose server-derived values always win over client-provided ones.

This became [M1.5](11b-m1.5-model-selection.md) rather than extra M1 tasks: it
changes the request path M1 has only just finished proving, and M2 will start
persisting messages, so it is better settled before there is a table full of them.

The same allowlist then solves T1.6's other complaint. The auto-scroll E2E currently
hand-writes Mastra's SSE frames inside a patched `fetch` — a protocol we do not own,
which can drift while the test stays green. A gated scripted model, built on
`MockLanguageModelV3` from `ai/test`, lets Playwright run the real Mastra server and
delete the stub. Two corrections came out of checking this: the plan's
`MockLanguageModelV2` does not exist in the installed `ai` (V3 and V4 only), and
Mastra publishes no E2E or UI-testing guidance at all — its testing docs are entirely
evals — so the approach is our call rather than a documented one.

### 2026-08-01 — a test that only proves Mastra is Mastra

T1.6 asked for an integration test: the agent calls `getCurrentTime` with the right
argument, against a mock model, no network. It was written, it passed, and two
mutations — removing the tool registration, emptying its description — each failed
it. Then it was deleted.

The mutations prove the assertions work, not that the test is worth its cost. Ask
instead what part of it is ours. Mastra parsing a tool call and running the tool is
Mastra's behaviour, covered by Mastra's own suite. What belongs to us is that the
tool is registered, that its schema field names match what `execute` reads, and that
its description is not empty. The middle one is a compile error — `createTool` types
`execute` from `inputSchema`, and `check` runs on every task. The first and last are
two properties.

Against that: a hand-built mock of a provider spec we do not own. `finishReason`
turned out to be `{ unified, raw }` rather than a string, and `result.toolCalls[]`
entries are chunk-shaped (`{ type, runId, from, payload: { toolName, args } }`)
rather than the AI SDK's flat `{ toolName, input }` — discoveries that cost more than
the coverage returned. It is the same objection that killed the hand-written SSE
stub, one layer down.

`currentTimeIn` keeps its own unit tests from T1.2, which cover the logic that is
actually ours. Registration and description get real coverage in
[M1.5](11b-m1.5-model-selection.md)'s E2E, where a scripted model drives the whole
pipeline and a missing tool shows up as the agent failing to answer — the symptom
that matters.

One correction survives the deletion: the accessor is `listTools()`, not
`getTools()`, and the M1 doc's `MockLanguageModelV2` is now `V3`, since the installed
`ai` ships V3 and V4 only.

### 2026-08-01 — the error screen was telling the browser where our files live

DoD step 4, the one path never exercised: swap the Anthropic key for a bad one and
see what the UI does. It did not crash or go blank — a `role="alert"` appeared, with
**Try again**, and the composer stayed usable. Underneath that sentence it printed
the provider's error object verbatim: `AI_APICallError`, the upstream URL, and a
stack trace full of absolute paths into this machine's home directory.

Unreadable for the person waiting, and once M6 puts this on the internet, it is a
stack trace served to strangers. `chatRoute` takes `onError: (error) => string`,
which decides what enters the stream, so the fix belongs there: the client gets a
sentence, the log keeps everything.

Categorised rather than generic, because the actions differ — a rejected key is
fixed, a rate limit is waited out, a 5xx is retried. `describeChatError` reads
`statusCode` and `name` defensively off an unknown value and never returns anything
derived from the error's own text.

**Confirmed by doing it again**: the browser showed "The model provider rejected our
credentials. Check the API key in the server environment." and nothing else, while
the server log still held the full `authentication_error` with its `request_id`. Key
restored, normal reply confirmed after.

The unit tests assert the absence of `x-api-key`, `node_modules`, `file:///`,
`api.anthropic.com` and `AI_APICallError` in the output — the leak, not the wording,
which will change.

Also settled while here: the duplicate dev processes in Open questions were a
22-hour-old vite serving :5173 against a fresh Mastra on :4111. Both pairs killed and
one clean `bun run dev` started before any of the above was measured.

### 2026-08-01 — the model id type gives no protection, so the list is all there is

T1.5.1. Three things found by reading the installed packages rather than the plan.

**`ModelRouterModelId` is not a closed union.** It looks like one —
`provider-types.generated.d.ts` enumerates every provider's models as string
literals — but it ends `| (string & {})`, so **every** string satisfies it. Typing
the allowlist against it would have looked like a compile-time guarantee and been
none. The runtime list in `src/mastra/models.ts` is the only boundary, which is
exactly what D6 says it is; recorded here so nobody later mistakes the type for a
second one.

**The registry knows which models are deprecated.** `provider-registry.json` carries
`deprecatedModels` per provider alongside `models`, and lists `claude-opus-4-1` and
its dated snapshot there. The `provider-registry.mjs` script does not surface that —
its `--provider anthropic` output prints all 15 entries undifferentiated — so
"exclude anything the registry does not report as available" needs the JSON, not the
script.

**So the allowlist tests read that JSON.** The one rule of this milestone that cannot
be checked by reading code is that no id was invented. `models.test.ts` resolves
`@mastra/core/package.json`, loads `dist/provider-registry.json` beside it, and
asserts every allowlist id exists under its provider and is not deprecated. Proven by
mutation: adding `anthropic/claude-imaginary-9` failed exactly that test, and adding
the deprecated `anthropic/claude-opus-4-1` failed it plus the "rejects an id it does
not offer" case. Reverted; `bun run verify` exits 0 with `models.ts` at 100%.

**Nine models, chosen by the user:** Opus 5, 4.8, 4.7, 4.6, 4.5; Sonnet 5, 4.6, 4.5;
Haiku 4.5. Dated snapshots are pins of the undated alias beside them and add nothing
to compare; `claude-opus-4-1` is deprecated; `claude-fable-5` was dropped by
preference. The picker groups **by family**.

**Not built yet, deliberately:** the entry has no field for a model _value_. Every id
here is its own router string, so a field that always equalled `id` would be
scaffolding for T1.5.5's scripted model. It lands with that model.

**Corrected:** `11b-m1.5-model-selection.md` T1.5.2 — the embedded docs are under
`dist/docs/references/`, not `dist/docs/`, and the request-context file is
`references/docs-server-request-context.md`.

**Also worth knowing:** `bun run format <paths>` does not scope the run. The script
hard-codes `.`, so extra arguments are appended to a whole-repo format rather than
replacing it. Harmless, but it is not the scoping `format:check` has.

### 2026-08-01 — no default on the server; naming nothing is an error (user decision)

**Plan said:** T1.5.1 — "One entry is the default, sourced from `AGENT_GENERAL_MODEL`
as today", and D6 — "Env vars stay as the source of defaults". The first version of
`models.ts` did exactly that: `resolveModel(undefined)` returned `defaultModel`, and
the env var was validated against the allowlist at import.

**Decided instead:** the server has no default at all. `resolveModel` throws for
`undefined` and `null` just as it does for an unknown id, and `models.ts` no longer
imports `env`. The client picks the initial selection, so every request carries a
model.

**Why it is the better boundary, not just a preference.** A default is a second way
to spend money that nobody chose and nothing shows. If the picker regresses and stops
sending the field, a defaulting server answers normally on a model the reader did not
pick — the failure is invisible until the invoice. Throwing turns that same bug into a
visible error on the first message. It is the same argument that put the allowlist
there in the first place, applied to the empty case.

**Studio is probably fine — corrected.** An earlier note here claimed Studio's chat on
`:4111` would break. The docs say otherwise: Studio's message box has its own model
picker, and the server takes a request-scoped `model` override that bypasses the
agent's configured model entirely (`reference-agents-getLLM.md`, and
`docs-server-mastra-server.md`: "pass `model` to override the agent's configured model
for a single request. If you omit `model`, Mastra uses the model already configured on
the agent"). So Studio breaks only in the case where it sends no model and falls
through to our callback. **Verify this by using Studio at T1.5.2** rather than trusting
the paragraph you are reading.

`AGENT_GENERAL_MODEL` still exists and is still read by `env.ts`, because
`agents/general.ts` has not been converted yet. It goes away in T1.5.2, along with its
`.env.example` line and the two `env.test.ts` cases that cover it.

**The client's default is Haiku 4.5** (user's choice), persisted in browser storage so
a reload keeps whatever was last picked. Cheapest of the nine, so an accidental send
costs the least. Detail for T1.5.4.

**Corrected:** `01-decisions.md` D6 (both the decision and its _Superseded_ note),
and `11b-m1.5-model-selection.md` T1.5.1, T1.5.2, T1.5.4 and DoD item 4.

### 2026-08-01 — the chat route hands the body's `model` straight to the provider

`chatRoute` is not a closed door. `handleChatStream` destructures the fields it knows
about and spreads the rest into `agent.stream()`:

```js
const { messages, resumeData, runId, requestContext, trigger, ...rest } = params;
```

`model` is not in that list, and `AgentExecutionOptions.model` is a documented
request-scoped override. So a `model` field in the request body reaches the provider
without the agent's own `model` ever being consulted. Found by reading
`node_modules/@mastra/ai-sdk/dist/index.js:10414`, and believed only after curl:

```
POST /chat/general {"model":"anthropic/claude-does-not-exist-9", …}
→ Upstream LLM API error, provider "anthropic", modelId "claude-does-not-exist-9",
  AI_APICallError: not_found_error "model: claude-does-not-exist-9"
```

That is the request leaving the building. **The lesson is that validating inside the
agent would have guarded a door the request walks past** — the plan's original design
would have shipped feeling safe and being open.

The guard is therefore a Hono middleware, `requireKnownModel`, scoped to `/chat/*` and
running before the route. It is deliberately not global: `/api/*` and Studio stay
unguarded, because Studio picks its own model and is not a path the app takes.

**Reading the body in middleware broke every valid request.** `await c.req.json()`
consumes the one-shot request stream, so the route handler got nothing and returned a
bare 500 with an empty log line. My inline comment claiming Hono caches the parsed
body was wrong. Diagnosed by isolation — swapping the agent's model back to a static
value left the 500 in place, which put the blame on the middleware rather than the
agent. Fixed with `c.req.raw.clone().json()`.

**The first tests for this middleware were worthless, and the bug proves it.** They
stubbed the Hono context by hand, so they stayed green through the body-consumption
bug — a hand-made `clone()` cannot reproduce a one-shot stream — and what they really
asserted was that `resolveModel` throws, which `models.test.ts` already covers.

Rewriting them against a real Hono app fixed that but bought a devDependency on Hono
just to test our own glue — something to break the next time Mastra bumps it. The
settled version stubs only the framework wrapper and uses a **real `Request`** as
`c.req.raw`, which has real one-shot body semantics. Two unit tests: the body is still
readable afterwards, and a disallowed model returns 400 instead of calling `next`.
Nothing asserts wording. Dropping the `.clone()` fails the first and only the first;
disabling the guard fails the second and only the second. **Stub the framework, never
the platform** — now a rule in `03-testing.md`.

**The server had no file-layout rule, so files piled up in the root of `src/mastra/`.**
The conventions doc was prescriptive for the web and silent here. It now names
`middleware/` alongside `agents/` and `tools/`, and says that domain modules which are
not a Mastra primitive — `models.ts`, `chat-error.ts` — stay at the root rather than
being swept into a `utils/` junk drawer. One file does not earn a folder; the second
of its kind does. `require-known-model.ts` moved to `src/mastra/middleware/`, where
M6's auth middleware will join it.

### 2026-08-01 — the agent keeps a model, because Studio reads it (user decision)

The previous entry's "no default anywhere" was applied to the agent as well: its
`model` became a callback that threw. **That broke Studio**, and not subtly — Studio
resolves an agent's model just to _describe_ it, so the agent became undescribable and
the UI rendered **"Agent not found"**. The model picker that was supposed to save it is
inside a page you can no longer reach. The server log showed
`Error calling handler … at Agent.resolveModelSelection`, plus warnings from
"Error getting LLM for agent" and "Error getting model list for agent".

I proposed accepting that. The user rejected it, correctly: the no-default rule exists
to stop _our chat route_ spending money by accident, and Studio is not our chat route.
Breaking a working tool to uphold a rule aimed elsewhere is not a trade worth making.

So `generalAgent.model` is `resolveModel('anthropic/claude-haiku-4-5').id` — a real
model, resolved through the allowlist so that dropping that id from the list fails the
server at boot instead of quietly at request time. It cannot become an invisible
default for the app, because `requireKnownModel` rejects an unnamed model at the door
before the agent is consulted. It is what Studio displays, and what Studio uses if its
picker sends nothing.

**Verified in a browser, not by curl.** Studio's agent page lists the agent, its picker
shows Anthropic / `claude-haiku-4-5`, and sending "Reply with the single word STUDIO."
returned "STUDIO.". The earlier curl against `/api/agents/general` returned 200 while
the page was still rendering "Agent not found" — an HTTP check would have missed the
whole failure.

**The allowlist is not a security control, and the docs no longer say it is.** Anyone
who can reach the route can name `anthropic/claude-opus-5`, which is on the list. What
it actually catches is our own bugs: a real-but-retired id like `claude-opus-4-1` that
would otherwise bill silently, a wrong provider prefix pointing at a vendor we have not
configured, and a garbage string that would otherwise die mid-stream instead of
returning a 400 that names the alternatives. The list has to exist for the picker
regardless; enforcing it is about twenty lines on top.

### 2026-08-02 — the proxy already carried the model without knowing it

T1.5.3 needed no production change. The proxy has always forwarded the request body
as raw text, so `model` already survives byte-for-byte and the proxy neither validates
nor interprets it.

The plan's claim that "a request without it still works" had become false after the
user chose no server default in T1.5.1. The proxy still forwards such a request, but
the Mastra route correctly rejects it. The test now says what this layer owns: a
selected model survives unchanged, and an omitted model stays omitted rather than
being invented here.

Both tests are mutation-proven. Rebuilding the body with only `messages` fails only
the selected-model test; injecting Haiku when `model` is absent fails only the
no-default test. The original transparent implementation is restored.

**Corrected:** `11b-m1.5-model-selection.md` T1.5.3. Also removed its two remaining
claims that the allowlist is a security boundary; the T1.5.2 decision log had already
rejected that framing, but this file still contradicted it.

### 2026-08-02 — the picker takes AI Elements' interaction, not its component tree

T1.5.4. The official React AI Elements `PromptInput` and `ModelSelector` are the UX
source of truth: textarea above a footer row, compact current-model trigger beside
Send, then a searchable grouped command dialog. The community Svelte port was useful
as a translation reference, not as a design authority. Its wrapper count would have
added indirection without changing this app's one picker.

**Did:** one presentational `ModelPicker.svelte` directly composes bits-ui's Dialog
and Command primitives; `Composer` owns the footer arrangement; `ChatView` owns the
choice, browser persistence and the per-message body. bits-ui earned the dependency
for focus trapping, dismissal, filtering, keyboard navigation and ARIA state. Provider
logos, copied registry wrappers and a picker component family did not. The installed
lock resolves bits-ui 2.18.1.

The catalog is still server-owned. Mastra exposes `MODEL_CATALOG` at `GET /models`;
SvelteKit fetches it privately during page load and validates it with the shared Zod
schema before rendering. The route returned all nine allowlisted models in a live
curl, with Haiku 4.5 as `initialModelId`. There is still no chat-route default.

**Browser proof:** the footer and dialog rendered at `/c/new`; search narrowed nine
models to the Sonnet group; ArrowDown + Enter selected Sonnet 4.6; reload restored it;
clearing storage restored Haiku 4.5. An intercepted real browser submission carried
`"model":"anthropic/claude-sonnet-4-6"` beside the AI SDK message body. Inspection
also caught a real accessibility bug: the checkmark showed Haiku while Command exposed
Opus as `aria-selected`. A red regression test preceded seeding Command's value from
the current model; the browser then exposed Haiku as both checked and selected.

**Mutation-proven, one focused failure each:** disconnect the catalog route from
`MODEL_CATALOG`; remove page-load schema parsing; recommend Opus instead of Haiku;
send the initial model after a user chooses another; remove the browser-storage write;
disable keyboard search; discard server-only fixture entries from the rendered groups.
Every mutation was reverted before the gate.

**Build surprise:** Mastra's optimizer emitted an empty compiled workspace module
for an unused runtime re-export of `MODEL_FAMILIES`, then its final bundler failed
because that generated module did not contain the re-export. Deleting the generated
cache reproduced it, so it was not stale state. The server only needs shared types;
the one server test that needs the runtime family tuple now imports it from
`@house-elf/shared` directly. Removing the otherwise-unused runtime re-export kept
the boundary simpler and a clean-cache `mastra build` then succeeded.

### 2026-08-02 — stubs became one component keyed by symbol; two Svelte rules captured

**Plan said:** nothing about how component stubs are written; each test grew its own.

**What was true:** eight near-identical stub components had drifted into inventing
markup the real components do not have — buttons a test could click, props serialised
into `data-` attributes and parsed back. Tests were asserting against fiction.

**What was done:** one `tests/stubs/Stub.svelte` records the props it was given into a
module-level registry; eight four-line wrappers supply an identity. Identity is a
`Symbol`, not a string, so two stubs cannot collide, and the symbols live in
`tests/stubs/keys.ts` rather than `<script module>` blocks — TypeScript cannot type a
named export from a `.svelte` file imported by a `.ts` file, and every such import
raised `no-unsafe-argument`. Tests now read props and invoke callbacks directly.
`afterEach` resets the registry, because module state outlives the components.

Two conventions were added to `typescript.instructions.md` — props get a named type,
handlers are named functions — and applied across all nine existing components, not
only the one being edited at the time. The rule's own example had to be corrected to
`interface`: `consistent-type-definitions` rejects a `type` alias for an object shape.

**Also corrected:** `ModelPicker.test.ts` called `cleanup()` itself. Removing it left
7/7 green — the setup file's `afterEach` already covers it, and a test file's own
hooks run first. The file's `afterEach` now closes any open dialog instead, because
bits-ui's scroll lock leaves `overflow: hidden` on `document.body` and restores it on
a deferred timer.

### 2026-08-02 — every model can think, and one of them does so unless told not to

T1.6.1. The task assumed thinking is a capability some models have. Anthropic's
per-model table says otherwise for the nine on the allowlist: **all nine support
thinking**, so the plan's incapable-model branches — the 400, the disabled toggle —
have no model to reach them. The capability field is kept anyway, per the user's
call, and both branches are covered by tests using invented ids. DoD steps 3 and 5
cannot be demonstrated against a real model; that is the reason, not an omission.

**"Off" cannot be expressed by silence.** Opus 5 and Sonnet 5 think by default. A
request that omits `thinking` gets thinking, so the server sends
`{ type: 'disabled' }` explicitly whenever the toggle is off. Verified by curl: same
model, same question, `thinking: false` produced no `reasoning-*` chunks and
`thinking: true` produced eight `reasoning-delta`s.

**"On" has two shapes, and the plan implies one.** 4.6-and-newer take
`{ type: 'adaptive' }` and reject `{ type: 'enabled' }` — a 400 on 4.7+, deprecated
on 4.6. The 4.5 family is the reverse: `enabled` with a `budgetTokens`, and
`adaptive` is a 400. The mapping lives in `apps/server/src/mastra/thinking.ts` and a
test fails if an allowlisted model has no entry, because the silent default would be
the wrong shape for most of the list. Budget for the 4.5 models is 4,096, chosen by
the user, with the alternatives commented in place.

**Without `display: 'summarized'` the reasoning pane renders blank.** Adaptive
thinking defaults to `display: 'omitted'` on 4.7+ — thinking blocks arrive with no
text. The pane would have looked broken rather than empty.

**The capability field is three-valued, not the boolean the plan asked for**
(`optional | always | unsupported`). Anthropic ships always-on models (Fable 5,
Mythos 5, neither on our allowlist) that reject `disabled` outright, so a boolean
cannot say what to render. `always` shows no toggle and sends no thinking option.

**How the flag becomes provider options.** `chatRoute` calls `c.req.json()` and
spreads the result into `agent.stream()`, so a `providerOptions` field in the body
would reach the provider verbatim — a browser could have set its own token budget.
Hono's `c.req.raw` is a public, assignable property and its `bodyCache` is empty
until first read, so the middleware validates a clone, then replaces `c.req.raw` with
a rewritten request: `thinking` and any client-supplied `providerOptions` removed,
the server's own options added. Proven live, not by reading: posting
`providerOptions: { anthropic: { thinking: { type: 'adaptive' } } }` on Haiku 4.5 —
which Anthropic rejects with a 400 — streamed a normal reply, so the client's version
never left the server. `require-known-model` is renamed `prepare-chat-request` to
match what it now does.

**`ReasoningPart.svelte` needed no changes**, as the task predicted. Verified in the
browser at `/c/new`: the same question on Haiku 4.5 answered directly with the toggle
off, and with it on returned a "Thought for 1 second" pane containing real reasoning
text.

### T1.6.2 & T1.6.3 — composer focus polish

Both implemented directly in `Composer.svelte` and verified live in a browser:
the wrapper gains `focus-within:border-accent/50`, a subtle brighten rather than
the loud global `:focus-visible` ring (which is untouched); clicking the footer's
empty space focuses the textarea via `event.currentTarget === event.target`, so a
click on any real control inside (picker, Send, Stop) never reaches the handler —
no per-child target sniffing needed. Deliberately pointer-only: no role or key
handler added to the footer `<div>` (`svelte-ignore` used for the two a11y lint
rules that would otherwise demand one), since Tab already reaches the textarea
directly and a second keyboard path would be redundant.

**Gotcha: `rm -rf .svelte-kit` is not a safe cache clear.** Deleting it mid-session
made vitest report a misleading "invalid JS syntax" parse error pointing at an
unrelated file's `</script>` tag. `bunx svelte-kit sync` regenerates it; the
directory holds real generated files vitest depends on, not disposable cache.

### 2026-08-03 — M1.7's plan was reviewed against the live API and largely rewritten

No code yet. The M1.7 document quoted an OpenRouter response shape that had been
misread, and several tasks were built on it. Everything below was re-fetched from
`GET https://openrouter.ai/api/v1/models` (337 models, 52 real providers) and
`/api/v1/providers`, and the plan doc corrected in place.

**What the doc said, and what is true:**

- The `reasoning` object was shown as always carrying `mandatory`,
  `default_enabled`, `supported_efforts` and `default_effort`. It is present on
  213 models, but only `mandatory` is universal — `default_enabled` 85,
  `supported_efforts` 86, `default_effort` 86, `supports_max_tokens` 8. 127 of
  them are `{ mandatory: false }` and nothing more.
- `supported_efforts: null` was said to mean "any string accepted". It **never**
  occurs — zero of 213. Absent means a plain on/off. The schema takes optional
  fields, not nullable ones, and T1.7.7 no longer designs for a null case.
- Filtering to chat models on `output_modalities` including `"text"` would have
  been a **no-op**: all 337 entries match. The default listing is already LLM-only.
  The filter was deleted from T1.7.1.
- `openrouter/auto` and `auto-beta` were said to omit their capability fields.
  They do not — both carry `architecture`, `context_length` (2,000,000) and
  `supported_parameters`. What they lack is a `reasoning` object; their `pricing`
  is the sentinel `"-1"`. There are also **six** such routers, not two.
- Deprecated aliases were assumed but not located. They are the 11 entries with an
  `alias_target`, id-prefixed `~`, which also **break the grouping key**:
  `id.split('/')[0]` yields `~anthropic`, `~google`, `~x-ai`, `~openai`,
  `~deepseek`, `~moonshotai`. "58 providers" was six tilde artifacts plus 52 real
  ones. `expiration_date` is the real deprecation signal and had been missed.
- "No icon field anywhere" — confirmed against the full key set, nested included.

**Decisions taken during the review, all the user's:**

- **Icons dropped, T1.7.3 deleted.** `@lobehub/icons-static-svg` is real and MIT,
  but has no `main`/`module`/`exports` (file paths only, so a bad slug is a runtime
  miss), and matches barely half the real provider slugs: ~7 need hand-written
  aliases, ~20 have no icon at all. That is the same standing maintenance cost that
  got privacy cut, so it went the same way. The picker is text-only.
- **Privacy stays dropped, for a corrected reason.** `GET /api/v1/providers` does
  exist and is machine-readable (101 entries, `privacy_policy_url`, `headquarters`,
  `datacenters`) — the doc had claimed no source at all. But it carries no ZDR,
  retention or training flag, and neither does the public endpoints response, so
  the part a badge would need still has no source.
- **No Postgres snapshot; in-memory TTL only.** OpenRouter serves the endpoint via
  Cloudflare with `stale-if-error=3600`, so an origin outage is absorbed at the
  edge. The only case a snapshot covers is our own server restarting offline,
  where OpenRouter is also the transport and nothing can be sent anyway. It would
  have meant inventing this repo's first hand-rolled table a milestone before M2
  decides how tables are made. DoD item 7 was removed with it.
- **All routers offered except `openrouter/bodybuilder`**, which turns prose into
  API request objects rather than answering. Accepted knowingly: `fusion` makes
  several model calls per message, and `free` routes to free models, which
  generally carry prompt logging as their price.
- **`openrouter/auto` is the default selection**, so the default can never dangle
  and no model id is hand-typed. Its per-message cost is not knowable in advance
  and the thinking toggle is inert on a first visit; both accepted.

**Three risks the plan had missed, now tasked:**

- **The transport switch was assumed but never tasked** — ids today are
  `anthropic/claude-*` on `ANTHROPIC_API_KEY`, the only provider key in
  `.env.example`. Now T1.7.0, done first against the existing allowlist. It also
  names the id-shape wrinkle: OpenRouter ids contain a slash, so the router string
  is `openrouter/anthropic/claude-opus-5` while the catalog id is
  `anthropic/claude-opus-5`.
- **`thinking.ts` is replaced, not adjusted.** Its `providerOptions.anthropic`
  output and per-id `THINKING_MODES` table are meaningless once OpenRouter is the
  transport, which takes a unified `reasoning` parameter. T1.7.2 now says so; it is
  the largest piece of work in the milestone and was hidden inside "update
  `thinkingProviderOptions`".
- **Persisted client state goes stale.** T1.6.1 stores the model id and thinking
  boolean in browser storage; a returning user holds ids that may no longer resolve.
  A stored selection absent from the catalog is now discarded, not sent.

Also noted for the executing agent: `UnknownModelError` enumerates the whole
allowlist in its message — fine at nine ids, several kilobytes at 337.

**Corrected:** `11d-m1.7-openrouter.md` throughout — ground truth, decisions, task
list, Definition of Done and closing notes.

### 2026-08-03 — Settings move out of the model picker; web search becomes M2.5

A follow-up pass over the rest of the `/models` response, again against live data
(325 models, i.e. after filtering aliases and `bodybuilder`).

**What the remaining fields are worth:**

- **`supported_parameters` is the useful one and the plan ignored it.** It gates
  every possible control and is now in the schema: `temperature` 279 models,
  `top_p` 268, `tools` 260, `seed` 258, `structured_outputs` 250,
  `reasoning_effort` 79, `verbosity` 11.
- **The models most likely to be picked have no temperature.** All 51 that omit it
  are frontier models — every current Claude and the whole `openai/gpt-5.6-*`
  family. Any temperature control has to be gated, and will often be absent.
- **`default_parameters` is present but mostly null** — `temperature` non-null on
  71 of 325, `top_p` 52, `top_k` 16. It can show a default, never supply one.
- **`tools` is a live correctness gap.** 65 models cannot call tools and the app
  already ships one; picking those breaks it silently today. Now a marker in the
  picker (T1.7.4).
- **Also added, cheaply:** `knowledgeCutoff` (156), `maxCompletionTokens` (284),
  `inputModalities` (for M4).
- **Checked and rejected:** `per_request_limits` (null on all 325),
  `supported_voices` (2 models, both empty), `benchmarks` (`design_arena` empty,
  `artificial_analysis` on only 117), `tokenizer`, `instruct_type`,
  `hugging_face_id`, `canonical_slug` (differs from `id` on 185 and is not what
  the API accepts), `top_a`, `prediction`, `parallel_tool_calls`.
- **Two display caveats found:** `pricing.overrides` (44 models) is tiered
  pricing, so one headline number is a simplification; and `context_length`
  disagrees with `top_provider.context_length` on 33 models.

**Settings get their own picker (user's call).** `ModelPicker` becomes purely a
model picker; a second trigger opens a `SettingsPicker` holding thinking, effort,
temperature, verbosity, max output tokens and seed, each gated, each with an
inline description, persisted per model id. The single-trigger-with-submenus
pattern (Claude's) was considered and rejected: a searchable dialog over 325
models cannot live in a submenu. The settings trigger carries a visible summary
rather than a bare icon, because per-model persistence means switching models
swaps an entire profile.

This split T1.7.7 into two — a server-side settings contract (T1.7.7) and the
picker (T1.7.8) — and stripped the thinking toggle out of T1.7.4. The alternative
considered was deferring all of it to an M1.8; rejected because M1.7 would then
build the thinking and effort controls inside the picker and M1.8 would
immediately remove them.

`prepare-chat-request.ts`'s rule is unchanged: the client sends a narrow validated
signal, the server decides the provider payload. The signal widens from a boolean
to a settings object, validated against the selected model's own capabilities.

**Web search deferred to M2.5** — new stub at
[12b-m2.5-web-search.md](12b-m2.5-web-search.md). It is not a model capability
(OpenRouter's docs confirm `:online` and the `web` plugin work on any model, and
`web_search_options` is only `search_context_size` for native search — using it as
a capability flag would hide the feature on all 325). It is mostly a citation
renderer, and citations are message metadata, so it belongs after M2 makes
messages persistent.

**Corrected:** `11d-m1.7-openrouter.md` (ground truth, decisions 4 and 10–13,
T1.7.2, T1.7.4, T1.7.7, new T1.7.8, DoD, notes); new `12b-m2.5-web-search.md`;
`README.md` index.

### 2026-08-03 — T1.7.0: OpenRouter is the transport

The prefix composes exactly as the plan guessed — `openrouter/` + the catalog id,
three segments — but the reason it works is not the one the plan gave, and the
difference matters for T1.7.1.

**OpenRouter's ids are not the allowlist's ids.** OpenRouter spells Anthropic
versions with dots (`anthropic/claude-haiku-4.5`); `models.ts` uses the native
Anthropic dashes (`anthropic/claude-haiku-4-5`). Seven of the nine allowlisted ids
do not appear in `GET /api/v1/models` at all, so composing the prefix over them
looked like it should 404. It does not: **OpenRouter normalises the separator.**
All nine were POSTed to `/api/v1/chat/completions` and every one returned 200 with
`model` naming its dotted equivalent. So T1.7.0 needed no change to `models.ts`,
as instructed — but the id a request sends and the id the catalog publishes are
not always the same string, which T1.7.2's "a stored selection absent from the
fetched catalog is discarded" will act on: a persisted `…-4-5` will be dropped as
unknown even though it still works. Fine, and now expected rather than a surprise.

**Where the prefix lives.** New `apps/server/src/mastra/model-router.ts`, one
function, `routerModelId(model)`. It takes a resolved `SelectableModel` rather than
a string so a client id cannot reach a provider merely by being prefixed. Two call
sites: `prepare-chat-request.ts` (which now replaces the body's `model` rather than
passing it through) and `agents/general.ts`. That agent's `model` — Studio's
descriptor, never what the app runs on — stopped naming Haiku itself and now tracks
`INITIAL_MODEL`, so when the picker's default becomes `openrouter/auto` in T1.7.2
it follows without an edit. `/api/agents` reports it back as
`provider: "openrouter"`, `modelId: "anthropic/claude-haiku-4-5"`, which is the
router splitting the composed string exactly as intended.

**Fail-closed is at boot, not per request.** `OPENROUTER_API_KEY` is `required()`
in `env.ts`, so a missing key stops the server with a message naming the variable.
Nothing reads the value — Mastra's model router picks it up from `process.env`
itself (confirmed in `@mastra/core`'s embedded docs) — but without the check the
first message sent surfaces a raw provider 401.

**`ANTHROPIC_API_KEY` was removed from `.env.example`.** Nothing reads it once
every request routes through OpenRouter, and that file's own rule is that it lists
what the app reads. Billing note added beside the new key: usage is paid from
OpenRouter credits.

**Verified in a browser, not by reading the code.** `.env` holds no Anthropic key,
so a reply can only have come through OpenRouter. Haiku 4.5 streamed an answer;
Opus 5 with thinking on streamed a reasoning block, called `getCurrentTime`, and
answered from it. `providerOptions.anthropic` from `thinking.ts` survives the trip
for now — it did not error and reasoning still rendered — but it is still T1.7.2's
job to replace it with OpenRouter's unified `reasoning` parameter.

**Mutations, each failing exactly one test bar the first:** dropping the prefix in
`routerModelId` failed both its own tests and the middleware's (three total —
different layers, kept); passing `rest.model` through unrewritten failed only
"addresses the model through OpenRouter"; making `openrouterApiKey` optional failed
only "refuses to start without the key every model request is billed to".

`bun run verify` green: 60 server tests, 140 web tests, check/lint/format/build all
clean.

### 2026-08-03 — T1.7.1: the catalog fetch, and a task boundary that had to move

**The task as written could not end green.** T1.7.1 said the fetcher "maps each
entry to the shared schema (below)" — but that schema is T1.7.2's rewrite, and
rewriting it breaks the nine hand-typed entries in `models.ts`, so the server stops
compiling until the mapper exists. T1.7.1 needed T1.7.2's schema; T1.7.2 needed
T1.7.1's fetcher. Asked rather than guessed; the boundary was re-cut on the user's
call. **T1.7.1 is now fetch, filter and cache over OpenRouter's raw shape**,
touching no shared types and imported by nothing. The mapper, the catalog-route
wiring, `resolveModel` against the fetched list and `UnknownModelError`'s message
all moved into T1.7.2, which is where the breakage belongs. Both sections of
`11d-m1.7-openrouter.md` were rewritten to match.

**The ground-truth section undercounted nulls.** Re-measured all 337 live entries
while typing the schema, and "present on every entry" turned out to mean "the key
is there", not "there is a value": `supported_voices` is null on 335 (the doc said
"present on 2, both empty"), `hugging_face_id` on 81, `instruct_type` on 296,
`top_provider.context_length` on 6, `max_completion_tokens` on 43.
`frequency_penalty` and `presence_penalty` appear on roughly two thirds of models
and are null on every single one. Four pricing keys the doc never listed exist
(`input_cache_write_1h`, `input_audio_cache`, `image_output`, `audio_output`), and
`benchmarks.design_arena` is an empty _array_, not an empty object. All corrected
in the doc.

**The expiry filter is correct and matches nothing.** `expiration_date` is non-null
on 5 models and **not one of those dates has passed**, so nothing is being filtered
today. Rather than hand-edit a date into the fixture to make a test pass — which
would mean testing against data OpenRouter never sent — the fixture stays 100%
verbatim and the tests move the clock with `vi.setSystemTime`. Expiry is applied on
read, not baked into the cache, so a model that lapses mid-TTL disappears at the
right moment rather than an hour late.

**The fixture is eight real entries, one per branch.** Recorded live, chosen so
every path through the schema is exercised by data OpenRouter actually produced:
Opus 5 (five effort levels), `gpt-5.3-chat` (a genuine near-term expiry),
`glm-5v-turbo` (expiry far out, `mandatory` + `default_enabled`),
`aion-3.0-mini` (`reasoning` carrying nothing but `mandatory` — the case a
three-state enum cannot express), `openrouter/auto` (sentinel `"-1"` pricing, no
reasoning object), `openrouter/bodybuilder` and a `~` alias (both must be dropped),
and a plain model with none of the above. Prettier reformats its whitespace, so
re-record with `bun run prettier --write` after — the repo's pinned binary, rather
than the `bunx prettier` this entry originally said (see the 2026-08-04 T1.7.1b
entry for what was measured).

**Two tests were wrong until the mutations said so.** Nine mutations, each meant to
kill exactly one test. Seven did immediately. The other two were the point of the
exercise:

- "fails loudly when OpenRouter answers with an error status" survived deleting the
  `!response.ok` check entirely — because its stub returned `{ data: [] }`, which
  the schema's `.min(1)` rejected anyway. The test passed for a reason unrelated to
  what it claimed to cover. Its stub now returns a perfectly valid catalog body
  with a failing status, so only the status check can catch it.
- "keeps a reasoning object that carries nothing but `mandatory`" was pinned by a
  mutation that made the whole parse fail, killing all nine tests instead of one.
  Stripping `mandatory` from the schema instead isolates it properly.

**Fixture drift: decided, no live shape check.** The plan demanded a choice. A test
against the live endpoint only reports on the day it runs, so it would say nothing
across exactly the quiet stretch in which a shape change lands unnoticed — and it
adds a network-dependent test to maintain. What actually protects the app is that
the Zod parse fails loudly: a changed shape surfaces as `CatalogUnavailableError`
and a 503 from the catalog route, never a silently short model list.

**One temporary thing, written down.** `openRouterModels()` serves a stale cache
silently when a refresh fails, because nothing imports the module yet and there is
no logger to report to. T1.7.2 wires one in when it connects the catalog route.

Two incidental fixes on the way through `verify`: `import … with { type: 'json' }`
needs a `module` setting this repo does not use (plain JSON import instead), and
`response.status` in a template literal trips
`restrict-template-expressions`.

`bun run verify` green: 72 server tests, 140 web tests, check/lint/format/build all
clean.

### 2026-08-03 — T1.7.1 review: the `~…-latest` filter was wrong

Three corrections from review, all on top of the commit above.

**The `~…-latest` entries are not duplicates, and are now offered.** The plan
called them that and I repeated it. They are pointers: `~anthropic/claude-opus-latest`
is Opus 5 today and becomes Opus 6 when Anthropic ships it, while
`anthropic/claude-opus-5` stays put. Those are two different things to want. All
11 targets do also exist as their own entries, but that is what a pointer is for,
not redundancy. The filter is gone, `alias_target` is kept as metadata so the
picker can show what a pointer resolves to, and the grouping cost moves to T1.7.4:
**strip the leading `~` before splitting on `/`**, or six phantom providers appear.

**Discounts exist and this endpoint does not carry them.** `pricing.overrides` in
`/api/v1/models` is volume tiering, not a sale — do not read it as one. The real
signal is `pricing.discount` on `GET /api/v1/models/{id}/endpoints`: a fraction
(0.494 = 49.4% off), per provider endpoint, and negative on at least one model
(`xiaomi/mimo-v2.5-pro` on StreamLake, −0.2, a markup). Checked all 337.

Two findings decide what to do with it. First, **the price already shown is the
discounted one** — `z-ai/glm-5.2` lists at exactly its post-discount rate — so a
sale is already reflected in the picker and `discount` only adds a badge. Second,
there is no bulk access: `?include=endpoints`, `?endpoints=true` and
`?expand=endpoints` are silently ignored, `/api/v1/endpoints` and
`/api/v1/models/endpoints` 404. One request per model, ~10s per refresh, and it
cannot be narrowed — only 17 models are free, and discounts hit single-provider
models too (7 of 54 sampled). So the catalog fetch does not do it; if the badge is
wanted it is one on-demand request for the selected model, recorded in the plan as
a T1.7.4/T1.7.7 display concern rather than a new task.

**`isOffered` was unreadable.** `return model.expiration_date === null || !(Date.parse(…) < now)`
is a double negative guarding a NaN case. Now a named `hasExpired` const, with the
NaN reasoning stated once.

Re-proved: eight mutations, each killing exactly one test. The alias behaviour is
pinned by stripping `alias_target` from the schema, which fails only the new
"keeps the `~latest` pointers" test.

### 2026-08-04 — a documentation sweep, and the catalog is coming from the wrong URL

Read OpenRouter's documentation index rather than guessing at search terms, after
the first pass turned out to be a sample rather than a sweep. Findings landed in
the milestone that owns each one; three are recorded here because they cross
milestones or contradict shipped code.

**The catalog should come from `/api/v1/models/user`, not the public list.**
Measured live: 338 models public, 220 with `?zdr=true`, 230 from `/models/user`.
`?zdr=true` is unusable — it drops all six `openrouter/*` routers, including the
default selection, because a router has no endpoint of its own to carry a ZDR
guarantee. `/models/user` applies the account's real privacy settings instead and
keeps them; the arithmetic is exactly `220 + 6 routers + 10 pointers − 6 free
models that log prompts`. It needs the API key, and it omits `alias_target` and
`benchmarks`. Detail and consequences in
[11d-m1.7-openrouter.md](11d-m1.7-openrouter.md).

**`openrouter/auto` is deprecated, and stays anyway (user decision).** It will be
replaced by `openrouter/auto-beta`, which benchmarks far better (83.8% vs 50.0% on
GPQA Diamond). OpenRouter performs the swap behind the slug, so holding `auto`
gets the improvement without a user-visible id change made twice.

**Auto Exacto changes routing the moment M3 sends tools.** On any request carrying
a `tools` array, OpenRouter reorders providers by throughput, tool-call success
rate and its own benchmark harness rather than by price. On by default, no opt-in.
Noted in [13-m3-menu-agent.md](13-m3-menu-agent.md).

**Two things to check against M1's shipped streaming**, neither yet verified
against our code:

- A rate limit hit _after_ streaming starts does not arrive as HTTP 429. It comes
  as an SSE chunk carrying an `error` object with `finish_reason: "error"`, on a
  connection that already returned 200. **Checked the same day — see the entry
  below; it reaches the banner, but says the wrong thing.**
- Stream cancellation only stops billing on providers that support it. OpenAI,
  Anthropic and DeepSeek do; Google, Groq, Bedrock, Mistral and Perplexity do not.
  The Stop button is correct either way — this is about cost, not behaviour.

Also available and deliberately not pursued: `HTTP-Referer` / `X-OpenRouter-Title`
attribution headers, model fallback via a `models[]` array, `/api/v1/generation`
for after-the-fact cost stats, server-side presets, and PDF file-annotation reuse
(M4's concern).

### 2026-08-04 — three questions closed before T1.7.2, two new tasks filed

The sweep above left three things unresolved. All are now settled, none by
reasoning about the code.

**A mid-stream error does reach the banner — with the wrong sentence.** The
suspicion was a silent stop. It is not. `@mastra/core`'s gateway honours
`process.env.OPENROUTER_BASE_URL`, which made this reproducible without mocking
anything we do not own: the real Mastra server was pointed at a throwaway upstream
streaming OpenRouter's documented mid-stream shape — an `error` object at the chunk
root _and_ `choices[0].finish_reason: "error"` on a connection that already
returned 200. The browser kept the partial text and showed the `role="alert"`
banner with **Try again** beneath it. So `finishReason` still needs no handling.

What is wrong is the wording. OpenRouter's error object carries `code: 429`, while
`describeChatError` reads only `statusCode`, so a mid-stream rate limit is
categorised `unknown`: "Something went wrong while generating the reply." The
server log had the shape verbatim —
`{ message, name: 'Error', code: 429, metadata: { error_type: 'rate_limit', provider_code } }`.
Filed as **T1.7.3**, reusing the number freed when provider icons were cut. Reading
`code` alongside `statusCode` fixes every category at once, not just the 429.

**Mastra does forward root-level request fields.** This blocked `cost_tier`
(T1.7.7) and most of M2.1. `openrouter/*` model strings resolve through
`createOpenRouter()` to `OpenRouterChatLanguageModel`, bundled inside
`@mastra/core` rather than the generic OpenAI-compatible path, and its
`doStream`/`doGenerate` spread `providerOptions.openrouter` **at the root of the
request body**. So `providerOptions: { openrouter: { plugins: [...] } }` reaches
OpenRouter as a root-level `plugins` array, and `cache_control` works the same way.
The model's own `settings` also accept `plugins`, `cache_control`,
`web_search_options` and `usage` as first-class fields — but a model-router string
cannot reach `settings`, so `providerOptions` is the route. Recorded in
[11d-m1.7-openrouter.md](11d-m1.7-openrouter.md) and
[12a-m2.1-prompt-caching.md](12a-m2.1-prompt-caching.md).

**The `/models/user` switch became T1.7.1b** rather than being folded into T1.7.2.
It changes committed T1.7.1 code, and T1.7.2 is already the largest task in the
milestone.

**A footnote, deliberately not acted on.** Probing the boundary, a chunk carrying
`finish_reason: "error"` and _no_ top-level `error` object is not an error to
Mastra at all: it silently re-ran the step **five times**, five billable upstream
requests, and delivered the partial text repeated five times as one normal answer
with nothing in the log. That is not the shape OpenRouter documents, and there is
no evidence any real provider sends it, so no code was written and no guard added.
It is here only so that a future duplicated answer and a surprising bill are not
rediscovered from scratch.

### 2026-08-04 — OpenRouter's own picker rewrites T1.7.4, and re-cuts icons

The user found OpenRouter's model picker and it is better than what was planned.
Evaluated against the plan; T1.7.4 and T1.7.6 were rewritten and two decisions
added.

**Provider grouping is gone.** The plan built T1.7.4 around a two-level provider
menu. OpenRouter groups by **release month** and makes provider a **filter** with
its own search box. That is the better answer to a problem T1.7.4 had already
noticed — "52 providers, the large majority holding one to three community
fine-tunes each, is a lot of menu for little payoff" — and it deletes the
nested-menu risk the task flagged for testing. Newest-first also matches what a
personal tool is actually used for.

**The consequence is a schema change, not just a UI one.** `created` is mapped in
neither the raw catalog schema nor the shared one. It is now part of T1.7.1b (with
the fixture re-record, so it is only done once) and T1.7.2.

**Icons were reopened and cut again, on new evidence.** The screenshots show them,
and the user was willing to reconsider if it needed no workaround. It does.
OpenRouter's own icon assets live at an undocumented path that is not derivable
from the author slug — probed live, only `Anthropic.svg` and `OpenAI.svg` resolve;
`DeepSeek`, `Qwen`, `Google`, `Meta`, `Mistral`, `xAI`, `Nvidia` and every casing
variant tried returned 404. Same hand-maintained mapping as the `@lobehub` route
already rejected, so the original decision stands with a second reason behind it.

**Adopted:** a model count that tracks active filters, a filter row hidden behind
a funnel with an active-count badge, search flattening the month grouping, a
collapsible pinned section with a count, and pinned models appearing in both the
pinned section and the main list so the star reads as a toggle.

**Rejected, each for a measured reason:** an output-modality filter (no-op — every
entry we keep outputs text; their 361 includes image and video models ours does
not), Hide Unavailable (no source — `status` is per provider endpoint, one request
per model, the bulk problem that killed discount badges), and the default-model
footer (the server already sends `initialModelId`, and pins cover the same need).

**Filters are data-derived, which is better than copying theirs.** Provider and
input modality are fixed; every other toggle renders whenever the catalog splits
on it — at least one model with the capability, at least one without — drawn from
the capabilities the app actually exposes: `reasoning`, `tools`, `temperature`,
`reasoning_effort`, `verbosity`, `free`. **No rarity threshold.** A first draft of
this entry proposed hiding filters matching under 5% of the catalog; that is
backwards, since the 11 models carrying `verbosity` are exactly the ones scrolling
won't find. The candidate list, not a count, is what keeps junk like `top_k` out.
`free` is derived in the mapper (`prompt` and `completion` both `'0'`) into an
`isFree` boolean, with the routers' `"-1"` sentinel explicitly excluded — it means
"unknowable", and a non-positive check would label all four routers free.

**One trap written down before it is hit:** the `~` stripped for the provider
filter must never reach the id on the wire. `~anthropic/claude-opus-latest` is the
model; without the tilde it does not exist. Nothing strips it today, so it is a
constraint on T1.7.4's new code, with a test.

**Settled while here:** pins sort alphabetically, not by pin time; the star is
always visible rather than hover-only, because a hover target does not exist for a
keyboard user; and the picker stays a **modal** rather than becoming a dropdown —
we have a working `Dialog` + `Command` already and the filter row wants the width.
The user's call, explicitly reversible later.

### 2026-08-04 — T1.7.1b: the fixture could not be re-recorded entry-for-entry

**Plan said:** point `CATALOG_URL` at `/models/user`, re-record the same eight
fixture entries, and the only change to expect is the `~…-latest` entry losing its
`alias_target`.

**What is true:** that part held — all ten `~…-latest` entries in `/models/user`
arrive without `alias_target`. **No test asserts that**, though the plan asked for
one: `alias_target` is already optional, so a test reading it back off the fixture
proves nothing about the code, and the only mutation that could break it — making
the field required — fails **12** tests, because the parse then rejects the whole
fixture. It was written, mutation-tested, and deleted. The fixture itself is the
record that the key is gone. The fixture is nine entries, not eight, because three
of the original eight did not survive the endpoint change:

- `aion-labs/aion-3.0-mini` and `kwaipilot/kat-coder-air-v2.5` are simply **not in
  `/models/user`** (230 models against the public list's 338). Replaced by
  `google/gemini-3-pro-image` — `reasoning: { mandatory: true }` and nothing else,
  the branch aion covered — and `qwen/qwen3-vl-30b-a3b-instruct`, a plain model
  that additionally carries a **non-null `knowledge_cutoff`**, a nullable branch no
  entry in the old fixture exercised.
- `openai/gpt-5.3-chat`'s `expiration_date` is now **null**; on 2026-08-03 it was
  `2026-08-10`. It stays in the fixture as the no-`reasoning` case, but the expiry
  tests needed a real future date, so `z-ai/glm-4.5` (`2026-12-31`) joined and the
  "already expired" clock moved to 2027-01-01. Only three models in `/models/user`
  carry a non-null `expiration_date` at all, two of them the sentinel `2098-12-31`.

That is the fixture drifting exactly as T1.7.1 predicted, one day later.

**Also did:** added `created` to the raw schema for T1.7.4's month grouping, and
corrected the two comments the endpoint change falsified — `CATALOG_URL`'s "the
list is public" and `env.ts`'s "nothing reads this value". The catalog module now
imports `env`, so its unit test stubs `DATABASE_URL` and `OPENROUTER_API_KEY`
before importing.

**Three mutations, three kills:** pointing the URL back at `/models`, dropping the
`Authorization` header, and removing `created` from the schema each failed exactly
one test.

**A correction that did not reproduce.** T1.7.1's entry advises re-recording with
`bunx prettier --write`, and this task was started on the belief that `bunx` pulls
a different version whose output fails `prettier --check`. Measured: `bunx prettier
--version` and `bun run prettier --version` both report the pinned 3.9.6, and
`bunx prettier --write` on the fixture left it byte-identical and passing
`--check`. So there is no bug here. The docs now say `bun run prettier` anyway —
it is unambiguous about which binary runs — but without the false reason attached.

**Corrected:** [11d-m1.7-openrouter.md](11d-m1.7-openrouter.md) T1.7.1b now records
the fixture substitutions; the `bunx` advice is `bun run` in both plan docs.

### 2026-08-05 — T1.7.2: the schema rewrite, and a cache that stopped leaking

The schema landed as written — `provider` for `family`, structured `reasoning`,
pricing, `supportedParameters`, `createdAt`, `inputModalities` — and the
hand-written allowlist is gone. Four things are worth recording because they are
not what the task said.

**The cache became an object, not a module of loose state.** T1.7.1 left a
module-level `cachedModels` and a `cachedAt` beside the fetch, and T1.7.2 was
about to add a by-id index next to them — a third variable every caller had to
leave consistent. It is now one `OpenRouterCatalog` class with `list()` and
`get(id)`; the TTL, the stale-serve on a failed refresh and the by-id map are
private to it, and `models.ts` no longer knows the catalog is cached at all.

**Thinking is gated on `supported_parameters`, not on the reasoning object.**
Measured, not reasoned about: `openrouter/auto` publishes no `reasoning` object
and still streams reasoning when asked for it. Gating on the object's presence
would have silently disabled thinking on the default model.

**An unknown id falls back to `openrouter/auto`, not to `models[0]`.** The first
entry of a catalog sorted by release month is whatever OpenRouter shipped most
recently — a random model wearing the costume of a default. The user's call;
reverting it fails exactly the one test written for it.

**Tests: `models.ts` is a unit test again.** It reached through the real catalog
to `fetch` and a recorded fixture, so a change in either broke it for reasons that
had nothing to do with mapping. `openRouterCatalog` is now stubbed there and
tested only in its own file. The fixture assertions went with it: reading values
back off untyped JSON asserts what lives somewhere else, so models are built by a
typed `openRouterModel(overrides)` factory the compiler checks. The fixture is
kept for the three tests that go through `fetch` and the Zod parse — which is the
only thing it is evidence of, that the schema still fits the live API.

### 2026-08-05 — The transcript let go of the bottom mid-stream

Reported, not found by a test: while tokens streamed the view unpinned itself,
the jump button appeared, and the reply ran off the bottom of the screen.

**Cause.** `measure()` re-derived "following" from position on every scroll event.
A scroll event says nothing about who caused it, and during a stream most of them
are ours: the chase to the end is reported on the following frame, by which time
another chunk has already made the page taller, so "am I at the end?" answers no
and a reader who touched nothing is dropped. **Only an upward move now unpins;
reaching the end re-pins.** The `chasingEnd` and `readerTookOver` flags and the
`wheel`/`touchstart` listeners are all gone with it — position and direction say
everything they were tracking, and cannot disagree with what is on screen.

**Why the e2e suite did not catch it.** `emitParagraphs` emits every delta inside
one `page.evaluate`, so the page grows once and the interleaving that causes the
bug never happens. A second helper paces chunks as separate tasks, the way
server-sent chunks actually arrive; stashing the fix fails that test alone.

**A note on verifying in the browser.** The shared VS Code browser pages report
`visibilityState: "hidden"` — ResizeObserver never fires and Playwright's click
stability check times out, so anything observed through them about scrolling is an
artifact. Headless Playwright renders; use it.

### 2026-08-05 — T1.7.4 slice 2: the filter row, and three components instead of one

The funnel, the derived filter row, and the count that follows it. `ModelPicker`
does not know what a filter is: it holds a `ModelFilters` value, hands the whole
catalog to the row, and calls `filterModels`. Three files, one job each —
`model-filters.ts` decides what a catalog can be asked, `ModelFilters.svelte` asks
it, `FilterSelect.svelte` is one dropdown.

**The row is three dropdowns, not a wall of checkboxes** (the user's call, twice
over). The first build dumped checkboxes into the panel; the second gave providers
a searchable `Combobox` while the others were `Select`s. Both were wrong. There is
no search anywhere now — 43 providers sorted alphabetically with their model count
is a list you read, not one you query — and every filter is the same control, which
is the whole reason `FilterSelect` exists. **`Free` is a standalone toggle**: it is
a price, not a capability, even though it travels with the capabilities into
`filterModels`.

**The modal no longer changes height.** `Command.Root` was `max-h-…`, so the dialog
shrank to fit whatever the filters left — picking `Free` collapsed it to half.
Fixed height, and the list scrolls inside it.

**Three jsdom stubs stand between bits-ui and a green test.** A floating layer
never opened under test and the cause was two layers deep: `Select`'s trigger calls
`hasPointerCapture`, which jsdom lacks, and bits-ui's `isReferenceHidden` reads
`getClientRects()`, which jsdom always returns empty — so `isPositioned` stayed
false, the wrapper kept `visibility: hidden`, and `getByRole('option')` found
nothing though the options were in the DOM. Both stubs are in
`tests/setup/dom-layout.ts` with the reason attached. **Verified by reading the
installed source, not by guessing.**

**The tests were restructured after the user asked why nothing was stubbed.** They
were right: `ModelPicker` was driving a real dropdown two levels down, and
`ModelFilters` was re-asserting rules `model-filters.test.ts` already owns. Now
`ModelPicker` stubs `ModelFilters`, `ModelFilters` stubs `FilterSelect` and mocks
the utilities, and `FilterSelect` has its own tests — the dropdown's behaviour is
exercised once, at the leaf, instead of three times through ancestors.

**A test that proved nothing, caught in review.** "Hands the filter row the whole
catalog" passed with `models={listed}`, because `filterModels` early-returns the
same array when no filter is active. It applies a filter first now.

**Three mutations, three kills:** `models={listed}` on the child, `listed = models`
in the picker, and letting `free` back into the capability list each failed exactly
one test.

**Browser-verified:** 229 models → provider `openai` 38 → plus `anthropic` 54;
dialog height 543px before the row opened, with it open, and with `Free` on.

### 2026-08-06 — T1.7.4 slice 3: model details, without a hover target

**Hover is rejected, and the plan is corrected.** T1.7.4 specified "an info card
on the focused/hovered model." Hover does not exist on a phone, which is a
first-class device for this app, and focus alone leaves the details invisible to
a thumb. The plan document now says so in place of the hover bullet, and the
correction is in this commit rather than a follow-up.

**The user picked layout A: an info line of always-visible icons, plus a "More"
control for the prose.** Two other layouts were built as a throwaway prototype
and screenshotted at 390px before the choice — expand-in-place (B) and an
overlay card (C). The user also named which facts earn a permanent icon (all
six: tools/no-tools, thinking, temperature, effort, context, free), the screen
reader label for the no-tools warning ("Cannot call tools"), and that the
provider column on each row should go (labels already begin with the provider,
and provider now has its own filter). Input and output modalities were added to
the collapsible details at the user's request.

**`ModelDetails` is its own component, stubbed out of the picker's tests.** The
picker owns the accordion state (one row open at a time) and the contract it
hands each row's details; `ModelDetails` owns the info line and the prose. The
picker test stubs `ModelDetails` and exercises the contract — that opening
details does not select the model, and that one row open at a time — by reading
the toggle callback back from the recorded props and calling it, the way the
testing rules require. `ModelDetails` has its own tests for the leaf behaviour:
which icons render, the sr-only accessible name, and the More/Less toggle.

**The "More" control does not select the model.** It lives inside the
`Command.Item`, so its click would bubble up to the item's `onSelect` without
intervention. A wrapper `div` stops propagation on click and keydown, so a
reader can open the details without committing to the model. Verified in the
browser: clicking "More" on the default router expanded its details and left the
trigger reading "Auto Router"; clicking a different row's name selected it.

**Tiered pricing reads as "from", unconditionally.** The schema carries only
`prompt` and `completion`, not `pricing.overrides` (volume tiering, 44 of 337
models), so the picker cannot detect whether a model's headline is a floor or
an exact price. The label says "from $…/per 1M tokens" for every non-router
model, which is honest for the tiered 44 and merely cautious for the rest.
Adding `overrides` to the schema is a T1.7.1b/T1.7.2 concern, noted in the
source, not this slice's.

**Five mutations, five kills:** moving the no-tools fact off the lead, dropping
the router "varies" branch, hardcoding `open={true}`, adding `select(model.id)`
to the toggle handler, and changing the sr-only label each failed exactly one
test.

**Browser-verified at 390px:** 230 models; the info line renders under each name
(thinking/temp/effort/context on the Auto Router, "No tools" + context on
Fusion); "More" expands the description, price ("Varies" for the router),
inputs, and settings list without selecting; clicking a row name selects and
closes the dialog.

### 2026-08-06 — T1.7.4 slice 4: drop the info line, "More" on the title row, expandable description

**The user reversed two decisions from slice 3.** The always-visible info line
of icons is gone — it overloaded the row, and the facts it carried are not
worth a permanent line on every model. "More" moves from its own row up to the
title row, beside the selected-model checkmark. The plan document's "info line
and a More control" bullet is corrected again to describe the no-info-line
layout, the same way the hover rejection was logged.

**The facts the info line carried move into the collapsible as text.** The
collapsible already showed context, price, inputs, settings, and knowledge
cutoff; the icon facts (tools/no-tools, thinking, temperature, effort, context,
free) join it as a compact text list above the description. `rowFacts`/`RowFact`
in `model-details.ts` are repurposed to `factList`/`ModelFact` (text labels, an
`isWarning` flag instead of the icon's `present`). `priceLabel`, `settingList`,
and `contextLabel` survive unchanged.

**The "cannot call tools" warning stays amber, inside the collapsible.** The
user was asked where it should live now that the info line is gone, and chose
amber text inside the collapsible over a marker on the title row. The
accessible name is still "Cannot call tools". The trade the user accepted: a
no-tools model gives no surface warning until the reader opens "More".

**"More" is now a peer of the checkmark, so the picker owns it.** With the info
line gone, `ModelDetails` renders only the collapsible (when open); the "More"
button moved to `ModelPicker`'s title row. The checkmark sits just left of
"More" (right of the label) rather than moving to the far left — a selection
indicator on the right reads as "this one", and keeps the label flush left
where a scanning eye starts. The label is `flex-1`, so it absorbs the space the
checkmark takes on the selected row and "More" never shifts. The
stop-propagation wrapper that keeps "More" from selecting the model survives
the move (now a `<span>` around the button), and a second one wraps the
collapsible so the description's "show more"/"show less" toggle does not
select either.

**The description is expandable.** OpenRouter descriptions run long (the Auto
Router's was truncated mid-sentence on screen in slice 3); the collapsible now
clamps `model.description` to three lines with a "show more"/"show less" toggle,
so a reader can read the whole thing without the row growing unbounded by
default. This is a second level of expand inside the collapsible, kept as a
single toggle.

**The picker test's contract changed.** `ModelDetails` no longer takes an
`ontoggle` callback — the picker owns the toggle — so the stub records only
`model` and `open`. The picker test's `model details` block now clicks the real
"More" button (scoped to a row's option with `within`) instead of reading the
toggle callback back from the stub. The "opening details does not select" and
"opens one row at a time" tests survive; the "hands each row its model" test is
unchanged. The `ModelDetails` test's `describe('the info line')` block (8
tests) is replaced with `describe('the fact list')` (facts as text, no-tools
amber) and `describe('the expandable description')` (clamp + toggle); the
`describe('the More control')` block is replaced with `describe('when closed')`
(renders nothing) and the surviving prose-details tests. The `rowFacts` util
test block is renamed `factList` and matches the repurposed util.

**Six mutations, six kills:** dropping `isWarning` (failed the amber-text test
at both the util and component layers — different layers, not overlap),
dropping the description clamp (failed the clamp + collapse tests), removing
the "More" click stop-propagation (failed the does-not-select + one-at-a-time
tests — collateral, the contract test is the load-bearing one), dropping the
context fact (failed the context tests at both layers), rendering when closed
(failed exactly one), and hardcoding `open={true}` (carried over from slice 3,
still kills).

**Browser-verified at 390px:** 230 models; each row is a single title line
(label, checkmark on the selected row, "More" at the far right); clicking
"More" on the Auto Router expanded its details (Thinking, Temperature, Thinking
effort, 2M context as text; description clamped with "show more"; price
"Varies"; inputs; settings) and left the trigger reading "Thinking Machines:
Inkling Small"; clicking "show more" toggled to "show less"; the dialog stayed
open through both. Stop-propagation confirmed: clicking "More" did not select.

### 2026-08-06 — T1.7.4 slice 5: drop the expandable description, keep only warnings on the row

**The user reversed two more decisions from slice 4.**

**The expandable description is gone.** Slice 4 clamped `model.description` to
three lines with a "show more"/"show less" toggle on the assumption that
OpenRouter sent full descriptions and the client was truncating them. It is the
other way around: the descriptions arrive already truncated from the API side
(the Auto Router's ends mid-sentence in the response itself), so a client-side
clamp has nothing to expand. The collapsible now renders `model.description` as
a bare `<p>`, the way slice 3 did before the clamp was added. The
`descriptionExpanded` state and its toggle button are removed.

**Only warnings stay on the row above the description; the descriptive facts
are dropped.** Slice 4 moved all six info-line facts (tools/no-tools, thinking,
temperature, effort, context, free) into the collapsible as a text list. The
user pointed out that the descriptive ones are already in the collapsible's
settings list, context line, and price — repeating them as a fact list above
the description is noise. What stays is the one thing that is a warning rather
than a description: "Cannot call tools". `factList`/`ModelFact` in
`model-details.ts` is repurposed to `warnings`/`ModelWarning` (only the no-tools
warning, no `isWarning` flag — everything in the list is a warning, so the flag
is redundant and the component renders the list amber unconditionally).
`priceLabel`, `settingList`, and `contextLabel` survive unchanged; the
`contextLabel` helper is now called only by the dl's context line, not by a
fact list.

**Tests follow.** `ModelDetails.test.ts`'s `describe('the fact list')` (8
tests) and `describe('the expandable description')` (3 tests) are replaced with
`describe('the warnings row')` (2 tests: amber when no tools, absent when
tools). The `userEvent` import is dropped — nothing in the file clicks anymore.
`model-details.test.ts`'s `factList` block is renamed `warnings` (2 tests).
The picker test is unchanged — the stub contract (`model` + `open`) and the
"More" button placement are the same as slice 4 left them.

**Three mutations, three kills:** dropping the no-tools warning from `warnings`
(failed the warns test at both the util and component layers — different
layers, not overlap), dropping the amber class on the warning `<li>` (failed
exactly one component test), and making `warnings` always push the no-tools
warning (failed the does-not-warn tests at both layers).

**Browser-verified at 390px:** the collapsible renders the description as a
bare `<p>` (no clamp, no "show more"), then the dl (Context, Price, Inputs,
Settings); no fact list, no expandable description; a model with tools shows no
warnings row. The amber warning itself is covered by the mutation-proven
tests — no live no-tools model was found in the current catalog to screenshot
it in the browser, but the unit and component tests pin both its presence and
its amber class.

### 2026-08-06 — T1.7.5: Documentation

Docs-only task. The OpenRouter-catalog decision is recorded as **D15** in
[01-decisions.md](01-decisions.md), consolidating the deviations scattered across
the PROGRESS entries from 2026-08-03 through 2026-08-06 into the durable record:
why a live fetch replaces the static allowlist, why `/models/user` and not the
public `/models`, why privacy and icons were both dropped (different measured
reasons), why there is no persisted snapshot, why `openrouter/auto` stays the
default despite its unknowable per-message cost, why settings live in a second
picker, why the picker groups by release month, why hover was rejected, and why
the `~…-latest` pointers are offered.

**`.env.example` billing note updated.** T1.7.1b switched the catalog to
`/models/user`, which requires the API key to read — not just to use a model.
The note now says so, alongside the existing billing note about OpenRouter
credits.

**T1.7.4 ticked.** The picker's five slices are complete and their deviations
are logged above; the tick was applied with this task rather than after slice 5,
since this is the milestone's documentation boundary.

`bun run verify` green — docs are not checked by it, but the tree stays green.

### 2026-08-06 — T1.7.6: Pinned / favorite models

**Pinning state lives inside the picker, not above it.** The first draft threaded
`pinnedIds`, `ontogglepin`, `pinnedCollapsed`, and `ontogglepinnedsection` through
ChatView → Composer → ModelPicker — four props on two components that have no
use for them. The user pointed this out: pins are only the picker's concern, so
`createPinnedModels` is called inside `ModelPicker.svelte` with `untrack`, and
nothing above the picker knows pins exist. The prop surface of ChatView and
Composer is unchanged from T1.7.4.

**Two new components, not one.** `ModelRow.svelte` extracts the row (label,
checkmark, star, "More", details) from the picker — the star and "More" buttons
are the row's own behaviour, not the picker's. `PinnedSection.svelte` extracts
the collapsible pinned section (header with count, pinned rows). The picker
owns the accordion state (`detailsOpenId`) and the pin state, and delegates
rendering to these two. The picker test stubs `PinnedSection` and `ModelDetails`
and tests the contract; `PinnedSection` and `ModelRow` have their own tests with
a `Command.Root` harness (bits-ui's `Command.Item` needs the context).

**Snippets inside component tags are props, not local snippets.** The first
attempt used a `{#snippet row(model)}` inside `Command.List` to avoid duplicating
the row markup. svelte-check rejected it: a snippet declared inside a component
tag is a prop of that component, so `Command.List` (and `Command.Root`, and
`Dialog.Content`) each rejected the unknown `row` prop. Moving it to the
top-level markup (between `</script>` and `<Dialog.Root>`) fixed the type error
but introduced `@typescript-eslint/no-confusing-void-expression` on every
`{@render row(model)}` — `@render` returns `void`. Extracting `ModelRow` as a
component avoided both issues.

**`pins.pinnedIds` is reactive in `$derived` but not in template expressions.**
The `pinned` derived (`pinnedModels(models, pins.pinnedIds)`) updated correctly
after `toggle` — the PinnedSection stub appeared. But `pinned={pins.pinnedIds.includes(model.id)}`
on `ModelRow` did not — the star stayed "Pin" after a click. The getter on the
state factory's return object reads `$state`, and `$derived` tracks that read,
but the template expression does not. Using `pins.pinnedIds.includes(model.id)`
directly (rather than through a `$derived` intermediary) fixed it. The
`model-selection.svelte.ts` factory has the same getter pattern and works in
ChatView, but ChatView reads it through `$derived` and component props, never
in a bare template expression — which is why the issue surfaced here first.

**`stubRenders` records mounts, not unmounts.** The first `pinnedSectionRendered()`
helper checked `stubRenders(pinnedSectionStub).length > 0`, which stayed true
after the PinnedSection was unmounted — the registry keeps every instance that
was ever mounted. Checking `screen.queryByTestId('pinned-section')` instead
tests whether the stub is currently in the document, which is the question.

**`localStorage` must be cleared between picker tests.** The picker owns its
pin state, which persists to `localStorage` via `onMount`. Without clearing it
in `afterEach`, a pin from one test bleeds into the next.

**Mutation-proven:** removing `sortPins` from `toggle` fails exactly the
"sorts pins alphabetically" test; removing the `knownIds` filter from `restore`
fails exactly the "drops a pinned id that is no longer in the catalog" test.

`bun run verify` green: 84 server tests, 258 web tests, check/lint/format/build
all clean.

## Open questions

Things needing a human answer. Remove once resolved.

- _(none)_
