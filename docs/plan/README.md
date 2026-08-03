# house-elf — Implementation Plan

A personal AI assistant platform: a SvelteKit chat UI over a Mastra agent
orchestration server, backed by Postgres + pgvector.

## How to use this plan

These documents are written for an **executing AI agent**. Read them in this order:

| #   | Document                                                   | Purpose                                                       |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| 0   | [00-overview.md](00-overview.md)                           | Vision, scope, architecture, repo layout                      |
| 1   | [01-decisions.md](01-decisions.md)                         | Every technology decision + rationale + rejected alternatives |
| 2   | [02-conventions.md](02-conventions.md)                     | Coding standards, working agreement, quality gates            |
| 3   | [03-testing.md](03-testing.md)                             | Test strategy, tooling, coverage thresholds                   |
| 4   | [10-m0-foundation.md](10-m0-foundation.md)                 | M0 — Repo, tooling, Docker, Mastra + SvelteKit skeletons      |
| 5   | [11-m1-chat-e2e.md](11-m1-chat-e2e.md)                     | M1 — One agent, streaming end to end                          |
| 5.5 | [11b-m1.5-model-selection.md](11b-m1.5-model-selection.md) | M1.5 — Per-request model choice, allowlist, scripted model    |
| 5.6 | [11c-m1.6-polish.md](11c-m1.6-polish.md)                   | M1.6 — Per-request thinking toggle, composer fixes            |
| 5.7 | [11d-m1.7-openrouter.md](11d-m1.7-openrouter.md)           | M1.7 — Any OpenRouter model, grouped by provider              |
| 6   | [12-m2-threads-memory.md](12-m2-threads-memory.md)         | M2 — Conversation list, persistence, memory                   |
| 7   | [13-m3-menu-agent.md](13-m3-menu-agent.md)                 | M3 — Nutrition agent (first real use case)                    |
| 8   | [14-m4-cv-agent.md](14-m4-cv-agent.md)                     | M4 — CV agent, RAG, Typst → PDF                               |
| 9   | [15-m5-workflows.md](15-m5-workflows.md)                   | M5 — Workflows, HITL, schedules                               |
| 10  | [16-m6-auth-deploy.md](16-m6-auth-deploy.md)               | M6 — Auth and VPS deployment                                  |
| —   | [PROGRESS.md](PROGRESS.md)                                 | **Live state** — what is done, deviations, open questions     |

Each milestone is intended to be one fresh agent session. Start by reading this file
and `PROGRESS.md`, then the milestone doc plus docs 1–3. Update `PROGRESS.md` as you
work, not at the end.

## Non-negotiable rules for the executing agent

1. **Never write Mastra code from memory.** Mastra's API changes rapidly and your
   training data is stale. Before writing any Mastra code, consult the `mastra`
   skill at `.agents/skills/mastra/SKILL.md`. Prefer embedded docs in
   `node_modules/@mastra/*/dist/docs/` over remote docs once packages are installed.
2. **Never invent model IDs.** Run
   `.agents/skills/mastra/scripts/provider-registry.mjs` to get valid
   `provider/model` strings. Model names in this plan are placeholders.
3. **One milestone at a time.** Each milestone has an explicit _Definition of Done_.
   Do not begin milestone N+1 until milestone N's DoD is met and verified by running
   the app, not by reading the code.
4. **Do not scaffold ahead.** If a milestone does not need a file, do not create it.
   This project has one user and no deadline; premature abstraction is the main risk.
5. **Every task ends green.** No lint errors, no failing tests, no build errors, no
   coverage regression. `bun run verify` is the bar, and it applies per task, not per
   milestone. Never defer tests to "later".
6. **Ask when the plan is ambiguous.** The plan is deliberately not exhaustive about
   UI micro-decisions. Ask rather than guess on anything user-visible.
7. **Believe the packages over the plan.** These docs were written before any code
   existed. Where a document contradicts the installed packages, the packages win —
   then fix the document in the same commit and log it in
   [PROGRESS.md](PROGRESS.md). Never work around a stale doc silently; the next
   session will read it as authoritative.
