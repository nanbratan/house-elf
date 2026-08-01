# 02 — Conventions & Quality Gates

## Working agreement for the executing agent

### Before writing Mastra code — every time

1. Check `ls node_modules/@mastra/` to see what is installed.
2. Read embedded docs at `node_modules/@mastra/<pkg>/dist/docs/` for the exact
   installed version. These are authoritative.
3. If that does not answer it, read the `.d.ts` type definitions in the same package.
4. Only if packages are not yet installed, use remote docs via the `mastra` skill.

Your training data on Mastra is **wrong**. Constructor signatures, option names, and
method names have all changed. A type error in Mastra code is far more likely to be
your stale knowledge than a genuine mistake in the plan.

### Model identifiers

Run `.agents/skills/mastra/scripts/provider-registry.mjs` before using any model
string. Every `provider/model` value written in this plan is a **placeholder** and
must be verified.

### Verification is empirical

A milestone is done when the behaviour was observed in a running app or Studio — not
when the code looks correct and not when types compile. Each milestone lists explicit
manual verification steps. Perform them.

### Scope discipline

- Build only what the current milestone lists.
- No abstraction until there are three concrete instances of the pattern.
- No config option until something needs to vary.
- No error handling for conditions that cannot occur. Validate at boundaries
  (HTTP handlers, tool inputs) and let the rest throw.
- Do not test framework behaviour — but do test our own logic thoroughly. See
  [03-testing.md](03-testing.md).

### When to stop and ask

- Any user-visible design decision not specified here.
- Any deviation from `01-decisions.md`.
- Any need to add a new service, database, or deployment target.
- Any point where the plan appears wrong or internally inconsistent.

---

## Code conventions

### TypeScript

- `"module": "ES2022"`, `"moduleResolution": "bundler"`, `"strict": true`.
  **CommonJS will not work with Mastra.**
- `typescript` is pinned to an exact version. Do not bump it casually (D13).
- No `any`. Use `unknown` and narrow. Type-aware lint rules enforce this.
- Prefer inferring types from Zod schemas (`z.infer<typeof schema>`) over declaring
  them twice.
- Write code so it can be tested: inject side effects (clock, filesystem, process
  spawn) rather than reaching for them directly inside a tool's body.

### Mastra server structure

- One agent per file in `src/mastra/agents/`, default-exported.
- One tool per file in `src/mastra/tools/`.
- `src/mastra/index.ts` only wires things together — no logic.
- Agent instructions live in the agent file as a template literal, not in a separate
  prompt file, until there are more than ~5 agents.
- Every tool has a clear `description` and Zod `inputSchema`. The description is a
  prompt — write it for the model, not for a human reader.

### Svelte

- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`). No legacy stores
  for component state.
- Tailwind utility classes inline. No component library in M1–M2; add `bits-ui`
  only if a real accessibility need appears (dialogs, dropdowns).
- Components in `src/lib/components/`, route logic in `src/routes/`.
- Keep the chat message renderer part-driven: switch on the message part `type`
  (`text`, `reasoning`, `tool-*`, `source`) so new part types degrade gracefully
  rather than crashing.

### Web file layout

- `src/lib/components/<area>/` holds components and nothing else. Constants go to
  `src/lib/constants/`, plain modules to `src/lib/utils/`, reusable reactive
  behaviour to `src/lib/state/` as `*.svelte.ts`. Nothing lives in the root of
  `src/lib/` — the first file to need a folder creates it rather than settling
  there.
- Shared reactive behaviour is Svelte's answer to a hook: a `.svelte.ts` module
  exporting a `create*` factory that owns `$state`/`$derived` and returns getters.
  No `use` prefix — `use:` means an action in Svelte.
- `apps/web/tests/` mirrors `src/`: `tests/components/<area>/`, `tests/utils/`,
  `tests/routes/`, plus shared `tests/stubs/` and `tests/setup/`.
- A component's test is named for the component: `ToolCard.svelte` →
  `tests/components/chat/ToolCard.test.ts`. Mirrored paths keep names unambiguous,
  so no test needs a suffix to stay unique.
- A string constant repeated across components (states, modes, keys) gets a named
  `as const` object in its own module, `satisfies` the upstream type where one
  exists. Do not spell the same literal in two files.
- An `$effect` should read only what it must. Every reactive value it reads is a
  reason for it to re-run, and re-running fires its cleanup — so a timer inside an
  effect that reads its own writes will cancel itself.

### Environment variables

- All secrets in `.env` at repo root, loaded by Bun. Never committed.
- Maintain a committed `.env.example` listing every variable with a comment.
- Server reads env at startup and fails loudly on missing required values.

### Git

- Conventional commits (`feat:`, `fix:`, `chore:`, `test:`).
- One commit per completed milestone task, not one giant commit per milestone.
- **Every commit passes `bun run verify`.** Enforced by a pre-push hook.
- A bug fix commit contains the failing test that reproduces it.

---

## Quality gates

One command defines "done":

```bash
bun run verify   # check && lint && format:check && test && build
```

It must exit 0 before any task is considered complete — not just at milestone
boundaries. "No lint errors, no failing tests, no build errors" is the standing bar.

Individual commands, tool choices, coverage thresholds, and the full testing strategy
live in **[03-testing.md](03-testing.md)**. Read it before writing the first test.

Summary of the toolchain:

- **Lint:** ESLint 10 flat config, `typescript-eslint` (type-aware), `eslint-plugin-svelte`
- **Format:** Prettier + Svelte and Tailwind plugins
- **Types:** a single `typescript`, pinned to an exact version (D13)
- **Tests:** Vitest 4, `@testing-library/svelte`, Playwright, v8 coverage with
  enforced thresholds
- **Hooks:** lefthook (pre-commit fast subset, pre-push full verify)
- **CI:** GitHub Actions running `bun run verify`

### Definition of Done (applies to every milestone)

1. All tasks in the milestone document are complete.
2. `bun run verify` passes, including coverage thresholds.
3. New code in this milestone is covered per the thresholds in
   [03-testing.md](03-testing.md). Any exclusion is listed in the Vitest config with
   a written reason.
4. The manual verification steps in the milestone document were performed against a
   running app and observed to work. Automated tests do not replace this — they
   protect it.
5. `docker compose down -v && docker compose up` then a fresh `bun install`
   reproduces a working state — no undocumented local mutation.
6. `.env.example` and the milestone's README notes are current.
