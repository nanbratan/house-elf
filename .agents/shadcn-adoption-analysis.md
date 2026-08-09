# shadcn adoption — Phase 1 analysis

Produced by the kickoff in `.agents/shadcn-adoption-kickoff.md`. Analysis only: no
file under `apps/web/src` was modified.

Every claim below was verified by running something. Where this document contradicts
the kickoff, the correction is called out explicitly and the evidence given.

---

## 0. Pre-flight results

| Gate | Result |
| --- | --- |
| serena symbol tools | **Working.** `get_symbols_overview` on `chat/FilterSelect.tsx` returned `{"Interface":["FilterOption","FilterSelectProps"],"Function":["FilterSelect"]}`. The kickoff's `Active languages: ['svelte']` diagnosis was stale; no restart was needed this session. |
| shadcn MCP connected | **Reachable, but was serving the wrong style.** See correction below. `.mcp.json` fixed. |
| codebase-memory vendor gap | **Confirmed.** All vendor findings below come from reading files, not the graph. |
| shadcn CLI cwd trap | **Confirmed exactly as written.** |

### Correction 1 — the MCP server was serving radix, not base-ui

The kickoff warns that the *CLI* resolves style from the nearest `components.json`.
The same is true of the *MCP server*, which Claude Code launches from the repo root —
where there is no `components.json`. Verified:

```
mcp__shadcn__view_items_in_registries(["@shadcn/button"])  →  Dependencies: radix-ui
```

That is decision 1 defeated silently, through the tool the kickoff tells you to
prefer. Verified the split directly:

```
(cd apps/web && bunx shadcn@latest view @shadcn/sidebar-03) → registry/base-nova/
(cd <repo root> && bunx shadcn@latest view @shadcn/sidebar-03) → registry/new-york-v4/
```

`.mcp.json` now pins it (this is the §0 exception, the only change made):

```json
{ "mcpServers": { "shadcn": { "command": "bunx",
  "args": ["shadcn@latest", "mcp", "--cwd", "apps/web"] } } }
```

`--cwd` is a real flag (`bunx shadcn@latest mcp --help`), and it works:
`bunx shadcn@latest view @shadcn/button --cwd apps/web` returns `registry/base-nova/`
from the repo root. **The running MCP server in this session still has the old
config**, so every registry fact in this document was taken from the CLI run inside
`apps/web`. Restart the server before trusting its output.

### Correction 2 — `app.css` is not rendering light

The kickoff says `shadcn init` overwrote `:root` with light values while
`RootDocument` hardcodes `className="dark"`, implying the app currently renders
light. It does not. `init` also **appended a `.dark` block** at the end of the file
(lines 292–324) holding dark values. `:root` and `.dark` have equal specificity
(0,1,0), `.dark` is defined later, and `<html>` carries the class — so `.dark` wins
and the app renders dark.

The real defect is subtler and worth stating precisely: **the palette silently
changed identity.** `HEAD` had a blue-tinted slate (`--background: oklch(0.129 0.042
264.695)`); the effective palette is now mist (`oklch(0.148 0.004 228.8)`), *plus*
six hand-diverged tokens that match neither. The light `:root` values are dead code
that will bite the moment anything renders outside `.dark`.

---

## A. Verified live-dependency map

Computed by transitive closure over parsed import specifiers from every app file
outside `vendor/`, resolving the two path aliases exactly as `tsconfig.json` and
`vite.config.ts` declare them. Script: `closure.mjs` (job scratch).

Alias declarations confirmed verbatim in both files, plus
`"exclude": ["src/lib/components/vendor"]` in `tsconfig.json`.

### Reachable ai-elements — 7 (kickoff said 6)

| File | Entered from |
| --- | --- |
| `conversation.tsx` | `chat/MessageTranscript.tsx` |
| `shimmer.tsx` | `chat/MessageTranscript.tsx` |
| `reasoning.tsx` | `chat/MessagePart.tsx` |
| `tool.tsx` | `chat/MessagePart.tsx` |
| `model-selector.tsx` | `chat/ModelRow.tsx`, `ModelPicker.tsx`, `PinnedSection.tsx` |
| `prompt-input.tsx` | `chat/Composer.tsx` |
| **`code-block.tsx`** | **transitively, via `tool.tsx`** — not in the kickoff's table |

### Reachable `ui/*` primitives — 13 (kickoff named 4)

Four are imported directly by app code; nine more arrive transitively through the
ai-elements above. Radix column is what makes each one a decision-1 target.

| Primitive | radix-based | Reached via |
| --- | --- | --- |
| `button` | **yes** | app (`ErrorNotice`), `conversation`, `code-block` |
| `dropdown-menu` | **yes** | app (`FilterSelect`), `prompt-input` |
| `dialog` | **yes** | app (`ModelPicker`), `model-selector`, `command` |
| `command` | no (cmdk) | app (`ModelPicker`), `model-selector`, `prompt-input` |
| `collapsible` | **yes** | `reasoning`, `tool` |
| `badge` | **yes** | `tool` |
| `select` | **yes** | `prompt-input`, `code-block` |
| `tooltip` | **yes** | `prompt-input` |
| `hover-card` | **yes** | `prompt-input` |
| `input-group` | no (cva) | `prompt-input` |
| `input` | no | `input-group` |
| `textarea` | no | `input-group` |
| `spinner` | no (lucide) | `prompt-input` |

**8 of 13 are radix-based.** `radix-ui` is also imported by 9 *dead* `ui/*` files
(accordion, avatar, button-group, popover, progress, scroll-area, separator, switch,
tabs) — deleting those is most of the uninstall.

### Dead vendored files — 53 of 73

38 ai-elements + 15 `ui/*` primitives are unreachable from app code and can be
deleted outright. Full list in the closure output; the `ui/*` half is accordion,
alert, avatar, button-group, card, carousel, popover, progress, scroll-area,
separator, switch, tabs.

### `@radix-ui/react-use-controllable-state` — a phantom dependency

Six vendored files import it; **only `reasoning.tsx` is reachable**, so the local
replacement decision 1 calls for has exactly one consumer and two call sites:

```ts
useControllableState<boolean>({ defaultProp, onChange, prop })   // → [value, setValue]
useControllableState<number | undefined>({ defaultProp, prop })
```

It is **not declared in `apps/web/package.json`** — it resolves only because
`radix-ui` hoists it into `node_modules`. Uninstalling `radix-ui` breaks it without
any package.json line changing.

### Prop-API drift — the actual migration cost

Export surfaces are **identical** for all 13 primitives (verified by parsing
`export {}` from both sides — zero symbols added or removed either way). All drift is
in props. `asChild` does not exist anywhere in base-nova; base-ui uses `render`.

| # | Where | Drift | Fix |
| --- | --- | --- | --- |
| 1 | `chat/FilterSelect.tsx` | `DropdownMenuCheckboxItem` `onSelect={e => e.preventDefault()}` keeps the menu open. base-ui `MenuCheckboxItem` **has no `onSelect`** — it has `closeOnClick?: boolean`. | `closeOnClick={false}`. **App-code change** — but moot if `FilterSelect` moves to `combobox` first, which is the better order. |
| 2 | `prompt-input.tsx:1325` | `<HoverCard closeDelay openDelay>`. base-ui `PreviewCard.Root` has neither — `delay`/`closeDelay` live on **`Trigger`** (`PreviewCardTrigger.d.ts:33`, default 600/300). | Move both to `HoverCardTrigger`, rename `openDelay`→`delay`. |
| 3 | `prompt-input.tsx:1158,1181` | `<TooltipTrigger asChild>`, `<DropdownMenuTrigger asChild>`. | `render={…}`. |
| 4 | `ui/button.tsx`, `ui/badge.tsx` | Vendored versions expose an `asChild` prop; base-nova versions do not. | No consumer passes it (grepped app + all reachable vendor) — drop it. |
| 5 | `TooltipProvider` | radix `delayDuration` → base-nova `delay`. | No current consumer; applies when `prompt-input` graduates. |

Verified against installed `@base-ui/react@^1.7.0` source, not from memory.
`DialogContent`'s `showCloseButton` **survives** — base-nova's dialog has it, so
`ModelPicker`'s `showCloseButton={false}` is safe.

---

## B. Inventory sweep

### Direction 1 — top-down: our 19 components

| File | Lines | Replacement | Confidence | What would be lost |
| --- | --- | --- | --- | --- |
| `shell/AppSidebar.tsx` | 63 | `@shadcn/sidebar` (`Sidebar*` + `useSidebar`) | high | Hand `inert` + width-transition logic — the primitive does this properly, including mobile. |
| `shell/AppShell.tsx` | 48 | `SidebarProvider` + `SidebarInset` + `SidebarTrigger` | high | Hand-drawn toggle SVG and `useState`; `SidebarTrigger` ships the a11y wiring. |
| `shell/RootDocument.tsx` | 25 | none — keep | high | — (see theme plan for the `dark` class) |
| `chat/ThinkingRow.tsx` | 42 | `@shadcn/switch` + `@shadcn/field` | high | Hand `role="switch"` + translate-x animation, ~20 lines. |
| `chat/ErrorNotice.tsx` | 18 | `@shadcn/alert` (+ existing `Button`) | high | Nothing; `role="alert"` is built in. |
| `chat/FilterSelect.tsx` | 75 | `@shadcn/combobox` with `multiple` + `ComboboxChips` | high | The `onSelect`/`preventDefault` workaround goes away entirely — the combobox stays open by design. Count-badge trigger needs rebuilding as chips. |
| `chat/ModelFilters.tsx` | 148 | `@shadcn/combobox` (×3) + `@shadcn/toggle` for "Free" | medium | Hand `aria-pressed` pill. The "whole catalog, not the narrowed list" invariant must survive. |
| `chat/ModelPicker.tsx` | 191 | keep `Command`; adopt `@shadcn/kbd`, `@shadcn/empty` | medium | Deliberate `ModelSelectorContent` bypass (documented in-file) must survive. |
| `chat/ModelPickerHeader.tsx` | 61 | `CommandInput` or `@shadcn/input-group` | medium | Hand search SVG; live-count `aria-live` must be preserved. |
| `chat/ModelDetails.tsx` | 48 | `@shadcn/item` for the `dl` | low | Layout is a 2-col grid; `Item` may not improve it. |
| `chat/ModelRow.tsx` | 93 | `@shadcn/item` + `@shadcn/toggle` for the star | low | `stopRowSelect` cmdk-bubbling workaround is load-bearing. |
| `chat/PinnedSection.tsx` | 82 | `@shadcn/collapsible` for the fold | medium | cmdk `aria-hidden` heading workaround is load-bearing — keep the comment. |
| `chat/MessageTranscript.tsx` | 84 | keep; `@shadcn/empty` for the empty state | high | — |
| `chat/Message.tsx` | 26 | ai-elements `message` | low | `data-role` is asserted by `tests/e2e/chat-stream.spec.ts`. |
| `chat/MessageContent.tsx` | 25 | ai-elements `message` | low | Careful `is-user`/`is-assistant` group styling. |
| `chat/MessagePart.tsx` | 56 | keep | high | — |
| `chat/MessageResponse.tsx` | 35 | keep | high | Hand `memo` with a written justification — do not touch. |
| `chat/ChatView.tsx` | 74 | keep | high | — |
| `chat/Composer.tsx` | 101 | keep (`prompt-input` graduates) | high | Documented `requestSubmit` guard is load-bearing. |

Reachable vendored components: all 7 **graduate** to
`lib/components/ai-elements/` unchanged except the drift fixes; all 13 `ui/*`
**are replaced** by base-nova into `lib/components/ui/`.

### Direction 2 — bottom-up: the whole registry

Enumerated programmatically, 471 items, fully accounted for:
61 `ui` + 97 `block` + 252 `example` + 52 `font` + 5 `theme` + 2 `style` + 1 `lib` +
1 `hook` = **471**.

**Class verdicts** (each item in the class, by construction):

- **252 `registry:example`** — *not applicable*. Per-component demo files
  (`button-demo`, `input-group-icon`…); they are documentation samples, not
  adoptable units. Verdict follows the parent `ui` item in the table below.
- **52 `registry:font`** — *not applicable*. Decision 2 keeps IBM Plex Sans +
  JetBrains Mono.
- **5 `registry:theme` + 2 `registry:style`** — *not applicable*. Would overwrite
  the base-nova/mist palette decision 2 fixes.
- **66 `chart-*` blocks** — *not applicable*. Chart demos; no charts in a chat app.
- **16 `sidebar-*` blocks** — *adopt later (reference only)*. `sidebar-03` is the
  agreed fallback if the inset composition does not fit.
- **10 `login-*`/`signup-*` blocks** — *not applicable*. Single-user; no auth UI.
- **`dashboard-01`** — *adopt now, as reference only*. Harvest the `SidebarProvider`
  + `--sidebar-width`/`--header-height` + `SidebarInset` + `SiteHeader` composition
  and the colour tokens. **Do not `add`** — it pulls 4 `@dnd-kit/*`,
  `@tanstack/react-table`, `zod` and 19 registry deps.
- **`lib/utils`** — *not applicable*, we have `cn`. See the collision note below.
- **`hook/use-mobile`** — *adopt now*: a required registry dependency of `sidebar`.

**All 61 `registry:ui` items:**

| Item | Verdict | Reason |
| --- | --- | --- |
| button | adopt now | Reachable, radix → base-ui. |
| dialog | adopt now | Reachable, radix → base-ui. |
| dropdown-menu | adopt now | Reachable, radix → base-ui. |
| collapsible | adopt now | Reachable, radix → base-ui. |
| badge | adopt now | Reachable, radix → base-ui. |
| select | adopt now | Reachable, radix → base-ui. |
| tooltip | adopt now | Reachable, radix → base-ui. |
| hover-card | adopt now | Reachable, radix → base-ui. |
| command | adopt now | Reachable; cmdk both sides, low-risk swap. |
| input-group | adopt now | Reachable. |
| input | adopt now | Reachable via input-group. |
| textarea | adopt now | Reachable via input-group. |
| spinner | adopt now | Reachable. |
| sidebar | adopt now | Replaces `AppSidebar` + `AppShell` framing. |
| separator | adopt now | Required registry dep of `sidebar`; also replaces hand `border-t` dividers. |
| sheet | adopt now | Required registry dep of `sidebar` (mobile drawer). |
| skeleton | adopt now | Required registry dep of `sidebar`; also the honest fix for the transcript's loading gap. |
| switch | adopt now | `ThinkingRow` hand-rolls exactly this. |
| alert | adopt now | `ErrorNotice` hand-rolls exactly this. |
| empty | adopt now | `ConversationEmptyState` and the "No models found." branch both want it. |
| kbd | adopt now | Composer has no shortcut hints today; `tooltip` styles `kbd` natively. **A capability we lack, not a replacement.** |
| scroll-area | adopt later | The `scroll-area` the user flagged: `ConversationContent` scrolls natively today and `use-stick-to-bottom` owns that scroller. Adopting it means retargeting stick-to-bottom — real work, real payoff (styled bars), not free. |
| field | adopt later | Pairs with `switch` for `ThinkingRow`'s label+description; only worth it once `switch` lands. |
| item | adopt later | Candidate for `ModelRow`/`ModelDetails`; both have load-bearing workarounds. |
| toggle | adopt later | The pin star and "Free" pill are `aria-pressed` buttons. |
| toggle-group | adopt later | Only if the filter row becomes single-select. |
| sonner | adopt later | No toasts today; the natural home for send/stream failures now shown inline. |
| breadcrumb | not applicable | Two-level route space (`/c/new`, `/c/$id`). |
| progress | not applicable | Streaming is indeterminate; `shimmer` covers it. |
| resizable | not applicable | Fixed sidebar + transcript; no split panes. |
| accordion | not applicable | `collapsible` covers the one-panel case; picker details are a hand accordion tied to cmdk. |
| alert-dialog | not applicable | No destructive confirmations yet. |
| aspect-ratio | not applicable | No media embeds. |
| avatar | not applicable | Single user, no per-message avatars. |
| button-group | not applicable | No grouped actions. |
| calendar | not applicable | No dates. |
| card | not applicable | Transcript is bubbles, not cards. |
| carousel | not applicable | No galleries. |
| chart | not applicable | No analytics surface. |
| checkbox | not applicable | Multi-select lives in `DropdownMenuCheckboxItem`. |
| combobox | adopt now | Multi-select filter row. `multiple` + `ComboboxChips`, verified below. |
| context-menu | not applicable | No right-click affordances. |
| drawer | not applicable | `sheet` covers mobile sidebar. |
| form | not applicable | No react-hook-form; composer is one textarea. |
| input-otp | not applicable | No auth. |
| label | not applicable | Controls use `aria-label`/`aria-labelledby`. |
| menubar | not applicable | No app menu bar. |
| native-select | not applicable | Styled `select` already reachable. |
| navigation-menu | not applicable | Sidebar is the nav. |
| pagination | not applicable | Transcript streams; model list scrolls. |
| popover | not applicable | `dropdown-menu`/`hover-card` cover every case. |
| radio-group | not applicable | No single-choice-from-many. |
| slider | not applicable | No numeric settings (thinking is boolean). |
| table | not applicable | `ModelDetails` is a `dl`, not tabular data. |
| tabs | not applicable | No tabbed surfaces. |
| direction | not applicable | `components.json` sets `"rtl": false`. |
| attachment | not applicable | No file upload yet — revisit if attachments ship. |
| bubble | not applicable | `Message`/`MessageContent` own bubble styling. |
| marker | not applicable | Annotation UI, no use case. |
| message | not applicable | Overlaps ai-elements `message`; pick one, and ours is wired to e2e. |
| message-scroller | not applicable | `use-stick-to-bottom` via `conversation` owns this. |

**`combobox` — the kickoff is right, and `FilterSelect`'s own comment is out of date.**
Verified in the installed `@base-ui/react@1.7.0` source:

```ts
// combobox/root/ComboboxRoot.d.ts:11-17
type ComboboxValueType<Value, Multiple> = Multiple extends true ? Value[] : Value;
multiple?: Multiple | undefined;   // "Whether multiple items can be selected." @default false
```

base-nova's `combobox` also exports `ComboboxChips`, `ComboboxChip` and
`ComboboxChipsInput` — a chips UI built for exactly this. Registry deps: `button`,
`input-group` (both already reachable); npm dep: `@base-ui/react` (already installed).

`FilterSelect.tsx`'s doc comment says a multi-select filter cannot be a listbox. That
comment is about **radix `Select`**, which indeed types `value?: string` — it is not a
statement about shadcn's `combobox`, which did not exist in that form when the comment
was written. Adopting `combobox` with `multiple` collapses `FilterSelect` (75 lines)
and much of `ModelFilters` (148 lines) into a typed multi-select with chips, and
removes the `onSelect`/`preventDefault` workaround entirely rather than porting it to
`closeOnClick={false}`.

`ModelPicker` is a different case and should keep `Command`: it is a full-screen
dialog with pinned sections, per-row detail panels and a thinking switch — a command
palette, not a value picker.

### All 48 ai-elements

**Graduate (7)** — reachable, move to `lib/components/ai-elements/`:
`conversation`, `shimmer`, `reasoning`, `tool`, `model-selector`, `prompt-input`,
`code-block`.

**Adopt later (4)** — plausible for this app, re-add from the registry when wanted:
`sources` (citations), `suggestion` (starter prompts), `task` (multi-step tool
progress), `chain-of-thought` (richer reasoning than `reasoning`).

**Not applicable (37)** — delete now, available from the registry if ever needed.
IDE/agent-workbench surfaces this app has no equivalent of: `agent`, `artifact`,
`canvas`, `checkpoint`, `commit`, `connection`, `controls`, `edge`, `node`, `panel`,
`plan`, `queue`, `sandbox`, `terminal`, `test-results`, `toolbar`, `web-preview`,
`file-tree`, `stack-trace`, `schema-display`, `package-info`,
`environment-variables`, `jsx-preview`, `snippet`, `open-in-chat`, `persona`,
`confirmation`, `context`, `inline-citation`, `image`, `attachments`. Voice/audio,
none of which this app does: `audio-player`, `mic-selector`, `speech-input`,
`transcription`, `voice-selector`. Superseded by ours: `message`.

---

## C. Theme plan

Verified against `git show HEAD:apps/web/src/styles/app.css` and the live
`https://ui.shadcn.com/r/colors/mist.json` (`cssVarsV4.dark`) — `components.json`
declares `"style": "base-nova"`, `"baseColor": "mist"`.

**Structural changes**

1. Delete the duplicate `@import "tw-animate-css"` (line 10; line 9 keeps its
   comment).
2. Collapse `:root` and `.dark` into **one** `:root` block holding the dark values,
   and delete the trailing `.dark` block (lines 289–324, including the
   `/* ---break--- */` marker `init` left). Dark-only means one palette, not two.
3. **Keep** `@custom-variant dark (&:where(.dark, .dark *))` and **keep**
   `className="dark"` on `<html>`. Both are load-bearing: base-nova ships `dark:`
   utilities inside its own class strings (e.g. button's
   `dark:bg-input/30`), and with the palette unconditional they would otherwise be
   inert. The existing comment in `app.css` already explains this — preserve it.
4. Clean up what `init` left in `@layer base`: the commented-out `@apply font-mono`,
   the duplicated `body` rules (`background-color` + `@apply bg-background`), and the
   stray `* { @apply border-border outline-ring/50 }` that restates the `*,::before,
   ::after` reset above it.
5. Decide on `@import "shadcn/tailwind.css"` (line 11, added by `init`). It is not in
   `HEAD`. Verify what it pulls before keeping it — if it only restates the base
   reset already present, drop it.

**Token-by-token**

22 tokens already match mist and need no change: `background`, `foreground`, `card`,
`card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`,
`accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `sidebar`,
`sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground`,
`sidebar-border`, `sidebar-ring`.

11 tokens diverge from mist and are the whole colour decision:

| Token | Now (effective) | → mist (base-nova) |
| --- | --- | --- |
| `--primary` | `oklch(0.45 0.085 224.283)` | `oklch(0.925 0.005 214.3)` |
| `--primary-foreground` | `oklch(0.984 0.019 200.873)` | `oklch(0.218 0.008 223.9)` |
| `--secondary` | `oklch(0.274 0.006 286.033)` | `oklch(0.275 0.011 216.9)` |
| `--secondary-foreground` | `oklch(0.985 0 0)` | `oklch(0.987 0.002 197.1)` |
| `--sidebar-primary` | `oklch(0.715 0.143 215.221)` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.302 0.056 229.695)` | `oklch(0.987 0.002 197.1)` |
| `--chart-1` | `oklch(0.809 0.105 251.813)` | `oklch(0.872 0.007 219.6)` |
| `--chart-2` | `oklch(0.623 0.214 259.815)` | `oklch(0.56 0.021 213.5)` |
| `--chart-3` | `oklch(0.546 0.245 262.881)` | `oklch(0.45 0.017 213.2)` |
| `--chart-4` | `oklch(0.488 0.243 264.376)` | `oklch(0.378 0.015 216)` |
| `--chart-5` | `oklch(0.424 0.199 265.638)` | `oklch(0.275 0.011 216.9)` |

⚠️ **`--primary` is the one to look at before agreeing.** Mist's dark `--primary` is
near-white (L 0.925) with near-white-on-dark `--primary-foreground`. Today's is a
mid-dark teal. `--primary` currently paints the `ThinkingRow` switch, the
`FilterSelect` count pill, and the active sidebar link. Adopting mist wholesale — as
decision 2 says — flips those to a light-on-dark treatment. That is a visible change,
so per rule 4 it needs your explicit yes before the theme bead is worked.

2 tokens are ours and survive untouched: `--radius: 0.625rem`, `--faint:
oklch(0.551 0.027 264.364)`.

**Fonts:** `@fontsource-variable/*` imports and the `--font-mono`/`--font-heading`
mappings stay as-is per decision 2. Drop the commented-out duplicate at lines
113–114.

---

## D. Beads

One epic, all work nested under it, ordering as explicit `bd dep` edges. See
`bd dep tree <EPIC>`.

## E. Proposed convention

`.github/instructions/ui.instructions.md.proposed` — a proposal, not applied.

---

## Incidental findings (not acted on)

1. **`apps/web/src/lib/utils.ts` collides with `apps/web/src/lib/utils/`.** `init`
   created a second `cn` (double-quoted, no semicolons, no JSDoc) next to the
   existing `lib/utils/cn.ts`. The tsconfig alias points at `lib/utils/cn.ts`, so the
   new file is currently unreferenced — but `~/lib/utils` now resolves to the file,
   not the directory. Delete it as part of the alias cleanup.
2. **`components.json` aliases point at `~/components/ui`**, but components live
   under `~/lib/components/`. Fixing this is a prerequisite for `shadcn add` landing
   files in the right place (decision 3).
3. **`chat/MessagePart.tsx` uses `&&` in JSX** (`part.input !== undefined && …`),
   which `react.instructions.md` bans. Pre-existing, unrelated to this work.
