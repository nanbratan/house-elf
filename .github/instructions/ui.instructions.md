---
description: 'Use when adding, changing, or re-syncing a registry component in apps/web. Covers the ownership policy for lib/components/ui, lib/components/assistant-ui and lib/components/elements, the base-ui-only rule, and how to add a component.'
applyTo: 'apps/web/src/lib/components/ui/**, apps/web/src/lib/components/assistant-ui/**, apps/web/src/lib/components/elements/**'
---

# shadcn components

Why shadcn at all, and why base-ui: `bd list --all --type decision`.

## These directories are ours

- `lib/components/ui/` — shadcn registry primitives.
- `lib/components/assistant-ui/` — `@assistant-ui/*` registry components built on the
  primitives (`reasoning`, `tool-group`, `tool-fallback`).
- `lib/components/elements/` — `@assistant-ui/elements-*` registry components, the
  presentational layer that carries no primitive of its own (`composer`, `surfaces`).

**All three hold ordinary app code.** Full house style, `strictTypeChecked`, the
react-compiler rules, Prettier, tsconfig, tests. There is no carve-out, no
`.prettierignore` entry, no ESLint exemption and no coverage exclude for any of them.

This is shadcn's own model, not a local deviation. Its Open Code principle puts
behaviour, accessibility and keyboard handling in `@base-ui-components/react` — an
ordinary npm dependency, updated with `bun update` — and leaves the copied file as the
design layer: variant maps, class strings, composition. Nothing arrives by re-copying a
file that would not also arrive by upgrading the package.

So `shadcn add` output is a **starting point, not an artefact**. Preserving upstream
formatting to keep a diff clean protects an upgrade path that does not exist, and buys
it with code no rule in this repo applies to. A change to one of these files must fail a
test, not pass quietly.

## Prune on graduation

A file keeps only what the app imports, plus the internals those parts need. Delete the
rest in the same commit that brings the file in.

This matters more than it sounds: `@assistant-ui/elements-composer` exports 20 symbols
and `chat/Composer.tsx` renders four of them (`house-elf-r9z.10`). The other sixteen are
a slash menu, @mentions, attachment chips, a voice recorder and a usage meter — none of
which has an adapter behind it, so none of which can render. Keeping them means owning,
restyling and reasoning about code the app cannot reach.

Re-derive reachability at graduation time — grep the importers, do not trust a
stale list. The registry is the backup: anything deleted is one `add` away.

### A lookup table is not dead code

The test is reachability, not current usage. `elements-composer`'s sixteen unused
exports each need an adapter that does not exist, so no prop change can make them
render — they go. `@assistant-ui/dot-matrix` ships twenty states, of which
`thinking-indicator` uses one; but they are rows in a table, each reachable by a
one-word change to an existing call site's `state` prop, with no dependency or
subsystem behind them (`house-elf-r9z.12`). Those stay.

The gate is empirical, not rhetorical: unused table rows are uncovered lines, so run
`bun run test` after the file lands. If keeping them drops the workspace under its
coverage floor, prune to what is used after all.

## Testing

The normal rule applies, with no exemption. A component earns its own test when it has
behaviour that can fail independently of how it looks — state, effects, timers,
module-level caches, event handling, conditional rendering, data transformation.

A component that only maps props onto class names does not. Its correctness is that it
renders, which the tests of the component that uses it already prove; asserting its
class strings is the "assert outcomes, not mechanisms" antipattern
[testing.instructions.md](./testing.instructions.md) bans, and it breaks on every design
tweak while catching nothing.

Concretely: a shiki highlighter cache, an auto-close timer, controllable state or scroll
anchoring earns a test. A restyled `badge.tsx` does not.

## base-ui only — no radix

Every component here resolves to the `base-nova` style, which is base-ui backed.
`radix-ui` is not a dependency of this repo and must not become one again.

**The style is resolved from the nearest `components.json`, which lives in `apps/web/` —
not the repo root.** Always pass `--cwd apps/web`, or run the CLI from there. The same
applies to the shadcn MCP server: `.mcp.json` pins `--cwd apps/web` for exactly this
reason. Check the `registry/<style>/` prefix in any registry output you rely on — if it
does not say `base-nova`, you were in the wrong directory and are reading radix source.

### Known base-ui differences from radix

Reach for these when a component copied from an older source does not compile:

| radix                                                      | base-ui                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `asChild`                                                  | `render={…}` — `asChild` does not exist in base-nova at all |
| `DropdownMenuCheckboxItem` `onSelect` + `preventDefault()` | `closeOnClick={false}`                                      |
| `HoverCard` `openDelay`/`closeDelay` on the root           | `delay`/`closeDelay` on the **Trigger**                     |
| `TooltipProvider` `delayDuration`                          | `delay`                                                     |

## Adding a component

```sh
bunx shadcn@latest add <name> --cwd apps/web
```

Bun only — never `npx`. Inspect first with `--dry-run`, `--view` or `--diff` if you want
to see what lands before it lands. Then, in the same commit:

1. Confirm where the file landed. The registry namespace decides the directory:
   shadcn's own components go to `src/lib/components/ui/`, `@assistant-ui/*` to
   `assistant-ui/`, `@assistant-ui/elements-*` to `elements/`. If a _component_ lands
   somewhere else, the `components.json`
   aliases are wrong — fix them, do not move the file by hand. A registry dependency that
   is not a component is another matter: `elements-composer` writes its shared
   `surfaces.tsx`/`range.ts` to the `lib` alias, i.e. `src/lib/` itself. Move those next
   to the component that imports them; nothing else will ever use them.
2. Prune to what the app uses.
3. Bring it to house style: tabs, single quotes, named exports at the declaration,
   `interface FooProps`, no type assertions, no hand-written `memo`/`useMemo`. Strip
   `use client` — TanStack Start does not use React Server Components, so the directive
   is inert noise that misleads the next reader into thinking a boundary exists.
4. Test what has behaviour.
5. `bun run verify:fast`.

Adding a component pulls its registry dependencies too — check what arrived before
committing. It also rewrites `src/styles/app.css`: `elements-composer` re-appended an
`@import 'tw-shimmer'` we already had and dropped the file's trailing newline. Read the
diff on that file every time and revert what you did not ask for.

Never `add` a block wholesale (`dashboard-01` pulls `@dnd-kit/*`,
`@tanstack/react-table` and `zod`); read a block for its composition and copy only what
you need.

## Taking an upstream change

Deliberate, never routine. Logic and a11y fixes arrive through
`@base-ui-components/react`, so the only reason to revisit the registry is a design-layer
change you actually want.

```sh
bunx shadcn@latest add <name> --diff --cwd apps/web
```

Read it, take what you want by hand, keep our style and our pruning. `add --overwrite`
throws both away — if you use it, you are re-doing steps 2–4 above.

The `diff` subcommand is deprecated in the pinned CLI (4.16.2) and prints a notice
pointing at `add --diff`.

## Theme tokens

Colours are `oklch` custom properties in `apps/web/src/styles/app.css`, base-nova with
the `mist` base colour, **dark-only, in a single `:root` block** — there is no light
palette and no `.dark` override block. `--faint` is ours, not shadcn's; keep it.

`@custom-variant dark` and `className="dark"` on `<html>` stay even though the app is
dark-only: base-nova ships `dark:` utilities inside its own class strings, and they are
inert without the class.

Never rename a shadcn token. The names are the contract with every component in these
three directories.
