# React migration inventory — apps/web

Deliverable of **house-elf-shi.1**. Answers the React question on its own terms: what
the React version of this app is built from, file by file, with the evidence behind
every adoption. The final stack choice (React vs Solid) is made at **house-elf-shi.2**
from this and its [Solid counterpart](./solid-migration-inventory.md).

Investigated 2026-08-08. Registry figures are from `registry.npmjs.org` `time` fields
and `api.npmjs.org` last-week downloads, read directly; repo figures from the GitHub
API. Nothing here is quoted from a search-result summary.

**No application code was written for this issue.** Nothing was spiked inside the repo.

---

## 1. Recommendation in one page

| Decision                | Verdict                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| Meta-framework          | **React Router 8 (framework mode)**. Runner-up TanStack Start.       |
| Chat client             | **`@ai-sdk/react`** — first-party, pins the same `ai` the app runs.  |
| Headless primitives     | **`radix-ui`** for Dialog + DropdownMenu. **No** command library.    |
| Markdown + highlighting | **Keep `marked` + `remend` + `shiki`.** Port `markdown.ts` verbatim. |
| Message rendering       | Keep our `Markdown`. Adopt `ai-elements` shells around it.           |
| Scroll anchoring        | **Port by hand.** Reject `use-stick-to-bottom`.                      |
| Component library       | **Adopt `ai-elements`** — 48 vendored Apache-2.0 `.tsx` files.       |
| Theme tokens            | **Rename ~28 refs** so `@theme` supersets shadcn's vocabulary.       |
| Testing                 | `@testing-library/react` — the stub architecture gets _smaller_.     |

The short argument, in three parts.

**React buys a large, usable component library.** `ai-elements` is not a dependency; it
is 48 Apache-2.0 `.tsx` files copied into the repo. It covers the Composer with
attachments (~1,400 LOC), HITL approval, RAG citations and multi-agent UI — that is most
of the **M4 and M5** surface, and all of it is Svelte-unavailable today. This is the
strongest argument in the report and §7 makes the case in full.

**It also buys Radix and a component model the agent tooling can read** — in place of
bits-ui, and the stated point of the epic.

**It does not buy a replacement for the three things this app argued out on purpose**:
`markdown.ts`'s escape-at-the-parser security posture, `StickToBottom`'s pinning rules,
and `ModelPicker`'s pinning/grouping/ranked search. Keep those; adopt around them.

---

## 2. Meta-framework: React Router 8, with TanStack Start as runner-up

Both are credible, both are current, both support Vite 8, and neither is a bad answer.
React Router 8 wins on one specific ground: **it preserves this app's server/client
boundary without introducing a new concept.**

### The deciding difference

`apps/web` has exactly two server-side things, and both exist to keep `MASTRA_URL` and
the Mastra origin off the public internet:

- `routes/c/new/+page.server.ts` — a server-only loader that fetches the model catalog.
- `routes/api/chat/[agentId]/+server.ts` — a dumb SSE proxy returning a raw `Response`.

| Need                        | SvelteKit today   | React Router 8                                                                 | TanStack Start                                                                  |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Server-only data load       | `+page.server.ts` | `export async function loader()` — server-only                                 | `loader` runs **isomorphically**; server-only needs `createServerFn`            |
| Raw streaming HTTP endpoint | `+server.ts`      | Resource route: a module exporting only `loader`/`action` returning `Response` | `createFileRoute(...)({ server: { handlers: { POST } } })` returning `Response` |

Verified from the React Router repo's own docs source
(`docs/start/framework/route-module.md`): _"Route loaders provide data to route
components before they are rendered. They are only called on the server when server
rendering or during the build with pre-rendering."_ That is a one-for-one replacement
for `+page.server.ts`, with the same compile-time guarantee that the private env var
cannot reach the browser.

TanStack Start's `loader` is isomorphic by design — verified from its Server Functions
guide, which is explicit that server-only logic (_"database access, environment
variables, file system"_) belongs in `createServerFn`. That is a perfectly sound model,
and its build "replaces server function implementations with RPC stubs in client
bundles". But it is **one more boundary concept than this app currently has**, applied
to a codebase whose only reason for having a server at all is to hide one URL. For a
two-endpoint app, the framework that keeps the SvelteKit mental model intact is worth
more than typed routing.

TanStack Start server routes are otherwise an excellent match — they return a raw
`Response` and support `$agentId` params, so the SSE proxy ports cleanly to either.

### Why TanStack Start lost, stated fairly

It lost on one axis only, and it wins on others the user genuinely values:

- **Typed routing is better.** Route params and search params are typed end to end;
  React Router's typegen (`./+types/route-name`) is good but a build step.
- **The team ships constantly** — `@tanstack/react-start` 1.168.40 published
  2026-08-07, the router repo pushed the day of this investigation.
- The high patch number (1.168.x) reflects a fast release train, not instability, but
  it does mean more frequent upgrades to track.

If the user prefers typed routing over boundary familiarity, **switching this
recommendation to TanStack Start does not invalidate anything else in this document.**
Every other decision below is framework-agnostic within React.

### Ruled out, not revisited

**Next.js App Router** — already ruled out by the epic as an RSC paradigm mismatch.
Not re-examined.

### Evidence

| Package                  | Latest   | Published  | npm maint. | Weekly DL   | Owner                      | Stars  | Last push  |
| ------------------------ | -------- | ---------- | ---------- | ----------- | -------------------------- | ------ | ---------- |
| `react-router`           | 8.3.0    | 2026-07-22 | 2          | 50,916,045  | `remix-run` (org, Shopify) | 56,544 | 2026-08-07 |
| `@react-router/dev`      | 8.3.0    | 2026-07-22 | 1¹         | 1,934,305   | `remix-run` (org)          | —      | 2026-08-07 |
| `@react-router/node`     | 8.3.0    | 2026-07-22 | 1¹         | 2,090,960   | `remix-run` (org)          | —      | 2026-08-07 |
| `@tanstack/react-start`  | 1.168.40 | 2026-08-07 | 3          | 16,969,726  | `TanStack` (org)           | 14,904 | 2026-08-08 |
| `@tanstack/react-router` | 1.170.23 | 2026-08-07 | 3          | 21,676,041  | `TanStack` (org)           | 14,904 | 2026-08-08 |
| `react`                  | 19.2.8   | 2026-07-21 | 2          | 161,114,406 | `facebook`/`react` (org)   | —      | —          |
| `vite`                   | 8.2.1    | 2026-08-06 | 2          | 162,121,947 | `vitejs` (org)             | —      | 2026-08-06 |
| `@vitejs/plugin-react`   | 6.0.5    | 2026-07-30 | 2          | 78,591,337  | `vitejs` (org)             | —      | 2026-07-30 |

¹ Single listed npm maintainer on the `@react-router/*` sub-packages is a CI publishing
artefact — the GitHub owner is the multi-person `remix-run` org. Not a bar failure.

**Compatibility, verified from the published manifests:**

- `@react-router/dev@8.3.0` peers: `vite: "^7.0.0 || ^8.0.0"`, `typescript: "^5.1.0 || ^6.0.0 || ^7.0.0"`, `engines.node: ">=22.22.0"`.
- `@tanstack/react-start@1.168.40` peers: `vite: ">=7.0.0"`, `engines.node: ">=22.12.0"`.
- `@tailwindcss/vite@4.3.3` peers `vite: "^5.2.0 || ^6 || ^7 || ^8"`.

The repo is on Vite 8.0.16 and TypeScript 6.0.3. **Both frameworks accept both.** No
blocker either way. `@vitejs/plugin-react@6` requires Vite `^8`, which the repo already
satisfies; prefer it over `@vitejs/plugin-react-swc` unless compile speed becomes a
problem, because it is the variant that supports the React Compiler.

**Could not establish — flag for chunk 1.** CI installs **only Bun** (no
`actions/setup-node`), and `bun run dev` / `bun run build` are how both apps run. Neither
meta-framework's dev server and build were verified under Bun, because this issue
forbids spiking in the repo and a spike outside it would not reproduce the workspace.
Whichever framework is chosen, **the first migration chunk must be "hello world renders
and builds under Bun in this workspace"**, before any component is ported. React Router
8 being ESM-only and requiring Node ≥22.22.0 makes this a real question, not a
formality.

---

## 3. Per-file mapping — `apps/web/src`

Verdicts: **adopt X** · **port by hand** · **drop**.

### Routes and app shell

| File                                   | LOC | Verdict                                                                                                                                                                                        |
| -------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.html`                             | 12  | **drop** → React Router `app/root.tsx` owns the document. `data-sveltekit-preload-data` has no analogue and is not needed.                                                                     |
| `app.d.ts`                             | 13  | **drop** → all-commented SvelteKit `App` namespace stubs. Nothing to carry.                                                                                                                    |
| `lib/index.ts`                         | 1   | **drop** → empty `$lib` barrel comment. Already coverage-excluded.                                                                                                                             |
| `lib/assets/favicon.svg`               | 0   | **port by hand** → move to `public/`; it is a static asset.                                                                                                                                    |
| `routes/+layout.svelte`                | 99  | **port by hand** → `app/root.tsx`. Sidebar, `inert` collapse, `aria-current`. `$app/state`'s `page.url` → `useLocation()`; `resolve('/c/[id]', {id})` → `href` built from typed route helpers. |
| `routes/+page.svelte`                  | 6   | **port by hand** → trivial placeholder. Replaced wholesale in M2 anyway.                                                                                                                       |
| `routes/c/[id]/+page.svelte`           | 8   | **port by hand** → placeholder; `page.params.id` → route `params`.                                                                                                                             |
| `routes/c/new/+page.svelte`            | 10  | **port by hand** → renders `<ChatView>` from loader data.                                                                                                                                      |
| `routes/c/new/+page.server.ts`         | 10  | **adopt React Router `loader`** → server-only by construction. Keeps `modelCatalogSchema.parse` exactly as-is.                                                                                 |
| `routes/api/chat/[agentId]/+server.ts` | 36  | **port by hand → resource route.** See below — this one has hard requirements.                                                                                                                 |
| `routes/layout.css`                    | 172 | **port unchanged.** Tailwind v4 `@theme` tokens and the `.markdown` block are framework-agnostic. Do not redesign.                                                                             |
| `lib/server/mastra.ts`                 | 11  | **port by hand** → `env.MASTRA_URL` becomes `process.env.MASTRA_URL`; SvelteKit's `error(500, …)` becomes a thrown `Response`. Must stay in a server-only module.                              |

**The SSE proxy is the one route with non-negotiable behaviour.** Its comments say it
exists for two reasons only — keeping Mastra off the public internet, and being where
auth lands in M6 — and that it must never grow business logic. Three properties must
survive the port and should each get a test:

1. `upstream.body` is passed through **unread**. Buffering the response breaks streaming.
2. `request.signal` is **forwarded**, so a client hang-up aborts generation upstream.
3. The status is **not** inspected. Mastra reports failures as `error` parts inside a
   200 stream; a status check would be both useless and misleading.

Verified from the TanStack Start and React Router docs that both return a raw
`Response` from a handler, so all three port cleanly to either framework.

### Chat components — `lib/components/chat/`

| Component              | LOC | Verdict                                                                                                                                                                                                                                                                     |
| ---------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatView.svelte`      | 102 | **adopt `@ai-sdk/react`'s `useChat`** + port the frame. `new Chat({transport})` in a `$derived` → `useChat({ transport })`; the "new agent ⇒ new Chat ⇒ discarded transcript" behaviour becomes a `key={agentId}` on the component, which says the same thing more plainly. |
| `Composer.svelte`      | 144 | **adopt `prompt-input.tsx`**, re-apply 3 decisions. See below.                                                                                                                                                                                                              |
| `MessagePart.svelte`   | 33  | **port by hand** → an `if/else` chain over `isTextUIPart`/`isReasoningUIPart`/`isToolUIPart`, all of which are exported by `ai` itself and are framework-agnostic. The "unrecognised part renders nothing" rule must survive.                                               |
| `Markdown.svelte`      | 19  | **port by hand** → `useMemo(() => renderMarkdown(text), [text])` + `dangerouslySetInnerHTML`. Stays synchronous.                                                                                                                                                            |
| `ToolCard.svelte`      | 124 | **port by hand.** The exhaustive `Record<ToolState, string>` is the point — keep it, so a state the SDK adds is a compile error rather than a mislabelled card. The `{#snippet section()}` becomes a local component or a function returning JSX.                           |
| `ReasoningPart.svelte` | 92  | **port by hand.** The phase machine (`absent → thinking → lingering → read`) and the 1s linger port directly; the `$effect` becomes `useEffect` on `[streaming]` with the same cleanup.                                                                                     |
| `WorkingDots.svelte`   | 40  | **port by hand.** Svelte `<style>` is scoped; React has no equivalent, so the `chase` keyframes and the `prefers-reduced-motion` rule move into `layout.css` under a `.working-dots` class. Small but do not miss the reduced-motion branch.                                |
| `ErrorNotice.svelte`   | 30  | **port by hand.** Trivial; `role="alert"` and the wording are the substance.                                                                                                                                                                                                |
| `StickToBottom.svelte` | 55  | **port by hand.** See §5.                                                                                                                                                                                                                                                   |
| `ModelPicker.svelte`   | 257 | **`radix-ui` Dialog + hand-rolled list.** See §4.                                                                                                                                                                                                                           |
| `ModelRow.svelte`      | 128 | **port by hand.** Loses the `stopPropagation` wrappers — see §4, that scaffolding exists only to fight `Command.Item`.                                                                                                                                                      |
| `PinnedSection.svelte` | 82  | **port by hand**, and it gets _simpler_: the hand-written `data-command-group` / `-heading` / `-items` attributes exist only to imitate a `Command.Group` it cannot be nested inside. With no command library they disappear.                                               |
| `ModelFilters.svelte`  | 128 | **port by hand.** Pure composition over `FilterSelect`.                                                                                                                                                                                                                     |
| `FilterSelect.svelte`  | 78  | **`radix-ui` DropdownMenu + CheckboxItem** — _not_ Select. See §4.                                                                                                                                                                                                          |
| `ModelDetails.svelte`  | 46  | **port by hand.** Presentational; `<dl>` grid unchanged.                                                                                                                                                                                                                    |

**`Composer` — adopt `ai-elements`' `prompt-input.tsx` as the base, then re-apply three
decisions.** (Revised; see §7. The first pass said hand-roll, on the back of a wrong
rejection of `ai-elements`.) `prompt-input.tsx` is ~1,400 LOC of copied source and
carries the attachment handling M4 needs, which our 144 lines do not have at all.

What it will not carry, and must be re-applied on top — each is a decision a generic
composer does not make:

- IME composition tracked _both_ via a `compositionstart`/`end` pair _and_
  `event.isComposing`, because the comment states `isComposing` is unreliable across
  browsers and getting it wrong sends half-composed Japanese or Chinese.
- A `busy` state that deliberately spans `submitted` _and_ `streaming`, to cover the gap
  before the first chunk.
- A footer click handler that focuses the textarea only when `currentTarget === target`.

All three port to React unchanged. **Verify the IME behaviour survives adoption before
the chunk closes** — it is the one property most likely to be silently lost, and the
existing tests should be ported first so they can catch it.

### State — `lib/state/` (runes → hooks)

These four are already hook-shaped. The `.svelte.ts` suffix disappears; the files become
plain `.ts` hooks under `lib/hooks/`.

| File                        | LOC | Verdict                                                                                                                                                                                                                                                                                            |
| --------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expansion.svelte.ts`       | 50  | **port by hand** → `useExpansion(subjectIsUnfinished: boolean)`. The `follows` / `expanded` / `collapsed` tri-state is the whole idea and survives as `useState<Decision>`. The argument stops being a thunk — React re-renders on change, so it takes the value directly.                         |
| `model-selection.svelte.ts` | 111 | **port by hand** → `useModelSelection(catalog, storage?)`. `onMount(() => { storage = localStorage; restore(); })` → `useEffect(…, [])`, for exactly the same reason: server and first client render must agree. The injectable-storage seam that lets tests skip a component harness ports as-is. |
| `pinned-models.svelte.ts`   | 115 | **port by hand** → `usePinnedModels`. Same `onMount` → `useEffect` reasoning. Stale-pin dropping and alphabetical sort are pure functions already.                                                                                                                                                 |
| `stick-to-bottom.svelte.ts` | 119 | **port by hand** → `useStickToBottom`. The two Svelte `Action`s (`viewport`, `content`) become **callback refs**, which is a clean and idiomatic analogue. See §5.                                                                                                                                 |

### Utils — `lib/utils/` and `lib/constants/`

| File                      | LOC | Verdict                                                                                                                             |
| ------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `utils/markdown.ts`       | 184 | **port unchanged** except the grammar list. Zero framework coupling. See §6.                                                        |
| `utils/model-details.ts`  | 84  | **port unchanged.** Pure functions.                                                                                                 |
| `utils/model-filters.ts`  | 133 | **port unchanged.** Pure functions.                                                                                                 |
| `utils/model-list.ts`     | 118 | **port unchanged.** Pure functions.                                                                                                 |
| `constants/tool-state.ts` | 23  | **port unchanged.** Imports only from `ai`. The `satisfies Record<string, ToolState>` guard is framework-agnostic and load-bearing. |

**453 of 2,673 LOC — every file in `utils/` and `constants/` — moves with no edits at
all.** That is the cheapest part of this migration and should be the first chunk after
the framework skeleton, because it makes the test port independently verifiable.

---

## 4. Headless primitives: Radix, and no command library

`bits-ui` is used in exactly three places: `Dialog` and `Command` (`ModelPicker`),
`Command.Item` (`ModelRow`), and `Select type="multiple"` (`FilterSelect`).

### `Dialog` → `radix-ui` Dialog — straightforward

Direct analogue: `Root`/`Trigger`/`Portal`/`Overlay`/`Content`/`Title`. `bind:open`
becomes `open` + `onOpenChange`. No behaviour is lost.

### `Select type="multiple"` → **DropdownMenu + CheckboxItem**, not Select

**Radix's `Select` cannot do this.** Verified by unpacking the published typings of
`@radix-ui/react-select@2.3.7`:

```ts
type SelectProps = SelectSharedProps & {
	value?: string;
	defaultValue?: string;
	onValueChange?(value: string): void;
};
```

Single string, no `multiple` prop anywhere in the declaration file. `FilterSelect` is
`value: string[]` / `onValueChange: (value: string[]) => void`, so this is a genuine
gap, not a rename.

The idiomatic Radix answer is `DropdownMenu.CheckboxItem`, confirmed present in
`@radix-ui/react-dropdown-menu`'s typings (`DropdownMenuCheckboxItemProps`, exported as
both `DropdownMenuCheckboxItem` and `CheckboxItem`). This is arguably **more** correct
than what exists today: a multi-select filter with independent checked options is a
checkbox menu, not a listbox. `FilterSelect`'s public props
(`label`, `options`, `value`, `onValueChange`) do not change, so `ModelFilters` and its
217-line test are unaffected — only the inside of `FilterSelect` differs.

This is a user-visible change (checkmarks in a menu rather than a select popover) and
should be confirmed before implementation.

### `Command` → **hand-roll it**, and reject `cmdk`

`cmdk` is the obvious candidate and I am rejecting it, in writing, on two independent
grounds.

**Ground 1 — it is dormant.** `cmdk@1.1.1` was published **2025-03-14**; `time.modified`
on the registry record is 2025-08-27. The GitHub repo (now `dip/cmdk`, transferred from
`pacocoursey/cmdk`) was last pushed **2025-10-29**. That is roughly 17 months without a
release and 9 without a commit. Its 42.9M weekly downloads are near-entirely indirect,
via shadcn/ui. Not broken, no known CVEs — but adopting a dormant package to replace a
working one, in an epic whose entire purpose is reducing maintenance friction, is a
poor trade.

**Ground 2 — the app is already fighting this abstraction, in four places.** All four
are documented in the current source as workarounds:

1. `ModelPicker.select()` defers closing by `setTimeout(…, 0)` because `Command.Item`
   keeps reading derived state after `onSelect` returns, so closing synchronously
   triggers Svelte's `derived_inert`.
2. `ModelPicker` drops pinned ids from the browse list because two rows for the same
   model **share one hover state** under the `Command` primitive.
3. `PinnedSection` hand-writes `data-command-group`, `data-command-group-heading` and
   `data-command-group-items` to imitate a group it cannot nest inside.
4. `ModelRow` wraps both the pin star and the "More" button in `stopPropagation`
   handlers so their clicks never reach `Command.Item`'s `onSelect`.

Four workarounds is the abstraction telling you it is the wrong shape. And note what
the picker asks of it: `shouldFilter={false}` — **the app already does its own
filtering, its own grouping, its own section ordering and its own search ranking**
(`model-filters.ts`, `model-list.ts`, 251 LOC of tested pure functions). What is
actually left for a command library to provide is roving keyboard focus with `loop`,
and a `data-selected` attribute on the active row. That is a genuinely small hook, it
removes all four workarounds, and it is fully testable.

**Rejected alternatives, in writing:**

- **`@ark-ui/react`** (5.38.1, 2026-08-07, 2 npm maintainers, 946,621/wk,
  `chakra-ui` org). The closest 1:1 to `bits-ui` — I confirmed from the `@zag-js/select`
  typings that it _does_ support `multiple?: boolean`, so `FilterSelect` would port
  almost verbatim, and it has a `Combobox`. Rejected on team size relative to Radix
  (2 npm maintainers vs a WorkOS-backed org at 11.8M/wk) and because it would be a
  second whole-library bet where Radix plus ~80 lines covers everything needed. **This
  is the one to revisit if Radix's ergonomics disappoint during implementation.**
- **`@base-ui-components/react`** (MUI team, 7 maintainers, `mui` org, 10,573 stars,
  pushed 2026-08-07). Rejected on stability only: `dist-tags.latest` is
  **`1.0.0-rc.0`, published 2025-12-04** — eight months at RC with no GA. Good project,
  wrong moment to bet a migration on it.
- **`@headlessui/react`** (2.2.10, 2026-04-07, `tailwindlabs`, 6,997,022/wk). Passes the
  bar comfortably. Rejected on coverage: no command-palette primitive, and its
  `Combobox` is a different interaction from what the picker is.
- **`downshift`** (9.4.0, 2026-06-30, `downshift-js` org, 4,112,187/wk). Passes the bar.
  Rejected as solving the autocomplete problem, not the dialog-with-grouped-sections
  problem the picker actually has.

### Evidence

| Package                     | Latest     | Published      | npm maint. | Weekly DL  | Owner             | Stars  | Last push      | Verdict                   |
| --------------------------- | ---------- | -------------- | ---------- | ---------- | ----------------- | ------ | -------------- | ------------------------- |
| `radix-ui`                  | 1.6.7      | 2026-07-24     | 2          | 11,855,781 | `radix-ui` (org)  | 19,146 | 2026-07-31     | **adopt**                 |
| `@radix-ui/react-select`    | 2.3.7      | 2026-07-24     | 4          | 56,309,275 | `radix-ui` (org)  | 19,146 | 2026-07-31     | n/a — cannot multi-select |
| `cmdk`                      | 1.1.1      | **2025-03-14** | 2          | 42,950,337 | `dip` (org)       | 12,875 | **2025-10-29** | **reject — dormant**      |
| `@ark-ui/react`             | 5.38.1     | 2026-08-07     | 2          | 946,621    | `chakra-ui` (org) | —      | 2026-08-07     | reject — see above        |
| `@base-ui-components/react` | 1.0.0-rc.0 | **2025-12-04** | 7          | 422,508    | `mui` (org)       | 10,573 | 2026-08-07     | **reject — RC only**      |
| `@headlessui/react`         | 2.2.10     | 2026-04-07     | 3          | 6,997,022  | `tailwindlabs`    | —      | —              | reject — no coverage      |
| `downshift`                 | 9.4.0      | 2026-06-30     | 2          | 4,112,187  | `downshift-js`    | —      | —              | reject — wrong problem    |

Use the unified **`radix-ui`** package, not the split `@radix-ui/react-*` ones — it is
the current documented install path and re-exports every primitive.

---

## 5. Scroll anchoring: port by hand, reject `use-stick-to-bottom`

`use-stick-to-bottom` (1.1.6, published 2026-06-04, **1 npm maintainer**, 3,084,629
weekly downloads, `stackblitz-labs` org, 764 stars, pushed 2026-06-04) is the only
purpose-built package in this space with material adoption, and it targets exactly this
use case. I am still rejecting it.

The requirement is not "stick to bottom". It is the rule `stick-to-bottom.svelte.ts`
documents at length and gets right:

- `BOTTOM_EPSILON_PX = 2` is **rounding slack only**, explicitly _not_ a "close enough
  to count as following" allowance — because a generous one hauls back a reader who
  scrolled up a little to re-read a paragraph.
- **Only moving up unpins.** A scroll event says nothing about who caused it, and during
  a stream most are the component's own chase, reported a frame late. Treating those as
  "not at the end" would let go of a reader who never touched anything.
- There is deliberately **no "user has taken over" flag** — position alone decides, so
  the state cannot disagree with what is on screen.

That is 119 lines with a 345-line test file behind it, and it is the single most
carefully-reasoned file in the app. Swapping it for a third-party hook means adopting
_that_ library's answer to the same question, sight unseen, and rewriting the tests to
match. The port is mechanical — the two Svelte `Action`s become callback refs and
`ResizeObserver` is unchanged — so the cost of keeping it is low and the risk of
replacing it is not.

Single-maintainer status is a secondary concern and not the deciding one; the deciding
one is that this behaviour was already argued out and is already tested.

**No credible alternative exists.** Generic scroll utilities (`react-scroll`,
`react-virtuoso`, `@tanstack/virtual`) do not implement don't-yank-a-scrolled-up-reader
semantics at all.

---

## 6. Markdown and syntax highlighting

**Keep `marked` + `remend` + `shiki`. Port `markdown.ts` with one change: the grammar
list.** It is 184 lines with zero framework coupling.

### The security posture is the constraint, and it eliminates the obvious replacements

`markdown.ts` implements the rule from **house-elf-hp3**: model output is untrusted, so
**no raw HTML survives at all** — `html({ text })` escapes rather than filters — and
links and images are restricted to `http:`/`https:`/`mailto:` via `safeHref`. This is
deliberately _not_ a sanitiser allow-list.

- **`streamdown` — rejected.** Verified from the published `streamdown@2.5.0`
  `package.json`, its dependencies include **`rehype-raw`, `rehype-sanitize` and
  `rehype-harden`**. `rehype-raw` exists specifically to re-parse raw HTML back into the
  tree so a sanitiser can filter it — that is precisely the allow-list architecture
  hp3 rejected. It also pulls in **`mermaid`**, an enormous dependency for an app whose
  bundle is already 91% Shiki, pins `marked@^17` against the repo's 18 (a second copy),
  and brings `tailwind-merge` plus its own class names over the existing semantic
  tokens. Four independent reasons; any one is sufficient.
- **`react-markdown` — rejected as dormant.** `10.1.0` published **2025-03-07**;
  `remarkjs/react-markdown` last pushed **2025-04-21**. Roughly 16 months without a
  commit despite 29.9M weekly downloads. Separately, it would need `rehype-sanitize` to
  match the posture — the same rejected architecture.
- **`@shikijs/rehype` / `rehype-pretty-code`** — not applicable once `react-markdown`
  is out; they are rehype plugins with no role in a `marked` pipeline. For the record:
  `@shikijs/rehype` 4.4.2 (2026-08-05, 3 maintainers, `shikijs` org) is healthy;
  `rehype-pretty-code` 0.14.5 (2026-07-25) has **2 maintainers** on a single-project
  org and would be the weaker choice of the two.

### `remend` — keep, with the risk stated

`remend@1.3.0` (published 2026-03-17, **1 npm maintainer** — `haydenbleasel`, a Vercel
employee — Apache-2.0, from the `vercel/streamdown` monorepo) does not meet the
"org-backed or multi-maintainer" bar on maintainer count alone.

Keeping it anyway, deliberately: I confirmed from the installed package that it has
**zero dependencies and is 36 KB on disk**. It is a pure function, already in the tree,
already working, and framework-agnostic — it ports with no changes at all. The
single-maintainer risk is real but fully mitigated by the fact that it can be vendored
in an afternoon if it is ever abandoned. Adopting `streamdown` to get "supported"
`remend` would import the entire rejected architecture above to solve a 36 KB problem.

Its two configured options carry reasoning that must survive the port:
`linkMode: 'text-only'` (the default invents a `streamdown:incomplete-link` URL that
`safeHref` would refuse anyway) and `inlineKatex: false` (a lone `$` is far more likely
a price than an equation).

### `createHighlighterCore` and the top-level await — both survive

Confirmed from the `shiki@4.4.2` manifest that `./core` and `./engine/javascript` are
still first-class exports, and nothing in v4 supersedes the
`createHighlighterCore` + `createJavaScriptRegexEngine` fine-grained path. The planning
note that this file should "switch to `createHighlighterCore`" is stale — **it is
already done, and it is still right.**

The **top-level `await` at module scope survives too.** Its stated purpose is to keep
`renderMarkdown` synchronous so the component can use a plain derived value instead of
an effect that assigns to state. That reasoning transfers to React exactly: synchronous
`renderMarkdown` means `useMemo(() => renderMarkdown(text), [text])`, with no `useEffect`,
no pending state and no flicker mid-stream. React 19's `use()` + Suspense is the
alternative and would let the grammars load lazily, but it buys a suspense boundary and
a loading state in exchange for complexity in the hottest path in the app. Keep the TLA;
the grammars are local and the chat cannot show model output before it has any.

### The grammar list — one real change, measured

Measured against the installed `@shikijs/langs`, and verified by building a highlighter
with each candidate list and reading back `getLoadedLanguages()`:

| Change               | Raw         | Gzipped    | Effect on resolvable fences                            |
| -------------------- | ----------- | ---------- | ------------------------------------------------------ |
| Drop `svelte`        | −19 KB      | −3 KB      | loses `svelte` **and `postcss`** (embedded via svelte) |
| Add `tsx`            | +181 KB     | +16 KB     | gains `tsx` — **and nothing else**                     |
| Add `jsx` (rejected) | +183 KB     | +16 KB     | gains `jsx` only                                       |
| **Net recommended**  | **+162 KB** | **+13 KB** | 26 → 25 resolvable fences                              |

Two findings worth recording:

1. **`tsx` and `jsx` declare no aliases and are fully independent grammars** — `tsx` is
   not a thin extension of `typescript`, it is another 181 KB. Adding `tsx` does _not_
   make ` ```jsx ` resolve.
2. **`tsx` does not resolve today.** I built the current highlighter and confirmed
   ` ```tsx ` and ` ```jsx ` both fall back to plain text right now — so a
   `.tsx` codebase discussing its own source gets unhighlighted code blocks until this
   changes. That is the actual justification for the swap.

**Recommendation: add `tsx`, drop `svelte`, do not add `jsx`.** +13 KB gzipped against a
measured 265 KB gzipped Shiki payload is ~5%, and a ` ```jsx ` fence in a
TypeScript project is rare enough to accept the documented plain-text fallback.

I also checked a claim in the existing comment — _"`typescript` covers JavaScript too …
so ` ```ts ` and ` ```js ` both resolve"_ — because the `typescript`
grammar's own aliases are only `["ts","cts","mts"]`. **The comment is correct**:
`getLoadedLanguages()` returns `javascript`, `js`, `cjs`, `mjs`, because the grammar
carries `javascript` as an embedded language. No change needed, and the comment should
be carried across verbatim.

### Evidence

| Package              | Latest | Published      | npm maint. | Weekly DL  | Owner            | Verdict               |
| -------------------- | ------ | -------------- | ---------- | ---------- | ---------------- | --------------------- |
| `marked`             | 18.0.9 | 2026-08-04     | 4          | 62,265,911 | `markedjs` (org) | **keep**              |
| `shiki`              | 4.4.2  | 2026-08-05     | 4          | 18,471,700 | `shikijs` (org)  | **keep**              |
| `remend`             | 1.3.0  | 2026-03-17     | **1**      | 6,581,612  | `vercel` (org)   | **keep, risk stated** |
| `streamdown`         | 2.5.0  | 2026-03-17     | 4          | 5,113,083  | `vercel` (org)   | **reject**            |
| `react-markdown`     | 10.1.0 | **2025-03-07** | 3          | 29,895,999 | `remarkjs` (org) | **reject — dormant**  |
| `@shikijs/rehype`    | 4.4.2  | 2026-08-05     | 3          | 724,170    | `shikijs` (org)  | n/a                   |
| `rehype-pretty-code` | 0.14.5 | 2026-07-25     | 2          | 701,335    | `rehype-pretty`  | n/a                   |

---

## 7. Chat client, and the message renderer

### `@ai-sdk/react` — adopt

| Package         | Latest | Published  | npm maint. | Weekly DL  | Owner    | Verdict      |
| --------------- | ------ | ---------- | ---------- | ---------- | -------- | ------------ |
| `@ai-sdk/react` | 4.0.61 | 2026-08-07 | 3          | 7,219,644  | `vercel` | **adopt**    |
| `ai`            | 7.0.58 | 2026-08-07 | 5          | 20,042,774 | `vercel` | already used |

The lower major (4.x vs `@ai-sdk/svelte`'s 5.x) is an independent release line, not
staleness — both were published 2026-08-07.

### ⚠️ The `house-elf-p7p` trap is live, and it is a hard constraint

The epic's note that `@ai-sdk/react` "depends on the same `ai` v7 line" understates
this. Read from the registry, `@ai-sdk/react@4.0.61` declares:

```json
"dependencies": { "ai": "7.0.58", … }
```

That is an **exact pin as a regular dependency**, not a peer range. I confirmed the same
shape in the installed `@ai-sdk/svelte@5.0.44`, which pins `"ai": "7.0.44"` — and
`apps/web/package.json` pins `"ai": "7.0.44"`. **Those matching exact versions are the
only reason there is one copy of `ai` in the browser today**, which I verified on disk:

```
node_modules/ai            -> 7.0.47   (apps/server)
apps/web/node_modules/ai   -> 7.0.44   (apps/web — single copy)
```

So the rule for the migration, and for every upgrade after it:

> **`apps/web`'s `ai` version must be bumped to exactly the version `@ai-sdk/react`
> pins, in the same commit.** Any mismatch nests a second `ai` in the browser bundle —
> two stream parsers, and per house-elf-p7p a stream that connects and produces nothing,
> with no error.

For the migration that means moving `ai` from `7.0.44` to **exactly `7.0.58`** alongside
adding `@ai-sdk/react@4.0.61`. A CI guard asserting a single resolved `ai` under
`apps/web` would be cheap and worth a follow-up issue.

Also worth recording, because it is narrower than it looks: `@ai-sdk/react@4.0.61`'s
React peer range is `^18 || ~19.0.1 || ~19.1.2 || ^19.2.1` — **not** a blanket `^19`.
React 19.2.8 (current) satisfies it; some 19.x patches do not.

### `ai-elements` — ADOPT, selectively

**This section replaces an earlier rejection that was wrong.** The first pass rejected
`ai-elements` on its README prerequisites without reading what it ships. Corrected here
after unpacking the package and all 48 components.

`ai-elements@1.9.0`, published **2026-03-12**, 4 npm maintainers, `vercel` org,
Apache-2.0, 46,583 weekly downloads.

**It is not a dependency.** The published tarball is four files; `index.js` is 1,583
bytes and its entire job is to shell out:

```js
const fullCommand = `${commandPrefix} shadcn@latest add ${targetUrls}`;
```

…against `https://elements.ai-sdk.dev/api/registry/`. The README's "Next.js project" and
"shadcn/ui initialized" lines describe **that CLI's** assumptions, not the components'.
The registry is public JSON; the payload is **48 Apache-2.0 `.tsx` files** that get
copied into the repo and become ours to edit. The low download count measures CLI runs,
not adoption, and is not evidence about quality.

#### The claim that was wrong

The earlier pass said adopting this imports the Streamdown architecture `house-elf-hp3`
rejected. Checked against the extracted sources: **2 of 48** files import Streamdown
(`message.tsx`, `reasoning.tsx`). **35 of 48** import no heavy dependency at all — no
`streamdown`, no `mermaid`, no `@xyflow/react`, no `shiki`, no `media-chrome`. They are
Radix + `lucide-react` + Tailwind classes.

And in `reasoning.tsx` the coupling is one line (207–219):

```tsx
const streamdownPlugins = { cjk, code, math, mermaid };
// …
<Streamdown plugins={streamdownPlugins}>{children}</Streamdown>;
```

Because the file is copied source, that line becomes `<Markdown source={children} />` and
the component is ours, with `markdown.ts`'s escape-at-the-parser posture intact. The
security objection applies to `streamdown` the package — it does not transfer to
components that merely happen to render markdown.

#### What this actually replaces

| Need                       | Component                                                   | Notes                                                                                                 |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Composer (M1)              | `prompt-input.tsx`                                          | ~1,400 LOC. Attachments, paste-to-attach, drag-drop, screenshot capture, blob-URL cleanup on unmount. |
| Upload / CV / PDF (**M4**) | `prompt-input.tsx` + `attachments.tsx`                      | The attachment provider is the bulk of what `house-elf-6kj` would otherwise hand-roll.                |
| RAG citations (**M4**)     | `sources.tsx`, `inline-citation.tsx`                        | Neither touches Streamdown.                                                                           |
| HITL approval (**M5**)     | `confirmation.tsx`                                          | Already models `approval-requested` → `approval-responded` / `output-denied`.                         |
| Multi-agent UI (**M3**)    | `agent.tsx`, `plan.tsx`, `task.tsx`, `chain-of-thought.tsx` |                                                                                                       |
| Context-window meter       | `context.tsx`                                               | Via `tokenlens`, from `LanguageModelUsage`.                                                           |

This is the strongest single argument for React in this report, and the first pass
buried it. It is the answer to "what is the point of React if we hand-roll everything":
roughly 1,400 LOC of Composer plus most of the M4 and M5 UI surface stops being ours to
write.

#### What it does NOT replace, and why

- **`Markdown` / `markdown.ts`** — keep. See §6; unchanged by this correction.
- **`StickToBottom`** — keep. `conversation.tsx` is a thin wrapper over
  `use-stick-to-bottom`, rejected in §5 on the specific pinning rules our 119-LOC module
  argues out and 345 LOC of tests pin down.
- **`ToolCard`** — keep, and take this as validation. `tool.tsx` declares
  `statusLabels: Record<ToolPart["state"], string>` over the same seven states
  `lib/constants/tool-state.ts` already names. Two independent implementations reached
  the same design; there is nothing to gain by swapping.
- **`ModelPicker`** — keep. `model-selector.tsx` is a plain `Select`; it does not do
  pinning, grouping, or ranked search.

#### The real cost — a token collision, measured

Not the packaging. **219 shadcn token references across the 48 files**, led by
`text-muted-foreground` (96), `bg-muted` (33), `text-foreground` (24), `bg-background`
(17).

The trap is that this **fails silently**. Our `--color-muted` is a _text_ colour;
shadcn's `muted` is a _background_. `bg-muted` compiles fine against our theme and paints
light grey text-colour as a background. Same shape for `accent`: ours is a saturated
periwinkle brand colour, shadcn's is a subtle hover background.

But the vocabularies describe the same concepts under different names — `layout.css`'s
own comments say so:

| Ours              | Comment in `layout.css`    | shadcn name        |
| ----------------- | -------------------------- | ------------------ |
| `--color-muted`   | "secondary text"           | `muted-foreground` |
| `--color-raised`  | "hover, input backgrounds" | `muted` / `accent` |
| `--color-accent`  | brand periwinkle           | `primary`          |
| `--color-canvas`  | "main pane"                | `background`       |
| `--color-content` | "primary text"             | `foreground`       |
| `--color-line`    | "borders, dividers"        | `border`           |

So this does not need a per-component editing pass. Measured usage in `apps/web/src`:
our `muted` appears **only** as `text-muted` (15×) and never as a background; `accent`
appears as `bg-accent` (6), `text-accent` (4), `border-accent` (3), `bg-accent-soft` (1).

**Recommendation: a one-time ~28-reference rename** — `text-muted` →
`text-muted-foreground`, `accent` → `primary` — after which our `@theme` block is a
_superset_ of shadcn's vocabulary and copied components render correctly **unedited**.
Add `--color-destructive` at the same time; we have none today and M5's deny/error states
need one.

That rename is the concrete, reviewable first chunk of adoption, and it is worth doing
before any component is copied.

#### Standing rule for adoption

Adopt by default. Keep ours only where there is a written, tested argument the library
contradicts — which today is exactly three things: `Markdown` (security posture),
`StickToBottom` (pinning rules), `ModelPicker` (pinning/grouping/ranked search). Every
copied file is vendored source under Apache-2.0: review it on the way in, and it is ours
to change afterwards.

### `assistant-ui` — rejected

`@assistant-ui/react@0.15.8`, published 2026-08-06, 2 npm maintainers, `assistant-ui`
org (AgentbaseAI Inc.), 11,508 stars, 1,585,825 weekly downloads, pushed 2026-08-08.
Actively developed and genuinely company-backed, so it clears the maintenance bar.

Rejected on scope, not health. It is a **full chat runtime** — it would take over the
transport, the message store and the entire rendering pipeline. This app deliberately
owns all three: a dumb SSE proxy it must keep dumb, per-message `model` and `thinking`
travelling in the request body (_"the choice made at the moment of asking is the one
that should apply"_), and a part renderer whose tool card follows the tool until someone
clicks and whose labels are an exhaustive `Record<ToolState, string>` so a new SDK state
is a compile error. Adopting a runtime to get a renderer, then fighting it to restore
behaviours that already work, is a bad trade. `0.x` semver is a secondary concern.

**Re-evaluate at M5.** Human-in-the-loop approval UI is exactly the kind of thing it
does well, and `ToolCard` already models `approval-requested` / `approval-responded`.

---

## 8. Test port — `apps/web/tests`

**4,269 LOC of tests against 2,673 LOC of source. This is the larger half of the
migration and it is not mechanical.** But the news is better than expected in one
specific way: the stub architecture gets _smaller_.

### The query layer ports 1:1

The entire Testing Library surface used across 24 files is `render`, `screen`, `within`,
`waitFor`, `fireEvent`, `cleanup` — all present and identical in
`@testing-library/react`. Assertions are `@testing-library/jest-dom`, unchanged. Queries
are role- and label-based throughout, so they survive the markup change.

| Package                       | Latest  | Published  | npm maint. | Weekly DL  | Owner                                | Verdict    |
| ----------------------------- | ------- | ---------- | ---------- | ---------- | ------------------------------------ | ---------- |
| `@testing-library/react`      | 16.3.2  | 2026-01-19 | 18         | 51,635,860 | `testing-library`                    | **adopt**  |
| `@testing-library/user-event` | 14.6.3  | 2026-08-03 | 18         | 45,301,965 | `testing-library`                    | keep       |
| `vitest` / `@vitest/browser`  | 4.1.10  | 2026-07-06 | 5          | 88,401,360 | `vitest-dev`                         | keep       |
| `jsdom`                       | 30.0.1  | 2026-07-29 | 6          | 89,878,452 | `jsdom` (org)                        | keep       |
| `happy-dom`                   | 20.11.2 | 2026-08-07 | **1**      | 13,757,101 | `capricorn86` (**personal account**) | **reject** |
| `@playwright/test`            | 1.62.1  | 2026-07-30 | 5          | 51,958,220 | `microsoft`                          | keep       |

`happy-dom` is rejected in writing: one npm maintainer, and the GitHub owner is a
personal user account, not an org. Popularity is not the bar. There is no reason to
switch — `jsdom` is already in use and passes comfortably.

### The stub architecture — keep the design, delete two thirds of the files

| File(s)                                       | LOC    | Verdict                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stubs/stub-props.ts`                         | 68     | **port unchanged.** Pure TS — `recordStubProps` / `stubRenders` / `stubProps` / `stubPropsOf` / `stubCallback` / `resetStubProps` have no framework coupling.                                                                                                                          |
| `stubs/keys.ts`                               | 22     | **port unchanged.** Symbol registry. Its stated reason (TS cannot resolve named exports from a `.svelte` file imported by a `.ts` one) **disappears** in React — but keep the file anyway; symbol identity is still the right design and moving them would churn 24 files for nothing. |
| `stubs/Stub.svelte`                           | 22     | **port by hand** → one `Stub.tsx`, recording props in an effect, rendering `data-testid` + `data-stub-id` and `children` when present.                                                                                                                                                 |
| 12 × `*Stub.svelte` wrappers                  | 96     | **drop → replace with a factory.** In React a stub is a plain function component, so these collapse into a single `makeStub(key)` helper (or inline `vi.mock` factories). ~12 files and ~96 LOC removed.                                                                               |
| `components/chat/ModelRowHarness.svelte`      | 37     | **port by hand** → `.tsx`.                                                                                                                                                                                                                                                             |
| `components/chat/PinnedSectionHarness.svelte` | 40     | **port by hand** → `.tsx`.                                                                                                                                                                                                                                                             |
| `setup/testing-library.ts`                    | 16     | **port by hand** → `cleanup` from `@testing-library/react`. **The comment stops being true**: RTL auto-registers cleanup when `globals` is off differently — verify empirically rather than porting the assumption. `resetStubProps` stays.                                            |
| `setup/app-state.ts`                          | 29     | **rewrite.** `vi.mock('$app/state')` has no analogue; React Router provides test helpers/`MemoryRouter`-style wrappers instead. The `setPathname` seam should survive in some form.                                                                                                    |
| `setup/dom-layout.ts`                         | 35     | **port unchanged.** `ResizeObserver`, `scrollIntoView`, pointer capture and `getClientRects` shims are jsdom facts, not Svelte facts. Radix needs these exactly as much as bits-ui did.                                                                                                |
| `helpers/layout.ts`                           | 18     | **port unchanged.** Pure `Object.defineProperty` shim.                                                                                                                                                                                                                                 |
| `helpers/models.ts`                           | 51     | **port unchanged.** Pure fixture builder.                                                                                                                                                                                                                                              |
| `runes.svelte.test.ts`                        | 51     | **drop.** It exists solely to prove the rune compiler is active under Vitest. There is no React equivalent worth writing — JSX not compiling fails everything loudly.                                                                                                                  |
| 21 × `*.test.ts` component/state/util tests   | ~3,700 | **port by hand**, per component. Utility tests (`markdown`, `model-details`, `model-filters`, `model-list` — 478 LOC) port with **no changes at all**, since their subjects do.                                                                                                        |

### The one test that changes shape

`ChatView.test.ts` (318 LOC) mocks `@ai-sdk/svelte`'s `Chat` **class** with getters for
`messages` / `status` / `error`. `@ai-sdk/react` exposes a `useChat` **hook** returning a
plain object, so the mock becomes a function returning that object — simpler, but a real
rewrite rather than a rename. `chat-proxy.test.ts` (169 LOC, `@vitest-environment node`)
ports almost unchanged: it calls the handler directly with a hand-built event, so only
the event shape differs.

### E2E — nearly free

`tests/e2e/chat-stream.spec.ts` (253) and `shell.spec.ts` (66) stub `window.fetch` via
`addInitScript` and assert through roles and `toBeInViewport` / `inert`. Both are
framework-agnostic. Two things change: `playwright.config.ts`'s `webServer.cwd`, and
`shell.spec.ts`'s `toggleSidebar` retry helper, whose comment explains it retries
because _"`page.goto` resolves before the client modules Vite compiles on demand have
run"_ — still true under React, so keep the helper.

---

## 9. Config changes for both apps to coexist

The constraint is that `bun run verify` runs `bun run --filter '*'` across every
workspace, so **both apps must stay green on every chunk** while `apps/web` and
`apps/web-react` exist side by side.

| File                            | Change needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint.config.js`              | Must carry **both** stacks. `svelte.configs.recommended`, `svelte.configs.prettier` and `parserOptions.extraFileExtensions: ['.svelte']` stay while `apps/web` exists; scope the Svelte blocks to `apps/web/**` with `files`, and add a `.tsx`/`.jsx` block (`eslint-plugin-react-hooks` at minimum — the rules-of-hooks check is the one that catches real bugs). `projectService: true` already resolves per-workspace tsconfigs, so type-aware linting works across both without further change.                                                 |
| `vitest.shared.ts`              | **80% lines / 75% branches is the migration's sharpest edge.** A half-ported `apps/web-react` fails it from its first commit. Either every chunk ports source _and_ its tests together, or the new workspace carries a temporary threshold override with a dated comment and an issue to remove it. **Decide this before chunk 1** — it dictates how chunks are cut.                                                                                                                                                                                |
| `apps/web-react/vite.config.ts` | New: `@vitejs/plugin-react` + `@tailwindcss/vite` + the React Router or TanStack plugin. **Carry over the `resolve.conditions` rule from house-elf-iwy verbatim** — absent and `[]` are opposites, and `[]` silently drops `browser`, which is what previously made `@vercel/oidc` (via `ai`) resolve to its Node build and crash with `process is not defined`. The same `ai` package is still there. Also carry `server.watch.ignored: ['**/coverage/**']`.                                                                                       |
| `apps/web-react/tsconfig.json`  | New, extending `tsconfig.base.json`, with `jsx: "react-jsx"`. Does not extend `.svelte-kit/tsconfig.json`, so path aliases (`$lib` → `~/` or similar) must be declared explicitly.                                                                                                                                                                                                                                                                                                                                                                  |
| `tsconfig.json` (root)          | `include` already covers `vitest.shared.ts`, `playwright.config.ts`, `tests/**/*.ts`. **Add `tests/**/*.tsx`** if any e2e helper becomes JSX; otherwise unchanged.                                                                                                                                                                                                                                                                                                                                                                                  |
| `playwright.config.ts`          | `webServer.cwd` flips from `apps/web` to `apps/web-react` at cutover. Keep port 5173 so `baseURL` and both specs are untouched. Consider running both during the transition.                                                                                                                                                                                                                                                                                                                                                                        |
| `scripts/verify-fast.sh`        | `matching`/`in_workspace` regexes are `\.(ts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | js  | mjs | svelte)$`and`\.(ts | svelte)$`. **Must gain `tsx`/`jsx`**, and a `test:web-react`job mirroring`test:web`. Without this the pre-commit hook silently skips every new component — it would report success having tested nothing. |
| `prettier`                      | `prettier-plugin-svelte` stays while `apps/web` exists; `prettier-plugin-tailwindcss` already handles both. No new plugin needed for `.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `.github/workflows/verify.yml`  | No change needed — it runs `bun run verify`. But see the Bun risk in §2: this is where a Node-version problem would first appear, and it installs **only Bun**.                                                                                                                                                                                                                                                                                                                                                                                     |
| `apps/web/package.json`         | At cutover: delete. Before that, `ai` must move to exactly the version `@ai-sdk/react` pins (§7) — which means `apps/web` and `apps/web-react` briefly need the _same_ `ai` version, since `@ai-sdk/svelte@5.0.44` pins `7.0.44` and `@ai-sdk/react@4.0.61` pins `7.0.58`. **These two cannot coexist in one `ai` version.** Either upgrade `@ai-sdk/svelte` to a build pinning `7.0.58` first, or accept two `ai` copies across the two workspaces during the transition — which is safe only because they are separate bundles. Flag for chunk 1. |

---

## 10. Deliberately hand-rolled, and why

| Kept by hand                 | Reason                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Composer (3 behaviours only) | IME double-signal handling, `submitted`-spans-`streaming` busy state, footer-click focus. Re-applied on top of `prompt-input.tsx`, not hand-rolled from scratch.   |
| Message part renderer        | `ToolCard`'s exhaustive `Record<ToolState, string>` turns a new SDK state into a compile error; expansion follows the tool until clicked. A library gives neither. |
| `ReasoningPart`              | The `absent → thinking → lingering → read` machine with a 1s linger, and "reloaded threads stay `absent`".                                                         |
| `StickToBottom`              | §5 — the rule is the product, and it is argued out and tested.                                                                                                     |
| Command-list navigation      | §4 — the app already owns filtering, grouping, ranking; only roving focus is left, and `cmdk` is dormant.                                                          |
| `markdown.ts`                | §6 — escape-everything beats every allow-list library available.                                                                                                   |
| `WorkingDots`                | 40 lines including a `prefers-reduced-motion` branch.                                                                                                              |

The user has already hand-rolled a chat UI with considered behaviour baked in. On this
evidence, "adopt" is the right answer for **primitives** (Dialog, DropdownMenu) and for
the **chat transport** (`@ai-sdk/react`), and the wrong answer for everything that
encodes a product decision.

---

## 11. What this migration does _not_ fix

Recorded so nobody attributes it to React later.

- **`Markdown` re-parses the entire accumulated string on every streamed token** —
  quadratic in message length, and the real performance ceiling of this app. It is
  framework-independent and survives the port untouched. It deserves its own issue
  (incremental parsing, or splitting the stable prefix from the streaming tail).
- **Shiki is 1,328 KB raw / 265 KB gzipped = 91% of client JS**, against ~92 KB / 31 KB
  for the framework runtime plus all app code. Trimming Shiki is worth several times any
  framework delta. Tracked separately — do not smuggle it into this epic. This
  investigation _adds_ ~162 KB raw / 13 KB gzipped to it (§6), knowingly.

---

## 12. Open questions for the user

1. **Meta-framework** — React Router 8 is recommended for boundary familiarity; TanStack
   Start wins on typed routing, which the user has said they like. This is the one
   decision I would not make unilaterally.
2. **`FilterSelect` becomes a checkbox menu** rather than a multi-select popover (§4).
   Different look, arguably better semantics. User-visible.
3. **Coverage thresholds during the transition** (§9) — this dictates how chunks are cut,
   so it needs answering before shi.2 chunks anything.
4. **`tsx` grammar for +13 KB gzipped, and no `jsx`** (§6) — confirm the trade.
5. **The token rename** (§7) — `text-muted` → `text-muted-foreground` and `accent` →
   `primary`, ~28 references, plus a new `--color-destructive`. Purely internal: no
   rendered colour changes. It is the precondition for dropping `ai-elements` components
   in unedited, so it should be the first chunk of the migration, ahead of any component
   work. Called out rather than assumed because it touches the file the issue said
   "ports free".
