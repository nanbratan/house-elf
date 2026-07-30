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

- [x] **Scaffold check** — in `/tmp`, run `create-mastra` under Bun. Record the
      directory structure it produces and the exact `@mastra/*` versions installed,
      then delete it. T0.1 commits to a workspace layout; this is the cheap moment
      to find out if the scaffold disagrees with it. Log the versions below —
      later sessions read `node_modules/@mastra/*/dist/docs/` for version-exact API
      docs.

      *Done 2026-07-30, `/tmp/he-spike` deleted. Also checked: `mastra dev` starts,
      Studio renders at :4111 and lists the agent, and `typst compile` produces a
      valid PDF (typst 0.15.1, installed via Homebrew). An agent **responding** is
      only partially confirmed — no provider API key was available, so the call was
      proven to reach Anthropic and be rejected with `invalid x-api-key`. The full
      round trip is deferred to T0.3. Deviations logged below.*

      **Structure produced** (default template, see decision log):
      `src/mastra/index.ts`, `src/mastra/agents/agent.ts`,
      `src/mastra/tools/*.ts`, `tsconfig.json`, `.env` / `.env.example`, `AGENTS.md`.
      Flat and single-package — it does not disagree with the `apps/*` + `packages/*`
      layout, it simply has no opinion about it.

      **Versions installed** (2026-07-30):
      `@mastra/core` 1.55.0 · `@mastra/server` 1.55.0 · `@mastra/deployer` 1.55.0 ·
      `@mastra/memory` 1.24.0 · `@mastra/libsql` 1.18.0 ·
      `@mastra/observability` 1.16.3 · `@mastra/duckdb` 1.5.2 ·
      `@mastra/loggers` 1.2.0 · `@mastra/schema-compat` 1.3.4 ·
      `mastra` CLI 1.21.0 · `zod` 4.4.3 · `typescript` 6.0.3 · no `ai` package.
      Scaffold declares `engines: node >=22.13.0`; ran fine under Bun 1.2.13.

## M0 — Foundation → [10-m0-foundation.md](10-m0-foundation.md)

Split across two sessions; T0.6 is large.

Session A:
- [x] T0.1 Repo and workspaces
- [x] T0.2 Postgres + pgvector
- [x] T0.3 Mastra server skeleton
- [ ] T0.4 SvelteKit skeleton

Session B:
- [ ] T0.5 Lint, format, types
- [ ] T0.6 Test infrastructure
- [ ] T0.7 Automation
- [ ] T0.8 Dev orchestration
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
*is* the Go port, published under the main `typescript` package name. So
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
saying it is local-only and unused in production. The *connection strings* still live
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

## Open questions

Things needing a human answer. Remove once resolved.

- **`docs/plan/` is git-ignored.** Added to `.gitignore` after T0.1. `PROGRESS.md` is
  the documented source of truth for what is done, and `AGENTS.md` says to fix plan
  documents "in the same commit" as the code — neither works if the directory is not
  tracked. Recommend at minimum un-ignoring `PROGRESS.md`. Being updated regardless.

