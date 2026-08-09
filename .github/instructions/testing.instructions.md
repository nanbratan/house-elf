---
description: 'Use when writing, reviewing, or changing tests — unit, component, integration, or e2e. Covers what a test may assert, mocking and stubbing limits, mutation-proving, and where test files live.'
applyTo: '**/*.test.ts, **/*.test.tsx, **/*.spec.ts, **/*.spec.tsx, apps/*/tests/**, tests/**'
---

# Testing

These are the rules about how an individual test is written.

## Model non-determinism is not an excuse

Only one thing is genuinely untestable: whether the prose a model produced is _good_.
Everything else is ordinary software.

`MockLanguageModelV2` from `ai/test` is what makes the agent layer testable — supply
a scripted response, including tool calls and streamed chunks, and the agent runs
deterministically with no network and no cost. Verify its import path against the
installed `ai` package rather than recalling it.

**Never assert on model prose.** No `expect(response).toContain('protein')`. Assert
on tool calls, structured output shape, and persisted state.

**No network in unit or integration tests.** Mock the model.

Which layer: tool logic is a unit test with side effects injected. Whether the agent
picks the right tool is `MockLanguageModelV2`. Whether memory scopes correctly, or a
workflow branches, suspends and resumes, is an integration test against real Postgres
with the model mocked. Whether the prose is any _good_ is not unit-testable — evals,
or your eyes.

## A test asserts an outcome, not a mechanism

Test the behaviour the caller depends on. Do not assert that a particular internal
function was called, that a value passed through a particular path, or that an
implementation detail has a particular shape.

If the implementation can be rewritten without changing what callers observe, the
test must survive the rewrite.

```ts
// No — pins the mechanism. Breaks on any refactor, passes if the outcome is wrong.
expect(resolveModel).toHaveBeenCalledWith('anthropic/claude-opus-4-1');

// Yes — pins the outcome. Dies if validation disappears, however it was written.
expect(next).not.toHaveBeenCalled();
```

## Never assert a value your own stub produced

If the assertion reads back something the test itself supplied, it proves nothing.
A status code returned by a stubbed `json()` is the stub's value, not the code's.

Before writing an `expect`, ask: could this fail if the implementation were wrong?
If the answer is no, delete it.

## Test a component at its own boundary

Render the component under test directly and replace every in-repo child component
with a minimal stub. Test leaf behavior at the leaf; parent tests cover only
parent-owned behavior and the child contract (props and callbacks). Do not repeat a
grandchild interaction through each ancestor. Cross-component user flows belong in
E2E tests.

This is what makes a component safe to use anywhere: it is independent, its own
logic is proven, and no consumer's test depends on its internals.

Query by role and accessible name, not by CSS selector. Feed synthetic `UIMessage`
fixtures — never run a model.

Logic extracted from a component is tested without mounting: a React hook with
`renderHook`. Prefer this — if logic can be extracted and tested in isolation,
extract it. Where both exist, the extracted module's test owns the rules and the
component test owns only the wiring.

> **jsdom has no layout engine**, so `scrollHeight`, `scrollTop`,
> `getBoundingClientRect` and `IntersectionObserver` do not behave realistically.
> Stubbing those numbers is fair when our own arithmetic is under test — "is 200px
> from the bottom still following?" is our rule, not the browser's. It is not
> evidence that scrolling works: that a `scroll` event fires at all, that `scrollTo`
> moves anything, that a `ResizeObserver` notices. Those need Playwright and a real
> browser. A unit test that dispatches its own `scroll` event cannot discover that
> nothing dispatches it in real life.

## A stub renders nothing and invents nothing

A child stub records the props it was handed and renders a bare marker element. It
never grows buttons, labels or text of its own — invented markup is an assumption no
real component has to honour, and a test that clicks it is testing the stub.

To exercise a callback the parent passed down, read it back from the recorded props
and call it:

```ts
render(ChatView, props);
stubProps('composer').onsend('hello');
```

The one exception is a `children` snippet: a stub that receives one must render it,
or the parent's own markup disappears from the test.

## The test contains no logic

No branches, loops, or computation in a test body. A test is setup, action,
assertion. Expected values are written out literally, never derived — deriving them
re-implements the code under test, and a bug in both cancels out.

Shared setup goes in a small helper (`call()`, `render()`, a factory). The helper
builds inputs; it does not decide what is correct.

## Stub the framework, never the platform

Web primitives — `Request`, `Response`, `URL`, `AbortController` — are free and
behave correctly. Use the real thing. A hand-made `clone()` or a fake request object
is how a test stays green through a real bug.

Stub only the thin framework wrapper around them. Do not add a framework as a
devDependency purely to test our own glue: it buys little and breaks when the
framework moves.

## A test is not done until a mutation proves it

Green means nothing on its own. Break the code the test claims to cover and watch it
fail — then restore. Record the mutation in the bead's notes when it is load-bearing.

Each mutation should fail **exactly one** test. A mutation that fails nothing means
the test is decorative; one that fails five means the tests overlap.

## A bug fix starts with a failing test

Write the test that reproduces the bug, watch it fail for the right reason, then fix.
A fix that never had a red test does not stay fixed.

## Coverage is a floor, not a goal

Thresholds exist to catch whole files nobody tested. Do not write a test to move a
number — a test that exists only for coverage is worse than the gap it fills. If a
threshold is pushing you toward a meaningless test, exclude the file in the Vitest
config with a written reason instead.

| Area                               | Line | Branch |
| ---------------------------------- | ---- | ------ |
| `packages/shared`                  | 100% | 100%   |
| `apps/server/src/mastra/tools`     | 90%  | 85%    |
| `apps/server/src/mastra/workflows` | 85%  | 80%    |
| `apps/web/src/lib`                 | 85%  | 80%    |
| Global floor                       | 80%  | 75%    |

Excluded deliberately, each with a comment in the config: `src/mastra/index.ts` (pure
wiring), agent definition files (prompts and config — their behaviour is tested via
mocked-model integration tests), generated router boilerplate with no logic (`routeTree.gen.ts`),
generated and type-only files.

## Placement

- `src/**/*.test.ts` — unit. Pure logic, no I/O, no containers. This is the subset
  the pre-commit hook runs, so it must stay fast.
- `tests/**/*.integration.test.ts` — needs real Postgres (`bun run db:up`). Real
  Postgres and real pgvector, because the things most likely to break — memory
  scoping, vector queries, workflow snapshots — are precisely what a mock would hide.
  Give each test a unique resource and thread prefix so they can run in parallel.
- `tests/e2e/*.spec.ts` — Playwright, real browser. Slow and brittle by nature, so
  keep them to genuine user journeys plus the assertions jsdom cannot make. Fewer
  than ten, total.

Tests must be order-independent and parallel-safe: unique ids per test, no shared
mutable fixtures.

Delete tests that no longer earn their keep. One that breaks on every refactor
without ever catching a bug is a liability.

`bun run verify:fast` runs only the tests that import your changed files, which is
the right loop while working. When you do run a workspace's tests directly, run them
from the repo root — `bun run test` inside `apps/web` only runs the web workspace,
and the server tests never execute.
