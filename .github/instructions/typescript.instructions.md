---
description: 'Use when writing or changing TypeScript, Svelte, or server code in this repo. Covers typing discipline, error handling, comments, file placement, and dependency choices.'
applyTo: '**/*.ts, **/*.svelte, **/*.js, **/*.mjs'
---

# TypeScript & code style

Project conventions live in [docs/plan/02-conventions.md](../../docs/plan/02-conventions.md).
These are the rules about writing the code itself.

## Types

- No `any`. Reach for `unknown` at boundaries and narrow deliberately.
- No type assertions to silence the compiler. An assertion is a claim the compiler
  cannot check — if you need one, comment why it is safe.
- Validate at system boundaries (request bodies, env, tool inputs) with Zod, then
  trust the type inside.
- TypeScript is pinned exactly. Do not bump it as a side effect of another change.

## Errors

- Throw typed errors (`class FooError extends Error`) so callers can discriminate
  with `instanceof`. Do not match on message text.
- Catch narrowly and rethrow what you did not mean to handle.
- Never swallow an error into a bare `catch {}`. A broad catch hides the bug you are
  about to spend an hour finding.
- No error handling for cases that cannot happen. Do not defend against your own
  types.

## Comments

Comment **why**, never **what**. The code says what it does.

The comments worth writing record something the next reader cannot see: a constraint
in someone else's library, a decision and its rejected alternative, a bug that was
caused by the obvious version of this code.

```ts
// Clone before reading. A request body is a one-shot stream — consuming it here
// leaves the route handler with nothing and produces a bare 500.
body = await c.req.raw.clone().json();
```

If a comment states a fact about a dependency, it must have been verified against the
installed version, not recalled.

## Scope

- Change what was asked and what that requires. Nothing else.
- No new abstraction for a single call site. The second occurrence earns the helper.
- Do not add options, flags, or extension points nobody asked for.
- Do not scaffold files the current task does not need.

## Dependencies

A new dependency needs a reason that outweighs owning the code. Test-only
dependencies added to test our own glue are usually not worth it.

Bun only — never `npm`, `pnpm`, `yarn`, or `npx`. Use `bunx` for one-off tools.

## Placement

- One agent per file in `apps/server/src/mastra/agents/`, one tool per file in
  `tools/`, one middleware per file in `middleware/`.
- A file whose kind has a folder goes in it. The first second-of-its-kind creates the
  folder; one file does not.
- No `utils/` junk drawer. Domain modules keep domain names.
- `src/mastra/index.ts` only wires things together — no logic.
- SvelteKit server routes are a thin proxy: zero business logic, which lives on the
  Mastra server.

## Svelte

Svelte 5 runes only. No `export let`, no legacy stores.
