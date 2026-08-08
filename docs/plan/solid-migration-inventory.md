# Solid migration inventory — apps/web

Deliverable of **house-elf-iis.2**. Answers the Solid question on its own terms: what
the Solid version of this app is built from, with the evidence behind every adoption.
The final stack choice (React vs Solid) is made at **house-elf-shi.2** from this and
its [React counterpart](./react-migration-inventory.md).

Investigated 2026-08-08. Registry figures are from `registry.npmjs.org` `time` fields
and `api.npmjs.org` last-week downloads, read directly; repo figures from the GitHub
API. Nothing here is quoted from a search-result summary.

**No application code was written for this issue.** Unlike the React inventory, this one
also _ran_ things: four spikes live outside the repo in `~/spikes/`, and the command
output quoted below is theirs. Nothing was spiked inside the repo.

Companion: **house-elf-iis.1** (agent-tooling spike) — **PASS**, closed. Summary at §11.

---

## 1. Recommendation in one page

**Solid is technically viable. The blocker is not Solid, it is `@ai-sdk/solid`.**

The framework, router, meta-framework, component library, lint plugin and test library
all work — verified by running them, not by reading their READMEs. The one package the
app actually depends on for chat, `@ai-sdk/solid`, was last published **2025-05-07** at
version **1.2.13** while `ai` is at **7.0.58**. It is a major version behind and
abandoned.

That turns out to be survivable, because **the port is ~50 lines and I wrote and ran it**
(§5). But it is a permanent, self-owned maintenance liability, and it is the honest
centre of this decision.

| Decision                | Verdict                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Meta-framework          | **SolidStart 2.0**. SSR, unbuffered SSE and abort forwarding all verified by running them (§4). Four days old, with an RC `h3` dependency. |
| Chat client             | **Hand-owned `ChatState`, ~50 lines** on `ai`'s `AbstractChat`. `@ai-sdk/solid` is abandoned (§5).                                         |
| Headless primitives     | **Ark UI (`@ark-ui/solid`)**. Runner-up Kobalte; corvu rejected on bus factor (§6).                                                        |
| Markdown / highlighting | **Copy `markdown.ts` verbatim** — zero framework imports (§2).                                                                             |
| Scroll anchoring        | **Port by hand** — Svelte `Action` → Solid `use:` directive; body is plain DOM (§2).                                                       |
| Tests                   | **`@solidjs/testing-library` + vitest 4.1.10**, the repo's exact version. 4/4 passing (§7).                                                |
| Lint                    | **`eslint-plugin-solid`**, with `solid/reactivity` raised to error (§8).                                                                   |
| Agent tooling           | **The reason to do this at all.** 0→69 graph nodes, 1/14→58/58 references, corrupting→clean renames (§11).                                 |

---

## 2. What exists today — per-file mapping for `apps/web`

`apps/web` has 91 tracked files, 83 of them under `src` and `tests`: 19 `.svelte`
components plus supporting TS in `src`, and 25 `.test.ts` files plus 15 `.svelte` stubs in
`tests`.

| Area            | File                                            | Verdict             | Evidence                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Markdown        | `lib/utils/markdown.ts` (184 LOC)               | **Copy verbatim**   | Zero framework imports. marked + shiki + remend + hand-rolled `escapeHtml`/`safeHref`. Only coupling is `{@html}` → Solid `innerHTML`.                                                                                                                                                                                                                 |
| Expansion store | `lib/state/expansion.svelte.ts` (50 LOC)        | **Near-mechanical** | Already takes an accessor `() => boolean` and returns a getter-object — idiomatic Solid. `$state`→`createSignal`, `$derived`→`createMemo`. Consumer (`ToolCard`) is unchanged: `expansion.isOpen` still works.                                                                                                                                         |
| Auto-scroll     | `lib/actions/stick-to-bottom.svelte.ts`         | **Near-mechanical** | Svelte `Action` (`use:`) → Solid `use:` directive. Body is framework-agnostic DOM (scroll listener + ResizeObserver).                                                                                                                                                                                                                                  |
| Tool state      | `lib/utils/tool-state.ts`                       | **Copy verbatim**   | `as const satisfies Record<string, ToolState>`; plain TS.                                                                                                                                                                                                                                                                                              |
| SSE proxy       | `routes/api/chat/[agentId]/+server.ts` (36 LOC) | **Port, proven**    | §4.                                                                                                                                                                                                                                                                                                                                                    |
| Server env      | `lib/server/mastra.ts`                          | **Small port**      | `$env/dynamic/private` → `process.env`; SvelteKit `error()` → SolidStart equivalent.                                                                                                                                                                                                                                                                   |
| Chat            | `ChatView.svelte`                               | **Depends on §5**   | Imports exactly one symbol from `@ai-sdk/svelte`: `Chat`. Uses only `messages`, `error`, `status`, `sendMessage`, `regenerate`, `stop` — all inherited from `AbstractChat` in `ai`.                                                                                                                                                                    |
| Model picker    | `ModelPicker.svelte` (257 LOC)                  | **Rewrite, scoped** | Uses bits-ui `Command` + `Dialog` with **`shouldFilter={false}`** — bits-ui supplies keyboard nav / roving focus / selection only. Filtering is already ours (`model-filters.ts`, `model-list.ts`). Also carries a bits-ui 2.x `derived_inert` workaround (a `setTimeout(…, 0)` before close) that is Svelte-specific and **disappears** on migration. |

**The `ChatView`/`ModelPicker` finding matters:** the framework-specific surface is far
smaller than the file count suggests. `@ai-sdk/svelte` contributes one class, and bits-ui
contributes no filtering logic.

---

## 3. What is planned (M1.5 → M6)

Read from the epics rather than assumed.

| Milestone                               | UI surface it adds                                       | Solid impact                                                                                                        |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| M1.5 `k9u` — choosing the model         | Per-message model picker in the composer                 | Already counted; the picker rewrite covers it                                                                       |
| M1.7 `c6r` — any OpenRouter model       | Hundreds of catalog models, capability metadata          | Pure data + filtering, already ours. **Reinforces** that list virtualisation, not a component kit, is the real need |
| M2 `uwu` — threads, persistence, memory | Thread sidebar, thread list                              | Ordinary components; no framework-specific risk                                                                     |
| M2.1 `c8d` — prompt caching (stub)      | None (server-side)                                       | **Zero**                                                                                                            |
| M2.5 `egj` — web search (stub)          | New message-part renderer for `url_citation` annotations | A renderer per part type; Solid `<Switch>/<Match>` maps directly to Svelte `{#if}`                                  |
| M2.6 `32k` — image generation (stub)    | Image message parts, download/preview                    | Same renderer extension point                                                                                       |
| M3 `ien` — menu agent, semantic recall  | Multi-agent picker in the UI                             | Small                                                                                                               |
| M4 `6kj` — CV agent, RAG, PDF           | **File upload UI**, PDF download + preview               | The single largest new UI need. Ark UI ships `file-upload` (§6)                                                     |
| M5 `igq` — workflows, HITL              | Workflow UI, suspend/resume prompts                      | New but ordinary                                                                                                    |
| M6 `q47` — auth and deployment          | Login gate                                               | Small                                                                                                               |

**Conclusion:** nothing planned requires a component Solid lacks. The recurring pattern is
a _message-part renderer_ (citations, images, tools), which is plain conditional rendering
— the least framework-specific thing in the app. M4's file upload is the only genuinely
new widget, and Ark UI has it.

---

## 4. SolidStart 2.0 — the meta-framework, run rather than read

`@solidjs/start` **2.0.0**, published **2026-08-04** (four days old). Replaces Vinxi with
Vite's Environment API. Config moved from `app.config.ts` to `vite.config.ts`.

Three tests against a scaffolded spike (`~/spikes/solidstart-spike`), with a fake upstream
SSE server emitting 20 tokens at 300 ms intervals:

**a) Server loader → SSR → hydration.** Raw `curl` of the page (no JS) contained the
loader's data in the server-rendered markup:

```
<p data-testid="loaded">loaded-on-server host=<!--$-->Johns-MacBook-Pro.local<!--/--> models=<!--$-->alpha,beta<!--/--></p>
```

**b) Unbuffered SSE streaming.** `curl -N -X POST` through the proxy route, timestamping
each line's arrival:

```
249.55 data: {"token":"tok1"}
249.85 data: {"token":"tok2"}
250.14 data: {"token":"tok3"}
250.45 data: {"token":"tok4"}
```

~300 ms apart — the upstream cadence, i.e. nothing buffered the stream.

**c) Abort forwarding.** Control first, so the result means something:

```
CONTROL (stream to completion) → upstream aborted flag: {"aborted":false}
ABORT   (kill client at ~1.5s) → upstream aborted flag: {"aborted":true}
```

The client hang-up propagates through the SolidStart route to the upstream request. This
is the contract `+server.ts` satisfies today, and SolidStart satisfies it too.

**Caveats, stated honestly:**

- SolidStart 2.0 declares **Node.js 24+**. This machine runs **v23.10.0** and everything
  above ran anyway, under bun. So the floor is advisory in practice — but it is untested
  on a clean Node 24 target and should not be assumed benign for deployment (M6).
- `@solidjs/start@2.0.0` depends on `h3 ^2.0.1-rc.26` — **a release candidate inside a
  stable major**. Worth knowing before betting on it.
- The version is four days old. There is no field experience behind it, ours or anyone's.

---

## 5. `@ai-sdk/solid` — the actual blocker, and the port that answers it

| Package             | Version    | Published      | Weekly DL |
| ------------------- | ---------- | -------------- | --------- |
| `ai`                | 7.0.58     | 2026-08-07     | 20M       |
| `@ai-sdk/svelte`    | 5.0.58     | 2026-08-07     | 427k      |
| `@ai-sdk/react`     | 4.0.61     | 2026-08-07     | 7.2M      |
| **`@ai-sdk/solid`** | **1.2.13** | **2025-05-07** | 341k      |

Abandoned: 15 months stale against an `ai` v7 line that ships weekly.

**But the thing it provides is tiny.** `@ai-sdk/svelte`'s entire `Chat` implementation is
**28 lines**: it extends `AbstractChat` from `ai` and supplies a `ChatState` — a 7-member
interface (`status`, `error`, `messages`, `pushMessage`, `popMessage`, `replaceMessage`,
`snapshot`).

I wrote the Solid equivalent (`~/spikes/solid-chatstate-spike/port.js`, ~50 lines) and ran
**real `AbstractChat`** through it with a streaming transport. Result:

```
finalStatus: "ready",  messageCount: 2,  roles: ["user","assistant"]
assistantText: "Hello world from Solid."
statusSeen: ["ready","submitted","streaming","ready"]
assistantTextProgression: ["", "Hello", "Hello ", "Hello world",
                           "Hello world from", "Hello world from Solid",
                           "Hello world from Solid."]
```

**Fine-grained reactivity is not just preserved, it is better than the Svelte version.**
Three effects with different dependencies, over 6 streamed tokens:

| Effect tracks                | Runs  | Meaning                                                       |
| ---------------------------- | ----- | ------------------------------------------------------------- |
| assistant message text       | **9** | updates per token, as it must                                 |
| message-list structure (ids) | **3** | init + 2 pushes — **token deltas do not invalidate the list** |
| _user_ message text          | **2** | untouched while the assistant streams                         |

A `createStore` with `reconcile` isolates the streaming message from its siblings, so a
long conversation does not re-run per-message work on every token.

**Two non-obvious findings this spike produced — both cost real time, both are recorded so
the next session does not repeat them:**

1. **The store must deep-clone on insert.** `AbstractChat` keeps mutating the message
   object it hands you. Storing that reference makes the Solid store _alias_ its internal
   state, so `reconcile()` later diffs an object against itself, sees no change, and
   `parts` silently stays empty — the text arrives but nothing renders. `structuredClone`
   in `pushMessage`/`replaceMessage` fixes it. Symptom is a working `finalText` with a
   dead UI, which is exactly the sort of bug that eats a day.
2. **Node resolves `solid-js` to the SSR no-op build.** `package.json` `exports` maps the
   `node` condition to `dist/server.js`, where reactivity does nothing — effects never
   fire. Importing `dist/solid.js` by path is _not_ a fix: `solid-js/store` still imports
   bare `solid-js` internally, giving you two runtimes. The fix is the **export
   condition**: `--conditions=browser` for Node, or `resolve.conditions` in Vite/Vitest.
   Any Solid test config in this repo must set it.

`replaceMessage` strategies compared (all correct; `reconcile` with `key:'id'` dedupes one
redundant final update):

```
reconcile(key:id)    effectRuns=7
reconcile(key:null)  effectRuns=8
plain set            effectRuns=8
produce splice       effectRuns=8
```

**Effort: roughly a day, not a milestone.** The risk is not writing it — it is owning it
against `ai`'s weekly releases. `ChatState` is small and stable, but it is a private-ish
seam and it can move.

---

## 6. Components — replacing bits-ui

Requirement is narrower than it looks: `ModelPicker` needs **keyboard nav, roving focus,
selection and a dialog**, _not_ filtering (`shouldFilter={false}`; filtering is ours).

| Package             | Version | Published  | Weekly DL | Assessment                                                                                                                                                                                                                                       |
| ------------------- | ------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`@ark-ui/solid`** | 5.38.1  | 2026-08-07 | 45k       | **Recommended.** chakra-ui org. Same version, same day as `@ark-ui/react` (946k) and `@ark-ui/vue` (22k) — Solid is a first-class target of a shared Zag.js core, not a side port. Low adoption is Solid's, not the library's.                   |
| `@kobalte/core`     | 0.13.12 | 2026-06-30 | 338k      | Higher adoption but **pre-1.0** with 136 open issues.                                                                                                                                                                                            |
| `corvu`             | 0.7.2   | 2025-01-24 | 1.8k      | Rejected — but **not for staleness**: its repo had a commit 2026-07-31, so it is active. It fails on **single maintainer + 1.8k weekly downloads**. _(The bead's "a year stale" wording is wrong; correcting it here rather than repeating it.)_ |

Ark UI ships every component the roadmap needs, including `combobox`, `dialog`, `listbox`,
`select` — and **`file-upload`** for M4.

**Verified by running, not by reading docs** (§7): a `ModelPicker`-shaped Ark combobox with
hand-rolled filtering, exercised through keyboard navigation.

---

## 7. Tests — "the larger half"

`@solidjs/testing-library@0.8.10` last published **2024-09-25**, which looks alarming. Its
repo had a commit 2025-09-07, it has 3 maintainers and org backing, and **198k weekly
downloads**. Stable-and-finished is a plausible reading, but it is old.

So I ran it, against the versions this repo actually uses. **Vitest 4.1.10 — the exact
version in the repo root.** Four tests, all passing:

```
 ✓ src/picker.test.tsx (4 tests) 138ms
   ✓ renders a Solid component and updates on signal change
   ✓ ark combobox: opens, keyboard-navigates and selects
   ✓ ark combobox: hand-rolled filtering narrows the list
   ✓ aria wiring is present (role/expanded), as bits-ui provided

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

This simultaneously proves §6: Ark UI's combobox does supply the keyboard nav, selection
and ARIA wiring that bits-ui supplies today, and tolerates hand-rolled filtering.

**One concrete migration cost found:** Ark's floating layer calls `@floating-ui`'s
`autoUpdate`, which needs `ResizeObserver` — absent in jsdom. First run passed the
assertions but emitted an unhandled `ReferenceError: ResizeObserver is not defined`. A
3-line stub in `setup.ts` clears it:

```
 Test Files  1 passed (1)
      Tests  4 passed (4)      (no errors)
```

Required config, both non-default:

- `resolve.conditions: ['browser', 'development']` — without it, §5's SSR-build trap makes
  every reactive test silently pass while testing nothing.
- a `ResizeObserver` stub in setup.

**Honest scope:** this proves the stack works and finds its sharp edges. It does not prove
25 test files and 15 `.svelte` stubs port cheaply. The stubs are Svelte components and must
be rewritten as `.tsx` — mechanical but not free, and genuinely the larger half.

---

## 8. Lint — an agent-written codebase needs the guardrail

`eslint-plugin-solid@0.14.5`, published **2024-12-11**, declares peer
`eslint ^6||^7||^8||^9`. This repo runs **ESLint 10.8.0** — outside the declared range.

It works anyway, via `eslint-plugin-solid/configs/typescript` under flat config. Verified
against deliberately-wrong code:

| Case                                 | Result                             |
| ------------------------------------ | ---------------------------------- |
| destructured props                   | `solid/no-destructure` — **error** |
| signal read outside a tracking scope | `solid/reactivity` — warning       |
| props read into a plain variable     | `solid/reactivity` — warning       |
| pointless `createMemo`               | not flagged                        |
| correct-code control                 | **zero false positives**           |

This matters more here than in a hand-written codebase: losing reactivity by destructuring
props is _the_ classic Solid mistake, and it is exactly what an agent trained mostly on
React will write. The plugin catches it.

**Recommendation if adopted:** raise `solid/reactivity` from warning to **error**. A
warning in an agent loop is a warning nobody reads.

**Risk:** one npm maintainer, 48 open issues, peer range already exceeded, and **npm search
finds no alternative Solid ESLint plugin**. There is no fallback if it breaks.

---

## 9. Ecosystem health

| Package                    | Version | Published  | Weekly DL | Note                      |
| -------------------------- | ------- | ---------- | --------- | ------------------------- |
| `solid-js`                 | 1.9.14  | 2026-07-01 | 3.38M     | solidjs org, 35.8k★       |
| `@solidjs/router`          | 1.0.0   | 2026-07-28 | 317k      | 1.0 reached               |
| `@solidjs/start`           | 2.0.0   | 2026-08-04 | 107k      | 4 days old; `h3` RC dep   |
| `vite-plugin-solid`        | 2.11.14 | 2026-07-27 | 682k      | healthy                   |
| `@solidjs/testing-library` | 0.8.10  | 2024-09-25 | 198k      | old but works (§7)        |
| `eslint-plugin-solid`      | 0.14.5  | 2024-12-11 | 180k      | works out of range (§7)   |
| `@ark-ui/solid`            | 5.38.1  | 2026-08-07 | 45k       | day-parity with React/Vue |
| `@ai-sdk/solid`            | 1.2.13  | 2025-05-07 | 341k      | **abandoned**             |

Solid's core is healthy. The periphery is thinner than Svelte's and, in one case that
matters to _this_ app, abandoned.

---

## 10. Rejected, in writing

- **`corvu`** — active (commit 2026-07-31), but single maintainer and 1.8k weekly
  downloads. Rejected on bus factor, **not** staleness.
- **`@kobalte/core`** — pre-1.0 with 136 open issues; Ark UI's cross-framework core is the
  safer bet at similar capability.
- **Using `@ai-sdk/solid` as published** — 15 months stale, one major behind `ai`.
- **Vendoring `@ai-sdk/solid`** — you would inherit its v1 assumptions against `ai` v7. The
  50-line `ChatState` port against current `AbstractChat` is smaller and clearer.
- **Importing Solid's `dist/*.js` directly to dodge the SSR-build trap** — tried; produces
  two reactive runtimes (§5). Export conditions are the only correct fix.
- **Relying on Ark UI for filtering** — unnecessary; the app already owns filtering and
  `shouldFilter={false}` proves bits-ui was not doing it either.

---

## 11. Tooling verdict from `house-elf-iis.1` — why this question was asked

The spike that gated this research: does agent tooling work better on Solid `.tsx` than on
`.svelte`? **Yes, decisively.**

| Tool                       | Svelte today          | Solid measured                    |
| -------------------------- | --------------------- | --------------------------------- |
| `get_symbols_overview`     | **0 symbols**         | real symbols, 9/9 files           |
| `find_referencing_symbols` | **1 of 14**           | **58/58** across 15 symbols       |
| `rename_symbol`            | **corrupts the file** | **11/11 clean**, `tsc` exit 0     |
| `get_diagnostics_for_file` | n/a                   | 9/9, matches `tsc`                |
| `safe_delete_symbol`       | n/a                   | correctly refused 3 JSX-only uses |
| codebase-memory            | **0 nodes / 0 edges** | **69 nodes, 124 edges**           |

No build step is involved — tsserver reads `.tsx` directly. There is no svelte2tsx-style
generated shim, which is structurally why the `.svelte` offset-mapping corruption has no
Solid analogue.

Two caveats recorded there: serena's "(N changes applied)" counts **files, not lines**, and
a rename issued as the first call to a cold language server edits only the declaring file
— warm it with `find_referencing_symbols` first. Neither is Solid-specific.

---

## 12. Recommendation, and what to settle first

**Solid clears every technical bar, and the agent-tooling gain is large and measured.** The
decision is not "does Solid work" — it does. It is whether owning ~50 lines of
`ChatState` against a weekly-releasing `ai` package, plus a lint plugin with one
maintainer, is a fair price for tooling that works.

For a single-user project where **an agent writes most of the code**, iis.1's numbers
(0→69 graph nodes, 1/14→58/58 references, corrupting→clean renames) are not a
marginal developer-experience gain. They are the difference between tools that work and
tools that do not.

**Two things to settle before committing**, both cheap and neither yet done:

1. SolidStart 2.0 is four days old with an RC `h3` dependency. Either wait for a patch
   release or pin and watch.
2. Confirm the Node 24 floor against the actual M6 deployment target. It did not bite
   here under bun on Node 23, but "did not bite on my laptop" is not a deployment plan.

**Not yet estimated:** the 19 components and 25 test files themselves. This research sized
the _risky_ parts — chat state, streaming, components, tests, lint. The bulk rewrite is
ordinary work whose cost is proportional to the file count, and it should be sized as its
own bead before any migration is scheduled.
