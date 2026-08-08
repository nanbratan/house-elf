# house-elf — agent instructions

A personal AI assistant platform: SvelteKit chat UI → Mastra agent server →
Postgres + pgvector. Single user, no deadline, built to be enjoyable to work on.

This project is built from a written plan. **Read the plan before writing code.**

## Start here

| If you are…                        | Read                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Starting any session               | [docs/plan/README.md](docs/plan/README.md), then [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md) |
| Implementing a milestone           | The milestone file, plus `01-decisions.md`, `02-conventions.md`, `03-testing.md`                |
| Writing any code                   | [.github/instructions/](.github/instructions/) — how we write code, and how we test it          |
| Wondering why something was chosen | [docs/plan/01-decisions.md](docs/plan/01-decisions.md) — it records rejected alternatives too   |

`docs/plan/PROGRESS.md` is the source of truth for what is done. Update it as you go.

The rules in `.github/instructions/` load automatically in VS Code. Other agents
should read them directly — they are the working agreement, not suggestions. When the
user teaches you a new one, capture it: `.github/skills/capture-convention/SKILL.md`.

## Non-negotiable rules

1. **Never write Mastra code from memory.** Mastra's API changes rapidly and your
   training data is stale. Consult the `mastra` skill at
   `.agents/skills/mastra/SKILL.md` first. Once packages are installed, prefer the
   embedded docs in `node_modules/@mastra/*/dist/docs/` over remote docs — they match
   the installed version exactly.
2. **Never invent model IDs.** Run
   `.agents/skills/mastra/scripts/provider-registry.mjs` for valid `provider/model`
   strings. Every model name in the plan is a placeholder. The allowlist in
   `apps/server/src/mastra/models.ts` is the only place ids are written down.
3. **One milestone at a time.** Do not start milestone N+1 until N's Definition of
   Done is met and verified _by running the app_, not by reading the code.
4. **Do not scaffold ahead.** If the current milestone does not need a file, do not
   create it. Premature abstraction is the main risk on a one-person project.
5. **Every task ends green.** `bun run verify:fast` (format, lint, types, and the
   tests importing your changed files) must pass before every commit. The pre-push
   hook runs the full gate and CI runs it again — do not run the slow `bun run
verify` by hand unless the change reaches beyond the files it touched. Never defer
   tests to "later". A bug fix starts with a failing test.
6. **Ask when the plan is ambiguous.** It is deliberately not exhaustive about UI
   micro-decisions. Ask rather than guess on anything user-visible.

## Toolchain

Bun (not npm/node) · SvelteKit 2 + Svelte 5 runes · Tailwind v4 · Mastra · Postgres 17

- pgvector · Vitest 3 + `@testing-library/svelte` · Playwright · ESLint 9 + Prettier ·
  exact-pinned TypeScript.

```bash
bun run dev       # everything
bun run verify:fast   # the gate before every commit — scoped, seconds
bun run test      # unit + integration + component, with coverage thresholds
```

Never use `npm`, `pnpm`, `yarn`, or `npx`. Use `bun` and `bunx`.

## Conventions worth repeating

- Business logic lives in the Mastra server. SvelteKit server routes are a **thin
  proxy, zero business logic**.
- Zod schemas for every tool input/output. Descriptions on every field — the model
  reads them.
- One agent per file under `apps/server/src/mastra/agents/`, same for tools and
  workflows.
- Svelte 5 runes only. No `export let`, no legacy stores.
- Secrets in `.env`, never committed. `.env.example` stays current.

## When the plan is wrong

The plan was written before the code existed and may not survive contact with a real
API. If a document contradicts what the installed packages actually do:

**Believe the packages.** Then fix the plan document in the same commit and note the
deviation in `PROGRESS.md`. Do not silently work around it — the next session reads
these documents as authoritative.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**

- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.

<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->

## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
