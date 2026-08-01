# 03 — Testing Strategy

**Goal:** a suite that catches regressions before you notice them, without testing
things that cannot regress and without pretending non-deterministic model output is
deterministic.

Every chunk of work ends with: **no lint errors, no failing tests, no build errors,
coverage above threshold.** No exceptions, no "I'll add tests later."

---

## The hard part: agents are non-deterministic

This is why most AI projects have no tests. The way out is to separate the two things
you might be testing:

| What you're testing                          | Deterministic?           | How                                         |
| -------------------------------------------- | ------------------------ | ------------------------------------------- |
| Tool logic (compile PDF, parse, calculate)   | Yes                      | Ordinary unit tests                         |
| Whether the agent _calls_ the right tool     | Yes, with a mocked model | `MockLanguageModelV2`                       |
| Whether memory persists and is scoped right  | Yes                      | Integration tests against real Postgres     |
| Whether a workflow branches/suspends/resumes | Yes                      | Integration tests, mocked models            |
| UI rendering of stream parts                 | Yes                      | Component tests with synthetic streams      |
| Whether the CV it wrote is _good_            | **No**                   | Not unit-testable. Use evals, or your eyes. |

Only the last row is untestable. Everything else is ordinary software and gets
ordinary tests.

### `MockLanguageModelV2` is the load-bearing tool

The AI SDK exports mock models from `ai/test`. You supply a scripted response —
including tool calls and streamed chunks — and the agent runs deterministically with
no network and no cost. This makes almost the entire agent layer testable.

Use it to assert:

- Given a user message, the agent calls tool X with arguments matching a schema.
- Given a tool error, the agent retries (and stops after the cap).
- Given a multi-step scenario, the expected sequence of tool calls occurs.
- The system prompt actually contains the working-memory content it should.

Verify the exact import path and API against the installed `ai` package version.

---

## The layers

### 1. Unit — pure logic

Fast, no I/O, no containers. This is where most tests live.

- Tool implementations with their side effects injected or stubbed.
- Zod schema round-trips where the shape is non-obvious.
- Any parsing, date arithmetic, macro/nutrition calculation, chunking helpers.
- Error paths: timeouts, malformed input, resource limits.

Run with `bun run test:unit`. Should complete in seconds.

Stub the framework, never the platform. A hand-made `clone()` or a fake `Request` is
how a test stays green through a real bug. Web primitives — `Request`, `Response`,
`URL` — are free and behave correctly, so use the real thing and stub only the thin
framework wrapper around it. Pulling in a framework as a devDependency purely to test
our own glue is the other extreme: it buys little and breaks when the framework moves.

### 2. Integration — against real Postgres

A `postgres-test` service in `infra/docker-compose.yml` on a different port, with its
own volume, torn down and recreated per run. Real Postgres, real pgvector — because
the things most likely to break (memory scoping, vector queries, workflow snapshots)
are precisely the things a mock would hide.

- Memory: writes land, reads come back, **working memory is resource-scoped and
  visible across threads** (this is the highest-value test in the project).
- Threads: create, list, delete, message ordering.
- Vector: ingest chunks, retrieve by similarity, metadata filters apply.
- Workflows: run to completion, branch correctly, suspend, **survive a simulated
  process restart**, resume with supplied data.

Each test gets a unique resource/thread prefix so tests do not collide and can run in
parallel.

### 3. Component — Svelte with Testing Library

`@testing-library/svelte` + `@testing-library/user-event` running in jsdom, per the
official Svelte testing docs. Query by role and accessible name, not by CSS selector,
so tests survive markup refactors.

- The message renderer handles every part type: `text`, `reasoning`, `tool-call` in
  each state (pending / streaming args / result / error), `source`, and an **unknown
  part type** (must render nothing, must not throw).
- Partial tool arguments mid-stream render without crashing.
- Composer: Enter sends, Shift+Enter newlines, Stop appears only while streaming.
- Markdown and code highlighting render; injected HTML is sanitised.
- Sidebar: thread list, sort order, empty state.

Feed these synthetic `UIMessage` fixtures — do not run a model.

**Rune-heavy logic** (`.svelte.ts` files) is tested directly with `$state` /
`$effect.root` / `flushSync`, without mounting a component. Prefer this: if logic can
be extracted from a component and tested in isolation, extract it. Where both exist,
the `.svelte.ts` test owns the rules and the component test owns only the wiring —
that the behaviour is attached to the right elements, and that what it decides
reaches the screen. `stick-to-bottom` is the worked example: seven tests on the
module, three on the component.

> **jsdom's limit:** there is no layout engine, so `scrollHeight`, `scrollTop`,
> `getBoundingClientRect`, and `IntersectionObserver` do not behave realistically.
> Stubbing those numbers is fair when what is under test is our arithmetic — "is 200
> px from the bottom still following?" is our rule, not the browser's. It is not fair
> as evidence that scrolling works: that a `scroll` event fires at all, that
> `scrollTo` moves anything, that a `ResizeObserver` notices. Those go to Playwright,
> and to a real browser before the task is called done. A unit test that dispatches
> its own `scroll` event cannot discover that nothing dispatches it in real life.

**Where a test stubs something, make it fail.** A fake that only replays callbacks
will happily pass code that never registered them. Break the source on purpose —
move the constant, invert the condition, delete the subscription — and confirm the
suite goes red, and red in the right test. Green proves nothing on its own.

### 4. E2E — Playwright, deliberately few

Slow and brittle by nature, so keep them to genuine user journeys only, plus the
handful of assertions jsdom cannot make. Target: fewer than ten, total.

- Send a message, see a streamed response (against a stubbed model endpoint).
- **Auto-scroll follows a stream, and stops following once the user scrolls up.**
  (Here because it needs real layout.)
- Create a conversation, reload the page, history is intact.
- Upload a document, see it listed.
- Generate a PDF, the download link works and returns a valid PDF.
- Log in / log out (from M6).

---

## Coverage

Enforced via `@vitest/coverage-v8` thresholds in config. `bun run test` **fails** if
coverage drops below them.

| Area                               | Line | Branch | Rationale                     |
| ---------------------------------- | ---- | ------ | ----------------------------- |
| `packages/shared`                  | 100% | 100%   | Tiny, pure, no excuse         |
| `apps/server/src/mastra/tools`     | 90%  | 85%    | Real logic, real side effects |
| `apps/server/src/mastra/workflows` | 85%  | 80%    | Branching is the point        |
| `apps/web/src/lib`                 | 85%  | 80%    | The renderer must not crash   |
| Global                             | 80%  | 75%    | Floor                         |

### Deliberately excluded from coverage

Listed explicitly in the Vitest config with a comment for each:

- `src/mastra/index.ts` — pure wiring, no logic.
- Agent definition files — they are prompts and config; the _behaviour_ is tested via
  mocked-model integration tests instead.
- SvelteKit `+layout`/`+page` boilerplate with no logic.
- Generated files, type-only files.

> Gaming coverage by testing trivia is worse than having lower coverage. If a
> threshold is pushing you toward writing a meaningless test, exclude the file and
> write down why instead.

---

## Commands

Wire these in M0. Every one must exist and pass from the first milestone onward.

```bash
bun run check         # tsc --noEmit + svelte-check — the type gate
bun run lint          # eslint . (type-aware, includes .svelte)
bun run format        # prettier --write .
bun run format:check  # prettier --check .             (for CI / pre-commit)

bun run test          # unit + integration + component, with coverage thresholds
bun run test:unit     # fast subset, no containers
bun run test:watch    # development loop
bun run test:e2e      # playwright

bun run build         # both apps build cleanly

bun run verify        # check && lint && format:check && test && build
```

`bun run verify` is the single command that defines "done". Run it before every
commit.

---

## Automation

- **Pre-commit hook** (`lefthook` — fast, single Go binary, simple YAML): run
  `format:check`, `lint`, and `test:unit` on staged files. Keep it under a few
  seconds so it never tempts you to `--no-verify`.
- **Pre-push hook:** full `bun run verify`.
- **CI:** a single GitHub Actions workflow running `bun run verify` on push. Add this
  in M0 — it is fifteen lines and it is the thing that actually holds the line when
  you come back to the project after two months away.

---

## Rules

1. **A bug fix starts with a failing test.** Reproduce it in a test, then fix it. This
   is how the suite becomes a regression net rather than decoration.
2. **Never assert on model prose.** No `expect(response).toContain('protein')`. Assert
   on tool calls, structured output shape, and persisted state.
3. **No network in unit or integration tests.** Real provider calls are slow, costly,
   and flaky. Mock the model.
4. **Tests must be order-independent and parallel-safe.** Unique IDs per test, no
   shared mutable fixtures.
5. **Delete tests that no longer earn their keep.** A test that breaks on every
   refactor without ever catching a bug is a liability.
