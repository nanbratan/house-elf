---
description: 'Use when writing or changing TypeScript, Svelte, or server code in this repo. Covers typing discipline, error handling, comments, file placement, and dependency choices.'
applyTo: '**/*.ts, **/*.svelte, **/*.js, **/*.mjs'
---

# TypeScript & code style

These are the rules about writing the code itself. Why a technology was chosen is in
Beads: `bd list --all --type decision`.

## Types

- No `any`. Reach for `unknown` at boundaries and narrow deliberately.
- No type assertions to silence the compiler. An assertion is a claim the compiler
  cannot check — if you need one, comment why it is safe.
- Validate at system boundaries (request bodies, env, tool inputs) with Zod, then
  trust the type inside. Prefer `z.infer<typeof schema>` over declaring the shape
  twice.
- ES modules only: `"module": "ES2022"`, `"moduleResolution": "bundler"`,
  `"strict": true`. CommonJS does not work with Mastra.
- TypeScript is pinned exactly. Do not bump it as a side effect of another change.
- Write code so it can be tested: inject side effects — clock, filesystem, process
  spawn, `fetch` — rather than reaching for them inside a tool body.

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

If you delete or reverse a change, delete its comment. A comment explaining code that
is no longer there tells the next reader a decision was made and gives them no way to
find out which.

Three that are never worth writing:

- **Comments on absent code.** "There is deliberately no X filter here." The reader
  cannot see what you did not do, so it reads as a warning about code that exists. A
  rejected approach belongs in a Beads decision issue.
- **Changelog comments.** "Now uses Y instead of Z", "kept for T1.7.4". Git knows.
- **Statistics for their own sake.** One measurement that forces a decision earns its
  line — `supported_efforts` is never null, so absent means on/off. A table of counts
  nobody acts on is a notebook entry.

If a note has no reader who would act differently for having read it, it does not go
in the source.

## Scope

- Change what was asked and what that requires. Nothing else.
- No new abstraction for a single call site. The second occurrence earns the helper.
- Do not add options, flags, or extension points nobody asked for.
- Do not scaffold files the current task does not need.

## Dependencies

A new dependency needs a reason that outweighs owning the code. Test-only
dependencies added to test our own glue are usually not worth it.

Bun only — never `npm`, `pnpm`, `yarn`, or `npx`. Use `bunx` for one-off tools.

## Mastra

Your training data on Mastra is **wrong** — constructor signatures, option names and
method names have all changed. Never write it from memory; a type error in Mastra
code is more likely stale knowledge than a real mistake.

Start with the `mastra` MCP server (`searchMastraDocs`, `readMastraDocs`). **It
under-reports, so an empty result proves nothing** — measured 2026-08-08, it omitted
`@mastra/pg` despite its full `dist/docs/`, failed on `Agent` with "No SOURCE_MAP.json
found", and missed "working memory resource scope" that
`docs-memory-working-memory.md` states in its opening lines.

When it comes back empty or thin, read the files — they match the installed version.
`ls node_modules/@mastra/` for what is actually installed, then grep
`node_modules/@mastra/<pkg>/dist/docs/references/`, then the `.d.ts`.

Never invent a model id. Run `.agents/skills/mastra/scripts/provider-registry.mjs`
for valid `provider/model` strings. `apps/server/src/mastra/models.ts` is the only
place ids are written down.

Every tool gets a `description` and a Zod `inputSchema`, with a description on each
field. Those descriptions are prompt text — write them for the model, not for a
human reader.

Agent instructions live in the agent file as a template literal, not in a separate
prompt file, until there are more than about five agents.

## Placement

- One agent per file in `apps/server/src/mastra/agents/`, one tool per file in
  `tools/`, one middleware per file in `middleware/`.
- A file whose kind has a folder goes in it. The first second-of-its-kind creates the
  folder; one file does not.
- No `utils/` junk drawer. Domain modules keep domain names — the model allowlist and
  error shaping stay at the root of `src/mastra/`.
- `src/mastra/index.ts` only wires things together — no logic.
- SvelteKit server routes are a thin proxy: zero business logic, which lives on the
  Mastra server.

### Web

- `src/lib/components/<area>/` holds components and nothing else. Constants go to
  `src/lib/constants/`, plain modules to `src/lib/utils/`, reusable reactive
  behaviour to `src/lib/state/` as `*.svelte.ts`. Nothing lives in the root of
  `src/lib/` — the first file to need a folder creates it rather than settling there.
- `apps/web/tests/` mirrors `src/`. A component's test is named for the component:
  `ToolCard.svelte` → `tests/components/chat/ToolCard.test.ts`. Mirrored paths keep
  names unambiguous, so no test needs a suffix to stay unique.
- A string constant repeated across components (states, modes, keys) gets a named
  `as const` object in its own module, and `satisfies` the upstream type where one
  exists. Do not spell the same literal in two files.

## Environment

All secrets live in `.env` at the repo root and are never committed. Keep
`.env.example` current — every variable, with a comment. The server reads env at
startup and fails loudly on a missing required value.

## Svelte

Svelte 5 runes only. No `export let`, no legacy stores.

Tailwind utility classes inline. No component library — add `bits-ui` only when a
real accessibility need appears, such as a dialog or a dropdown.

Keep the chat message renderer part-driven: switch on the message part `type`
(`text`, `reasoning`, `tool-*`, `source`) so an unknown part type degrades gracefully
rather than crashing.

### Shared reactive behaviour is a `.svelte.ts` module

Svelte's answer to a hook: a `.svelte.ts` module exporting a `create*` factory that
owns the `$state`/`$derived` and returns getters. No `use` prefix — in Svelte, `use:`
means an action.

### An `$effect` reads only what it must

Every reactive value an effect reads is a reason for it to re-run, and re-running
fires its cleanup. A timer inside an effect that reads its own writes will cancel
itself.

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
