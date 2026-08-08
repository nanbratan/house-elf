# React vs Solid — comparison for the stack decision

Input to **house-elf-shi.2**. Reads
[react-migration-inventory.md](./react-migration-inventory.md) (house-elf-shi.1) and
[solid-migration-inventory.md](./solid-migration-inventory.md) (house-elf-iis.2) against
each other and states where they agree, where they genuinely differ, and what each is
betting on.

**What this document is, honestly.** It is an analysis of two research documents. It ran
nothing and re-verified none of their registry figures or spike output. Every empirical
claim below is inherited from one of the two inventories and is only as good as that
inventory. Where the two disagree in kind — one ran code, the other did not — that is
itself a finding and is called out rather than averaged away.

---

## 1. The finding that reframes the question

**The agent-tooling gain is a `.tsx` gain, not a Solid gain.**

house-elf-iis.1's numbers are the strongest single argument in the Solid inventory:

| Tool                       | Svelte today   | Solid `.tsx` measured |
| -------------------------- | -------------- | --------------------- |
| `get_symbols_overview`     | 0 symbols      | real symbols, 9/9     |
| `find_referencing_symbols` | 1 of 14        | 58/58                 |
| `rename_symbol`            | corrupts file  | 11/11 clean           |
| codebase-memory            | 0 nodes/0edges | 69 nodes / 124 edges  |

The inventory states the mechanism itself: _"No build step is involved — tsserver reads
`.tsx` directly. There is no svelte2tsx-style generated shim, which is structurally why
the `.svelte` offset-mapping corruption has no Solid analogue."_

That mechanism is tsserver reading plain TypeScript with JSX. **Nothing in it is specific
to Solid.** React components are also `.tsx` files that tsserver reads directly, with no
generated shim — with strictly better type-definition maturity behind them. So iis.1
measured _Svelte vs `.tsx`_, and both candidates are on the winning side of it.

**Consequence: the epic's stated purpose is satisfied by either choice.** The decision
therefore turns entirely on the remaining axes — and on those, the two are not close.

---

## 2. Where they agree (no decision content)

Both inventories independently reached these, so they are not differentiators:

| Item                                           | Both say                                          |
| ---------------------------------------------- | ------------------------------------------------- |
| `markdown.ts`, `model-*.ts`, `tool-state.ts`   | Port verbatim; zero framework coupling            |
| `StickToBottom`                                | Hand-port; reject the third-party equivalent      |
| `ModelPicker`                                  | Rewrite; the app already owns filtering/ranking   |
| bits-ui's contribution                         | Smaller than it looks — no filtering logic in it  |
| The bits-ui `derived_inert` `setTimeout` hack  | Disappears on migration, either way               |
| The test suite                                 | The larger half of the work, and not mechanical   |
| Shiki at 91% of client JS, markdown re-parsing | Framework-independent; neither migration fixes it |

The per-file verdicts are near-identical. **The bulk-rewrite cost is a wash.**

---

## 3. Where they differ

### 3.1 The chat client — inverted risk

|             | React                                                 | Solid                                                                   |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Package     | `@ai-sdk/react` 4.0.61, published 2026-08-07, 7.2M/wk | `@ai-sdk/solid` 1.2.13, published **2025-05-07**, one major behind `ai` |
| Status      | First-party, current                                  | **Abandoned**                                                           |
| Consequence | Adopt                                                 | Own ~50 lines of `ChatState` against a weekly-releasing `ai`            |

Solid's answer is credible — the port was written and run, streaming, status transitions
and abort all verified, and the fine-grained reactivity measured better than Svelte's.
But it is a permanent liability on a private-ish seam (`AbstractChat`'s `ChatState`) in a
package that ships weekly. React has no equivalent exposure.

React carries its own version trap here, and it is sharp but bounded: `@ai-sdk/react`
pins `ai` **exactly**, so `apps/web`'s `ai` must move to that exact version in the same
commit or a second `ai` nests in the bundle (house-elf-p7p — connects, produces nothing,
no error). That is a one-time rule plus a cheap CI guard, not ongoing ownership.

### 3.2 Free UI surface — the largest asymmetry in the two documents

React's `ai-elements`: 48 Apache-2.0 `.tsx` files copied into the repo, covering
`prompt-input.tsx` (~1,400 LOC with attachments, paste-to-attach, drag-drop),
`attachments.tsx` (**M4**), `sources.tsx` / `inline-citation.tsx` (RAG, **M4**),
`confirmation.tsx` (HITL, **M5**), `agent/plan/task/chain-of-thought` (**M3**).

Solid's equivalent is Ark UI — _primitives only_. Its answer to the roadmap is
essentially "nothing planned requires a component Solid lacks", which is true and is a
lower bar: the M3–M5 surface remains ours to write.

Cost of the React side, measured in that inventory: a ~28-reference token rename so our
`@theme` supersets shadcn's vocabulary, after which copied components render unedited.
The silent-failure trap (`bg-muted` compiling against our text colour) is real but is
fixed once, up front, and is reviewable.

**This is the single biggest delta between the two documents, and it grows with the
roadmap rather than shrinking.**

### 3.3 Meta-framework maturity

|                  | React Router 8               | SolidStart 2.0                                      |
| ---------------- | ---------------------------- | --------------------------------------------------- |
| Published        | 2026-07-22                   | **2026-08-04 — four days old**                      |
| Deps             | Stable                       | `h3 ^2.0.1-rc.26` — **an RC inside a stable major** |
| Field experience | 50.9M/wk, Shopify-backed org | None, ours or anyone's                              |
| Node floor       | ≥22.22.0                     | Declares **24+**; spiked on 23.10.0 under Bun       |

SolidStart's three hard requirements — SSR, unbuffered SSE, abort forwarding — were
verified by running them, which React's were not. That is real credit to the Solid work.
It does not offset four days of age plus an RC dependency plus an unvalidated Node floor
against the M6 deployment target.

### 3.4 Lint and the single points of failure

Solid depends on `eslint-plugin-solid`: one npm maintainer, last published 2024-12-11,
peer range already exceeded by the repo's ESLint 10, **and no alternative exists on npm**.
The Solid inventory is explicit that there is no fallback if it breaks.

It also explains why that plugin is load-bearing rather than nice-to-have: destructuring
props silently kills reactivity, and _"it is exactly what an agent trained mostly on React
will write."_ **In an agent-authored repo, that sentence is an argument against Solid on
its own terms** — the failure mode is silent, the guardrail is single-maintainer and
out-of-range, and the author of most of the code is precisely the population that makes
the mistake.

React's equivalents (`eslint-plugin-react-hooks`, `@testing-library/react` at 18
maintainers) are not close to that risk profile.

### 3.5 Reactivity model — Solid's genuine win

Solid's model is the closer relative of Svelte 5 runes. `$state`→`createSignal`,
`$derived`→`createMemo`; `expansion.svelte.ts` already takes an accessor and returns a
getter-object, so its consumer is _unchanged_. React needs those four state modules
re-thought into hooks (the accessor thunk becomes a value, `onMount` becomes
`useEffect`).

The measured streaming behaviour favours Solid too: over 6 tokens, the message-list
structure effect ran 3 times and the untouched user message 2, i.e. token deltas do not
invalidate siblings.

Weigh it against React's own inventory §11: the app's performance ceiling is
`Markdown` re-parsing the whole accumulated string per token, plus 265 KB gzipped of
Shiki. **The framework delta is noise next to those**, and both are unfixed either way.
Solid's advantage here is real and small; the React Compiler narrows it further.

### 3.6 Evidence quality — the asymmetry cuts both ways

The Solid inventory ran four spikes and found two traps that would each have eaten a day
(the `structuredClone` aliasing bug; `solid-js` resolving to the SSR no-op build, fixable
only via export conditions). The React inventory ran nothing and admits it, flagging that
**neither meta-framework was verified under Bun in this workspace** and that chunk 1 must
be "hello world builds under Bun".

So Solid is better de-risked _as researched_, while React is on far better-trodden ground
_in the world_. The React unknown is a first-day, loudly-failing question; Solid's
unknowns are long-tail and silent. Do not read Solid's superior spike work as superior
odds.

---

## 4. Scorecard

Weighted for what this project is: single-user, no deadline, **most code written by an
agent**, roadmap through M6.

| Axis                                  | React | Solid | Note                                                         |
| ------------------------------------- | :---: | :---: | ------------------------------------------------------------ |
| Agent tooling vs Svelte today         |  ✅   |  ✅   | Tie — it is a `.tsx` win (§1)                                |
| Chat client                           |  ✅   |  ⚠️   | First-party vs ~50 self-owned lines forever                  |
| Free UI for M3–M5                     |  ✅   |  ❌   | `ai-elements` vs primitives only                             |
| Meta-framework maturity               |  ✅   |  ⚠️   | 8.3.0 vs 4-day-old 2.0.0 with an RC dep                      |
| Lint guardrail                        |  ✅   |  ⚠️   | Solid's is single-maintainer with no alternative             |
| Agent's training-data density         |  ✅   |  ❌   | Solid's classic mistake is what a React-trained agent writes |
| Closeness to Svelte 5 runes           |  ⚠️   |  ✅   | Signals port near-mechanically                               |
| Streaming reactivity                  |  ⚠️   |  ✅   | Real, but dwarfed by Shiki + markdown re-parse               |
| Bulk rewrite cost (19 comps/25 tests) |  ➖   |  ➖   | A wash; React's stub layer shrinks by ~12 files              |
| De-risked by spikes                   |  ❌   |  ✅   | React verified nothing; Bun build is chunk 1                 |

---

## 5. Recommendation

**React**, with React Router 8 or TanStack Start still open.

The reasoning in one paragraph: the tooling problem that motivated this epic is solved
identically by both, so it drops out of the decision. What is left is a package the app
depends on for its core feature being first-party on one side and abandoned on the other;
roughly 1,400 LOC of Composer plus most of the M4/M5 surface arriving free on one side
and not the other; a five-year-old meta-framework versus a four-day-old one with an RC
dependency; and — decisively for a repo where an agent writes the code — a reactivity
model whose signature failure is silent, whose guardrail has one maintainer and no
alternative, and whose failure mode is _the exact thing a React-trained model types by
reflex_. Solid's wins (signal-shaped state ports, finer streaming updates) are real but
land on axes this app is not limited by.

**Choose Solid instead if** the priority is minimising the _rewrite_ rather than the
_ongoing_ cost, and owning `ChatState` is judged a fair price for that — the Solid
inventory makes that case honestly and it is not unreasonable.

## 6. What to settle before chunking either

1. **Meta-framework** (React path) — React Router 8 for boundary familiarity vs TanStack
   Start for typed routing. The React inventory declines to decide this unilaterally, and
   every other decision in it is framework-agnostic within React.
2. **Bun** — "hello world builds and dev-serves under Bun in this workspace" must be
   chunk 1. Unverified for both candidates.
3. **Coverage thresholds during the transition** — 80/75 fails a half-ported workspace
   from its first commit. This dictates how chunks are cut, so it precedes chunking.
4. **`ai` version pinning** (React path) — bump to exactly the version `@ai-sdk/react`
   pins, in the same commit, plus a CI guard for a single resolved `ai`.
5. **User-visible changes needing sign-off** — `FilterSelect` becoming a checkbox menu;
   the `tsx`-in / `svelte`-out grammar swap at +13 KB gzipped.
