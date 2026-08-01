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
5. **Every task ends green.** `bun run verify` (check, lint, format:check, test,
   build) must pass before a task is done — per task, not per milestone. Never defer
   tests to "later". A bug fix starts with a failing test.
6. **Ask when the plan is ambiguous.** It is deliberately not exhaustive about UI
   micro-decisions. Ask rather than guess on anything user-visible.

## Toolchain

Bun (not npm/node) · SvelteKit 2 + Svelte 5 runes · Tailwind v4 · Mastra · Postgres 17

- pgvector · Vitest 3 + `@testing-library/svelte` · Playwright · ESLint 9 + Prettier ·
  exact-pinned TypeScript.

```bash
bun run dev       # everything
bun run verify    # the gate — must pass before any task is done
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
