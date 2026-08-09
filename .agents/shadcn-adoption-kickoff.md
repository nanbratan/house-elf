# Kickoff: shadcn adoption

Phase 1 of a full shadcn adoption in `apps/web`. **This run produces analysis and
issues only — do not modify any application code.** The single exception is the
pre-flight gate below.

---

## 0. Pre-flight gate (blocking — do these first, stop if any fails)

1. **serena is misconfigured.** `.serena/project.yml` declares
   `languages: [typescript]`, but the running server reports
   `Active languages: ['svelte']` — stale state from before the React migration.
   Every symbol call fails, including on ordinary files like
   `apps/web/src/lib/components/chat/FilterSelect.tsx`. Restart the serena MCP
   server and verify with `get_symbols_overview` on that file. serena is the only
   tool permitted to write code here, so nothing proceeds until it works.
2. **shadcn MCP is not connected** in a fresh session, and `.mcp.json` launches it
   with `npx`, which this project bans (`bunx` only). Fix the config and confirm
   the server's tools are reachable. If they aren't, fall back to the CLI —
   `bunx shadcn@latest search|view|docs` — and say so in your report.
3. **codebase-memory does not index `vendor/`.** The graph holds 40 files from
   `apps/web/src` and zero from `apps/web/src/lib/components/vendor`. Do not
   trust graph queries for the vendored tree; verify it by reading.
4. **Always run the shadcn CLI from `apps/web/`, never the repo root.** Style is
   resolved from the nearest `components.json`, and there is none at the root.
   Verified:

   ```
   cd apps/web && bunx shadcn@latest view @shadcn/sidebar-03  → registry/base-nova/   (base-ui)
   cd <repo root> && bunx shadcn@latest view @shadcn/sidebar-03 → registry/new-york-v4/ (radix)
   ```

   Getting this wrong silently pulls radix variants and defeats decision 1. Check
   the `registry/<style>/` path prefix in any registry output you rely on; if it
   does not say `base-nova`, you were in the wrong directory.

---

## 1. Ground truth — verified, do not re-derive from READMEs

`apps/web/src/lib/components/vendor/ai-elements/README.md` is **stale and wrong.**
It claims "Reference material, not application code. Nothing here is ever
imported." Both sentences are false. Trusting it already produced one incorrect
analysis in this project. Verify claims against imports, not prose.

**The vendored tree is in the live render path.**

Six ai-elements components are imported by app code:

| Vendored component | Imported by |
| --- | --- |
| `conversation` | `chat/MessageTranscript.tsx` |
| `shimmer` | `chat/MessageTranscript.tsx` |
| `reasoning` | `chat/MessagePart.tsx` |
| `tool` | `chat/MessagePart.tsx` |
| `model-selector` | `chat/ModelRow.tsx`, `chat/ModelPicker.tsx`, `chat/PinnedSection.tsx` |
| `prompt-input` | `chat/Composer.tsx` |

And `vendor/ai-elements/ui/` is imported **directly by app code** via a path alias:

| Primitive | Imported by |
| --- | --- |
| `button` | `chat/ErrorNotice.tsx` |
| `dialog`, `command` | `chat/ModelPicker.tsx` |
| `dropdown-menu` | `chat/FilterSelect.tsx` |

The alias `@/registry/default/ui/*` and `@/registry/new-york-v4/ui/*` is declared
in **both** `apps/web/tsconfig.json` (`compilerOptions.paths`) and
`apps/web/vite.config.ts` (`resolve.alias`). `@/lib/utils` maps to
`src/lib/utils/cn.ts`. All of these must be removed together at the end.

**The vendored tree is invisible to every quality gate:**

- `apps/web/tsconfig.json` has `"exclude": ["src/lib/components/vendor"]` — `bun
  run check` does not typecheck it.
- It is excluded from `eslint.config.js` and `.prettierignore`.
- It is absent from the codebase-memory graph.

**This is the central execution risk.** Swapping a `ui/*` primitive from radix to
base-ui breaks every vendored consumer *silently* — no typecheck error, no lint
error, no graph edge to trace. Graduating a file out of `vendor/` is what makes it
visible again. Treat that as the safety mechanism, not as cosmetics.

**`app.css` is currently broken.** `shadcn init` overwrote `:root` with *light*
mist values (`--background: oklch(1 0 0)`) while
`shell/RootDocument.tsx:15` still hardcodes `className="dark"` and
`@custom-variant dark` keys off that class. `@import "tw-animate-css"` is now
duplicated. The dark slate palette the user wants back is in git:
`git show HEAD:apps/web/src/styles/app.css`, with
`--background: oklch(0.129 0.042 264.695)`.

**Scale:** `chat/` + `shell/` is 19 files / ~1,295 lines of hand-rolled UI.
`vendor/` is ~15,871 lines, of which only a fraction is reachable.

---

## 2. Decisions already made — do not reopen

1. **Zero radix.** Replace `ui/*` with shadcn `base-nova` (base-ui) versions.
   Write a local replacement for `@radix-ui/react-use-controllable-state` (the
   only radix import in the ai-elements files themselves). Uninstall the
   `radix-ui` package. Where base-ui's prop API differs from radix's, fix the
   consuming component at adoption time.
2. **Theme: base-nova palette, dark-only, existing fonts.** Adopt the base-nova /
   `dashboard-01` colour tokens wholesale — including chart, sidebar, and the
   better form-control colours. Stay dark-only (no light mode, no toggle). Drop
   the theme's font imports; keep IBM Plex Sans + JetBrains Mono. Keep the custom
   `--faint` token.
3. **Placement: `apps/web/src/lib/components/ui/`,** kebab-case filenames,
   upstream code style verbatim so `shadcn add` and `--diff` keep working. Fix
   the `components.json` aliases, which currently point at `~/components/ui`
   while everything actually lives under `~/lib/components/`. Exempt that one
   directory from the house PascalCase/named-export rules and from the
   `apps/web/src/lib` 85%/80% coverage floor — otherwise CI fails the moment the
   first component lands.
4. **`vendor/` is dissolved, not preserved.** End state: every live component
   lives in `lib/components/ui/` (shadcn primitives) or
   `lib/components/ai-elements/` (ai-elements), fully typechecked and linted; the
   `vendor/` tree, both path aliases, and the tsconfig exclude are all deleted.
   Unused ai-elements remain available through the registry, not as dead code
   in-tree.

---

## 3. Deliverables

### A. Verified live-dependency map

Compute the transitive closure from the entry points in §1 by reading imports —
not from the README's dependency tables, which are also unverified. Produce:

- which ai-elements files are reachable from app code
- which `ui/*` primitives are reachable, and which of those are radix-based
- which vendored files are unreachable (dead) and can simply be deleted
- for each reachable `ui/*` primitive, the base-nova equivalent and any prop-API
  drift that will need fixing at the call site

### B. Inventory sweep — both directions, both required

**Direction 1 — top-down: what do we have that shadcn should replace?**
For every component in `chat/` and `shell/` (19 files), and every reachable
vendored component, give a row: current file, line count, proposed shadcn or
ai-elements replacement, confidence, and what would be lost. Known candidates the
user has already flagged — treat as starting points, not the whole list:

- `shell/AppSidebar.tsx` → the `@shadcn/sidebar` ui primitive. The reference the
  user likes is `@shadcn/dashboard-01`, which does **not** use any numbered
  sidebar block — it composes the primitive directly: `SidebarProvider` with
  `--sidebar-width` / `--header-height` overrides, `<AppSidebar variant="inset" />`,
  `SidebarInset`, and a `SiteHeader`. Harvest that composition; see §3.B.1 for
  what not to drag in. `@shadcn/sidebar-03` ("A sidebar with submenus") is the
  agreed fallback if the inset composition doesn't fit.
- `chat/ModelFilters.tsx` + `chat/FilterSelect.tsx` → `combobox`
- `chat/ModelPicker.tsx` → `command` / `combobox`

**On `@shadcn/dashboard-01`:** it is a resolvable registry id — view it, don't
guess at it. Do **not** `add` it wholesale: it pulls `@dnd-kit/core`,
`@dnd-kit/modifiers`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
`@tanstack/react-table` and `zod` as npm dependencies, plus 19 registry
dependencies including `chart`, `table`, `drawer`, `sonner`, `toggle-group` and
`checkbox` — nearly all irrelevant to a chat app. Read it for its sidebar
composition and its colour tokens, and take only those.

**Direction 2 — bottom-up: what does shadcn have that we should be using?**
This is the sweep that matters most and the one most likely to be skipped. Do
not work from memory or from what seems relevant.

- Enumerate the **entire** registry programmatically (`list_items_in_registries`,
  or `bunx shadcn@latest search`). Do the same for all 48 ai-elements.
- For **every single item**, record a verdict: *adopt now* / *adopt later* /
  *not applicable*, each with a one-line reason.
- Explicitly consider the non-obvious ones. The user called out `scroll-area` as
  the kind of thing that gets missed; also reach a verdict on at minimum
  `empty`, `kbd`, `skeleton`, `sonner`, `field`, `item`, `input-group`,
  `resizable`, `hover-card`, `tooltip`, `separator`, `spinner`, `toggle-group`,
  `breadcrumb`, `alert`, `progress`, and the `blocks`.
- Where a registry item would replace something we hand-rolled *or* something we
  currently do without, say so — the goal is to bend our use cases toward
  shadcn's capabilities, not to map shadcn onto what we already built.

An item you have not enumerated does not get an implicit "not applicable". A
missing verdict is an incomplete deliverable.

### C. Theme plan

Exact token-by-token diff to bring `app.css` from its current broken state to
decision 2: which values come from base-nova, the duplicate import removal, the
`--faint` token, and what happens to the `.dark` class and `@custom-variant`
given the dark-only choice.

### D. Beads epic — exactly one

**Create one and only one bead of `--type epic`** covering the whole shadcn
adoption. Every other bead is a task/feature child of it. Do **not** create an
epic per concern — no separate "theme epic", "sidebar epic", "vendor dissolution
epic". If a concern feels big enough to be its own epic, it is a child with its
own children, not a second epic.

Structure:

- `bd create --type epic` once. Record the returned id; call it `<EPIC>`.
- Every subsequent bead: `bd create --parent <EPIC>` (nest deeper with
  `--parent <child-id>` where a surface needs sub-tasks).
- Wire the real ordering as explicit dependency edges, not prose:
  `bd dep <blocker-id> --blocks <blocked-id>`. Ordering that exists only in a
  description is not a dependency.
- Verify before finishing: `bd dep cycles` reports none, `bd dep tree <EPIC>`
  shows a single connected DAG rooted at the epic with no orphans, and
  `bd ready` surfaces only the genuinely startable beads.

Content rules:

- Each child is independently shippable and finishes green on
  `bun run verify:fast`.
- The `ui/*` primitive swap and the graduation of that primitive's consumers out
  of `vendor/` belong to the **same** bead — never split across two, or the
  breakage is silent between them.
- The pre-flight fixes (§0) are children too, and they block everything else.
- The final cleanup bead — delete `vendor/`, both path aliases, the tsconfig
  exclude, and the `radix-ui` dependency — is blocked by every bead that
  graduates a file out of `vendor/`.

### E. Proposed `ui.instructions.md`

A new file under `.github/instructions/`, written as a proposal for review (per
the `capture-convention` skill — do not apply it silently). It must cover: the
`lib/components/ui/` carve-out from house style, the coverage-floor exemption,
the base-ui-only rule, how to add a component, and how to re-sync one with
upstream.

---

## 4. Rules

- Use serena for symbol work, codebase-memory for structure, claude-context for
  vague questions. Fall back to reading files only when those genuinely can't
  answer — but **do** read files for anything under `vendor/`, which the graph
  cannot see.
- Never state a fact about a dependency from memory. Read the installed source
  or fetch current docs. This applies especially to shadcn, base-ui, and
  ai-elements APIs.
- Prove claims. If you assert a component is unused, show the search that
  establishes it — `bun run check` is the arbiter before any delete or rename.
- Ask before guessing on anything user-visible.

## 5. Done when

Deliverables A–E exist and are reviewed, no file under `apps/web/src` has been
modified, and the pre-flight fixes from §0 are committed separately with their
own conventional-commit message.
