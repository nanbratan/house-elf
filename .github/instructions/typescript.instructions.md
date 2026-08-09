---
description: 'Use when writing or changing TypeScript or server code in this repo. Covers typing discipline, error handling, comments, file placement, and dependency choices.'
applyTo: '**/*.ts, **/*.js, **/*.mjs'
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

The reader is an agent with a token budget, not a browser of prose. A comment earns
its place only if someone would act differently for having read it — that is the whole
test. Justification, narrative, and the reasoning that led you to the code fail it:
they cost every future reader tokens and get skipped. Keep the conclusion, drop the
argument for it.

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

Four that are never worth writing:

- **Comments on absent code.** "There is deliberately no X filter here." The reader
  cannot see what you did not do, so it reads as a warning about code that exists. A
  rejected approach belongs in a Beads decision issue.
- **Changelog comments.** "Now uses Y instead of Z", "kept for T1.7.4". Git knows.
- **Statistics for their own sake.** One measurement that forces a decision earns its
  line — `supported_efforts` is never null, so absent means on/off. A table of counts
  nobody acts on is a notebook entry.
- **Comments that argue.** Rehearsing the evidence, alternatives or measurements
  behind a line in order to justify it. The bead holds the reasoning; the source keeps
  the conclusion.

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
- TanStack Start server routes are a thin proxy: zero business logic, which lives on
  the Mastra server.

### Web

- `src/lib/components/<area>/` holds components and nothing else. Constants go to
  `src/lib/constants/`, plain modules to `src/lib/utils/`, reusable hooks to
  `src/lib/hooks/`. Nothing lives in the root of `src/lib/` — the first file to need
  a folder creates it rather than settling there.
- `apps/web/tests/` mirrors `src/`. A component's test is named for the component:
  `ToolCard.tsx` → `tests/components/chat/ToolCard.test.tsx`. Mirrored paths keep
  names unambiguous, so no test needs a suffix to stay unique.
- A string constant repeated across components (states, modes, keys) gets a named
  `as const` object in its own module, and `satisfies` the upstream type where one
  exists. Do not spell the same literal in two files.
- A map keyed by a union type is declared `satisfies Record<Union, T>`, so a member
  added upstream is a compile error rather than a silent `undefined` at runtime —
  `src/lib/constants/tool-state.ts` does this against the SDK's `ToolState`.

## Environment

All secrets live in `.env` at the repo root and are never committed. Keep
`.env.example` current — every variable, with a comment. The server reads env at
startup and fails loudly on a missing required value.
