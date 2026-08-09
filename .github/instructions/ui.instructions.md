---
description: 'Use when adding, changing, or re-syncing a shadcn component in apps/web. Covers the ownership policy for lib/components/ui and lib/components/ai-elements, the base-ui-only rule, and how to add a component.'
applyTo: 'apps/web/src/lib/components/ui/**, apps/web/src/lib/components/ai-elements/**'
---

# shadcn components

Why shadcn at all, and why base-ui: `bd list --all --type decision`.

## These directories are ours

- `lib/components/ui/` — shadcn registry primitives.
- `lib/components/ai-elements/` — ai-elements components.

**Both hold ordinary app code.** Full house style, `strictTypeChecked`, the
react-compiler rules, Prettier, tsconfig, tests. There is no carve-out, no
`.prettierignore` entry, no ESLint exemption and no coverage exclude for either path.

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

This matters more than it sounds: of ~91 symbols exported by the seven reachable
ai-elements, the app imports 26. `prompt-input.tsx` exports about 46 and `Composer.tsx`
uses six. Keeping the other forty means owning, restyling and reasoning about code that
never renders.

Re-derive reachability at graduation time — grep the importers, do not trust a
stale list. The registry is the backup: anything deleted is one `add` away.

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

1. Confirm the file landed in `src/lib/components/ui/`. If it did not, the
   `components.json` aliases are wrong — fix them, do not move the file by hand.
2. Prune to what the app uses.
3. Bring it to house style: tabs, single quotes, named exports at the declaration,
   `interface FooProps`, no type assertions, no hand-written `memo`/`useMemo`. Strip
   `use client` — TanStack Start does not use React Server Components, so the directive
   is inert noise that misleads the next reader into thinking a boundary exists.
4. Test what has behaviour.
5. `bun run verify:fast`.

Adding a component pulls its registry dependencies too — check what arrived before
committing. Never `add` a block wholesale (`dashboard-01` pulls `@dnd-kit/*`,
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
two directories.
