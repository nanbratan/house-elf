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

### A comment must survive the code it describes

Every comment is attached to something. If you delete or reverse a change, delete its
comment too — a doc comment left floating above nothing, or one explaining why code
that is no longer there was written, tells the next reader that a decision was made
and gives them no way to find out which.

Three that are never worth writing:

- **Comments on absent code.** "There is deliberately no X filter here." The reader
  cannot see the thing you did not do, so this reads as a warning about code that
  exists. If a rejected approach needs recording, it belongs in the plan document,
  where the alternatives already live.
- **Changelog comments.** "Now uses Y instead of Z", "kept for T1.7.4". Git knows. A
  comment describing an edit is addressed to a reviewer who will be gone by the next
  commit.
- **Statistics for their own sake.** One measurement that forces a decision earns its
  line — `supported_efforts` is never null, so absent means on/off. A table of counts
  nobody acts on is a notebook entry, not a comment.

This file is not a notebook. If a note has no reader who would act differently for
having read it, it does not go in the source.

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

### Props get a named type

Declare component props as a named type above the `$props()` call, never inline in
the destructuring. Inline annotations become unreadable past two props, and a named
type can be exported and reused by whoever renders the component. An `interface`,
because `consistent-type-definitions` rejects a `type` alias for an object shape.

```svelte
interface ModelPickerProps {
	models: readonly SelectableModel[];
	selectedModelId: string;
	onselect: (modelId: string) => void;
}

let { models, selectedModelId, onselect }: ModelPickerProps = $props();
```

### Handlers are named functions

Pass named functions to component props. An inline arrow is fine only for a trivial
forward such as `onstop={() => chat.stop()}`; anything with a body, arguments to
marshal, or more than one statement gets a named function declared in the script
block. The markup should read as a list of what is wired, not as where the logic
lives.
