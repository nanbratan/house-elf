---
name: shadcn
description: How shadcn components are written in this repo — adding, composing, styling, and debugging UI in apps/web. Applies whenever touching lib/components/ui, lib/components/assistant-ui, lib/components/elements, or running the shadcn CLI. Triggers on shadcn, components.json, registry items, base-ui vs radix, InputGroup/Field/Empty/Combobox composition.
---

# shadcn in house-elf

The upstream skill is vendored at `.agents/skills/shadcn/`. Read it for detail —
but it is written for a generic npm project, so the three overrides below win
wherever they disagree.

## Overrides — these beat anything the vendored files say

1. **Runner is `bunx`, and every CLI call needs `--cwd apps/web`.**
   ```
   bunx shadcn@latest <cmd> --cwd apps/web
   ```
   Never `npx` or `pnpm dlx` — CLAUDE.md bans them. Without `--cwd apps/web` the
   CLI reads the wrong `components.json` and silently serves radix instead of
   base-nova. This is what commit `17c71c4` fixed for the MCP server; the same
   applies to every hand-run command.

2. **base-ui only, never radix.** `.agents/skills/shadcn/rules/base-vs-radix.md`
   is the API-difference reference: use `render`, not `asChild`.

3. **`ui.instructions.md` wins on house style.** Registry output is a starting
   point, restyled in the same commit: named exports, `interface FooProps`, no
   `"use client"`, tabs, single quotes. Bring in only what the app imports and
   delete the rest — including unused variants, which is how the registry's
   `button`/`input`/`textarea` deps get dropped.

## Where to look

| For | Read |
| --- | --- |
| Composition rules (items-in-groups, `asChild` vs `render`, Card/Dialog) | `.agents/skills/shadcn/rules/composition.md` |
| base vs radix API differences | `.agents/skills/shadcn/rules/base-vs-radix.md` |
| Tailwind rules (`gap-*` not `space-y-*`, `size-*`, semantic tokens) | `.agents/skills/shadcn/rules/styling.md` |
| Forms, `Field`, `InputGroup` | `.agents/skills/shadcn/rules/forms.md` |
| Icons in buttons (`data-icon`) | `.agents/skills/shadcn/rules/icons.md` |
| Registry/MCP usage | `.agents/skills/shadcn/registry.md`, `mcp.md` |

## Known deviations already taken in this repo

Documented in the components themselves — don't "fix" them back:

- `ui/command.tsx` drops the registry's `p-1` on `Command`, and uses
  `data-[selected=true]:` where the registry has bare `data-selected:` (cmdk
  writes the attribute on unselected rows too, so presence alone matches
  everything).
- `ui/command.tsx`'s `CommandInput` is a bare `CommandPrimitive.Input` carrying
  `data-slot="input-group-control"`, not the registry's self-wrapping version —
  the caller composes the `InputGroup` so other addons can share the row. This is
  the sanctioned exception to "never raw input inside `InputGroup`": it is an
  unstyled primitive filling the control slot, not a bordered `Input`.
- `ui/input-group.tsx` is pruned to `InputGroup`/`InputGroupAddon`/
  `InputGroupInput`, with only the two inline `align` variants.
- Defaults go in the function body (`const x = prop ?? 'default'`), never in the
  parameter pattern — the React Compiler cannot lower a destructuring default and
  bails out of the whole component.
