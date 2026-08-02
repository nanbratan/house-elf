---
description: 'Use when writing, reviewing, or changing tests — unit, component, integration, or e2e. Covers what a test may assert, mocking and stubbing limits, mutation-proving, and where test files live.'
applyTo: '**/*.test.ts, **/*.spec.ts, **/*.svelte.test.ts, apps/*/tests/**, tests/**'
---

# Testing

Strategy and layer boundaries live in [docs/plan/03-testing.md](../../docs/plan/03-testing.md).
These are the rules about how an individual test is written.

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

## Test Svelte components at their own boundary

For Svelte component units, render the component under test directly and replace
every in-repo child component with a minimal stub. Test leaf behavior at the leaf;
parent tests cover only parent-owned behavior and the child contract (props and
callbacks). Do not repeat a grandchild interaction through each ancestor.
Cross-component user flows belong in E2E tests.

## A stub renders nothing and invents nothing

A child stub records the props it was handed and renders a bare marker element. It
never grows buttons, labels, or text of its own — invented markup is an assumption
about the child that no real component has to honour, and a test that clicks it is
testing the stub.

To exercise a callback the parent passed down, read it back from the recorded props
and call it. Do not add an affordance to the stub so the test has something to click.

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
fail — then restore. Record the mutation in the PROGRESS entry when it is load-bearing.

Each mutation should fail **exactly one** test. A mutation that fails nothing means
the test is decorative; one that fails five means the tests overlap.

## A bug fix starts with a failing test

Write the test that reproduces the bug, watch it fail for the right reason, then fix.
A fix that never had a red test does not stay fixed.

## Coverage is a floor, not a goal

Thresholds exist to catch whole files nobody tested. Do not write a test to move a
number — a test that exists only for coverage is worse than the gap it fills.

## Placement

- `src/**/*.test.ts` — unit. Pure logic, no I/O, no containers. This is the subset
  the pre-commit hook runs, so it must stay fast.
- `tests/**/*.integration.test.ts` — needs real Postgres (`bun run db:up`).
- `tests/e2e/*.spec.ts` — Playwright, real browser.

Run the whole gate with `bun run verify` from the repo root. Running `bun run test`
inside `apps/web` only runs the web workspace — the server tests never execute.
