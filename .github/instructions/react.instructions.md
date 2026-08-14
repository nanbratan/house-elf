---
description: 'Use when writing or changing React, TSX, or TanStack Start code in this repo. Covers composition and render posture, memoisation, component and hook structure, effects, JSX, styling, and registry code.'
applyTo: '**/*.tsx, apps/web/**/*.ts'
---

# React & TanStack Start

Rules for the React app. [typescript.instructions.md](./typescript.instructions.md)
still applies in full — types, errors, comments, scope and dependencies are not
restated here. Why TanStack Start rather than another framework is in Beads:
`bd list --all --type decision`.

## The app is a composition of small components

This is the rule the rest of the file serves. Every component has one
responsibility, is tested at its own boundary, and does not re-render without a
reason. A component that meets all three is safe to use anywhere.

**Question the boundary every time you add to a component.** New markup or new state
in an existing component is a fork in the road: does this belong inline, or is it a
second responsibility that should be its own component rendered here? Answer it
deliberately rather than appending. A component acquiring its third `useState` and a
second concern is telling you it is two components.

Re-render posture is part of that review. When you create or change a component, ask
what causes it to re-render and whether that is justified — a component re-rendering
because a distant parent's unrelated state changed is a design defect, not a
performance detail to profile later.

## The compiler owns memoisation

React Compiler is enabled. It inserts memoisation at build time, precisely, so
`memo`, `useMemo` and `useCallback` are **not** written by hand as a default.

A manual one needs a written justification recording what was measured — an expensive
non-React computation, or an API that depends on reference equality. "It felt like it
might re-render" is not a measurement.

**A compiler bail-out is a defect in the component, not a reason to memoise by hand.**
The compiler silently skips components that break the Rules of React, and that
component quietly loses its memoisation. `eslint-plugin-react-hooks` reports the
Rules-of-React bail-outs as errors — fix the component so the compiler can take it.

### Every component change is checked against the compiler

A new component, or a change to an existing one, is not finished until the compiler is
known to have taken it. The check is the web build — about two seconds:

```sh
cd apps/web && bun run build 2>&1 | grep '\[react-compiler\]'
```

A line naming a file you touched means that component silently lost its memoisation.
Fix it before committing.

`react-compiler-healthcheck` is **not** the check. It reported "41 out of 41
components" compiled for a file this build bails out of ten times, and counted a
component using `??=` as "0 out of 0 components".

**Not every bail-out is a lint error.** The compiler also gives up on syntax it cannot
lower yet, which nothing in lint reports. Two known forms, each costing the _whole_
component its memoisation:

```tsx
ref.current ??= Date.now(); // Todo: Handle ??= operators in AssignmentExpression
function C({ open = false }) {} // Todo: Expected object property value to be an LVal
```

Write them as an `if`, and as a default resolved in the component body. `??=` also
trips `@typescript-eslint/prefer-nullish-coalescing`, which wants exactly the form the
compiler rejects — disable that rule on the line and say why. The compiler outranks the
idiom.

## Components

- One component per file, named export. No default exports: a default export has a
  different name at every call site, which defeats both the reader and serena's
  rename.
- Props get a named `interface FooProps` directly above the component, never inline
  in the parameter — `consistent-type-definitions` rejects a `type` alias for an
  object shape, and a named interface can be exported and reused by callers.
- Handlers are named functions declared in the component body. An inline arrow is
  fine only for a trivial forward such as `onStop={() => chat.stop()}`. This is a
  readability rule — the markup should read as a list of what is wired, not as where
  the logic lives.

### Props spreading is for leaf wrappers only

A leaf wrapper around one DOM element may extend `ComponentProps<…>` and spread, so
that native attributes work without being re-declared:

```tsx
interface ButtonProps extends ComponentProps<'button'> {
	variant?: 'ghost' | 'solid';
}
```

An app component — one that knows about our domain — lists its props explicitly. Its
prop list is its complete contract, and `{...props}` hides what it accepts from both
the reader and the type checker at the call site.

## Hooks

Shared reactive behaviour is a custom hook in `src/lib/hooks/`, `use`-prefixed. The
prefix is not a style choice: React's lint rules key off it, and an unprefixed hook
is not checked.

State belongs in a hook when more than one component needs it or it has rules of its
own worth testing without mounting anything. State used by one component, with no
logic beyond setting it, stays in the component.

### Every `useEffect` carries a justification

An effect synchronises with something outside React. Anything derivable is computed
during render; anything that happens because the user did something goes in the
handler that ran.

So every `useEffect` gets a comment saying why it cannot be either of those. If the
comment is hard to write, the effect is the wrong tool — this is the single most
common source of React bugs, and the justification is what forces the check.

## JSX

- Conditional rendering uses a ternary. `&&` is banned: a falsy left operand that is
  not a boolean renders itself, so `{count && <Badge />}` puts a literal `0` on the
  page when the list is empty.
- A key is a stable id from the data. An array index is never a key — with streamed
  message parts the index of a given part changes as parts arrive, and React reuses
  the wrong DOM node.

## Styling

Tailwind utility classes inline, using the semantic tokens in `layout.css`.
`prettier-plugin-tailwindcss` owns class order.

A CSS module is for what Tailwind genuinely cannot express — keyframes, container
queries. React has no scoped `<style>`, so this is a real gap rather than a
preference; reach for it only when the utility form does not exist.

## Code from the shadcn registry

`lib/components/ui/`, `lib/components/assistant-ui/` and `lib/components/elements/`
hold registry code that is **ours**, not a reference copy: it meets every rule in this file in full, including the
`use client` directive being stripped. TanStack Start does not use React Server
Components, so the directive is inert noise that misleads the next reader into thinking
a boundary exists.

Bring a file in by copying only what the app uses, then restyling it in the same commit.
[ui.instructions.md](./ui.instructions.md) has the full policy, the base-ui-only rule
and the CLI traps.
