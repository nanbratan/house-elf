# 01 — Decisions

Each decision records what was chosen, why, and what was rejected. If you find
yourself wanting to deviate, read the "Rejected" column first — the alternative was
probably already considered.

---

## D1 — Runtime: Bun

**Chosen:** Bun for package management, workspaces, scripts, and running the Mastra
server. Node is not installed as a fallback path.

**Why:** Fast installs, native TS execution, built-in test runner and `.env` loading,
one tool instead of four. Mastra officially supports Bun as a runtime.

**Rejected:** Node + pnpm (works, boring, slower); Deno (Mastra support is thinner,
npm interop friction not worth it).

**Risk:** Occasional Bun incompatibility with a native dependency. Mitigation: the
Docker image is the source of truth; if a package breaks under Bun, pin it or run
that one process under Node in the container. Do not restructure the project over it.

---

## D2 — Frontend: SvelteKit 2 + Svelte 5 (runes) + Tailwind 4

**Chosen:** SvelteKit with Svelte 5 runes, Tailwind CSS v4, and `@ai-sdk/svelte` for
chat state.

**Why:** `@ai-sdk/svelte` is a **first-class** binding maintained by Vercel that
handles the entire streaming surface: text deltas, `tool-call` / `tool-result` /
`tool-error` parts, reasoning parts, sources, abort, regenerate, and message
reassembly. Mastra's `@mastra/ai-sdk` emits exactly this protocol, so the two halves
meet with no glue code. Mastra also publishes an official SvelteKit guide.

**Rejected — SolidJS.** Strongly considered and genuinely appealing. The blocker:
AI SDK UI lists SolidJS support as **community-only**; there is no maintained
`@ai-sdk/solid` for v5+. Choosing Solid means hand-writing the `useChat` equivalent
on top of `readUIMessageStream` from the framework-agnostic `ai` package — roughly
150–300 lines that must correctly handle partial tool-call streaming, interleaved
reasoning, aborts, and error recovery. That is real work on the _least_ interesting
part of the project, and it is work that must be re-done every time the stream
protocol evolves. Svelte 5 runes are signal-based and share Solid's mental model
closely enough that little is lost.

**Rejected — React/Next.js.** Best ecosystem support, but explicitly not wanted.

**Note:** SvelteKit runs in SSR mode but the chat page itself is client-rendered.
Server routes are used only as a proxy (see D3).

---

## D3 — No separate application backend

**Chosen:** Mastra's own server is the only backend. SvelteKit server routes act as a
thin authenticated proxy and contain no business logic.

**Why:** Mastra's storage layer already owns threads, messages, working memory,
workflow snapshots, traces, scores, and schedules. Custom endpoints attach to the
same server via `registerApiRoute()`. A second service would duplicate DB access and
double the deploy surface.

**Rejected:** Standalone Hono/Elysia/Go API alongside Mastra. Revisit only if a
non-agent feature appears that genuinely does not belong in the agent runtime — none
is currently foreseen.

---

## D4 — Storage: PostgreSQL 17 + pgvector, single database

**Chosen:** One Postgres instance for every Mastra storage domain, plus `PgVector`
for embeddings.

**Why:** Postgres is the recommended Mastra production default and covers all
domains including `schedules`, which several adapters do not. pgvector means semantic
recall and RAG need **zero additional infrastructure**. One connection string, one
backup, one container.

**Rejected — libSQL/SQLite locally.** Zero-config and tempting, but it forces a
migration to Postgres later _and_ means local behaviour diverges from production.
Since Postgres is one line of Docker Compose, the "simplicity" saving is illusory.

**Rejected — dedicated vector DB (Qdrant/Chroma).** Better at scale; at personal
scale it is a second service for no gain.

**Deferred:** Mastra's `MastraCompositeStore` can route the high-volume
`observability` domain to ClickHouse or DuckDB. Note it exists; do not use it. A
single user does not generate enough traces to matter.

---

## D5 — Deployment: Docker Compose locally, same Compose on a small VPS

**Chosen:** `infra/docker-compose.yml` runs Postgres in dev and the full stack in
prod on a single small VPS (Hetzner CX22 class, ~€5/mo) behind Caddy for automatic
TLS.

**Why:** Mastra's most interesting capabilities — durable workflows, suspend/resume,
cron schedules, background tasks, long agent loops — all assume a **long-running
process**. A VPS gives that, plus a local Postgres on the same host, plus a dev/prod
environment that is byte-identical.

**Rejected — Cloudflare Workers.** Fights every one of the above: execution time
limits, no long-lived process, and Postgres access requires Hyperdrive. Would push
the project toward Durable Objects and away from Mastra's native model.

**Rejected — Mastra Cloud / Mastra platform.** Genuinely the least-effort option and
worth revisiting if ops become annoying. Rejected for now because the point of the
project is to understand the machinery, and because self-hosting Postgres keeps
personal data on infrastructure under your control.

**Rejected — AWS.** Most flexible, most ceremony. Nothing here needs it.

**Rejected — Kubernetes.** Two containers.

---

## D6 — LLM providers via Mastra's model router

**Chosen:** Configure Anthropic, OpenAI, and Google Gemini directly, plus OpenRouter
as a gateway for experimentation. The model is **chosen per request**, sent from the
UI, and validated against a server-side allowlist. **The chat route has no default**
— a request that names no model is rejected there, and the client owns the initial
selection. The agent itself still carries a model, because Studio reads it to
describe the agent; the route's guard runs first, so that model is never what the app
silently falls back to.

**Why:** Mastra's model router uses `"provider/model"` strings and reads standard
provider env vars, so multi-provider support is essentially free. Mastra's `Agent`
accepts `model` as either a value or a function of the request context, so choosing
per request needs no restart and no rebuild — which is the point. Comparing two
models on the same question is the common case, and an env var makes that a restart
and a lost conversation.

**What the allowlist is actually for.** Not security: anyone who can reach the route
can name the most expensive model on the list. It catches our own bugs — a
real-but-retired id that would bill silently, a provider prefix pointing at a vendor
we have not configured, and a garbage string that would otherwise fail mid-stream
instead of returning a 400 naming the alternatives. The picker needs the list either
way; enforcing it costs about twenty lines. It is enforced in middleware on `/chat/*`
rather than in the agent, because `chatRoute` passes an unrecognised body field
straight into `agent.stream()`, where `model` is a request-scoped override — see
PROGRESS.md for the proof.

**Superseded:** the original decision set model IDs per agent through environment
variables only, on the grounds that swapping a model should be "a restart rather
than a commit". Per-request selection is strictly better and Mastra supports it
natively. A later revision kept env vars as the source of per-agent defaults; that
is superseded too. A default on the request path is a second, invisible way to spend
money: a client that drops the field bills the wrong model instead of failing, and
nobody notices until the invoice. The route rejects; the picker decides what to
select first. Removing the agent's model as well went one step too far and broke
Studio, which is corrected above.

**Not doing:** Local models (Ollama / LM Studio). Confirmed not currently running
locally. Mastra can add an OpenAI-compatible provider later in a few lines; nothing
in the design blocks it.

**Mandatory:** Never hardcode a model name from memory. Run
`.agents/skills/mastra/scripts/provider-registry.mjs` to obtain valid identifiers.

---

## D7 — Memory strategy

**Chosen, layered — introduce each layer only when a milestone needs it:**

| Layer           | What it does                                           | Introduced |
| --------------- | ------------------------------------------------------ | ---------- |
| Message history | Recent turns in the thread                             | M1         |
| Working memory  | Durable structured profile, scoped per resource (user) | M2         |
| Semantic recall | Embedding search over past messages via pgvector       | M3         |
| Explicit RAG    | Ingested documents in a vector store                   | M4         |

**Why:** These solve different problems and each has a token cost. Working memory is
what makes "stop re-explaining my career to it" actually work — it is a persistent
structured document the agent maintains, not a search over chat logs. Semantic recall
handles "what did I eat on Tuesday". RAG handles "here are my five old CVs".

**Critical:** memory is scoped by `resource` (the user) and `thread` (the
conversation). This scoping is **not optional** — Mastra's memory API requires a
resource identifier on every call. Since this is a single-user system, the resource
ID is a single exported constant (`OWNER`), defined in exactly one place. That is the
minimum possible implementation, not extra machinery.

Working memory must be **resource-scoped**, not thread-scoped, so the CV agent knows
you in a brand-new conversation. Getting this wrong is the single most likely
functional bug in the project — verify it explicitly in M2.

Do **not** build session-derived resource IDs, user tables, or multi-user support.
The constant is the design.

Mastra also offers _observational memory_. Read the docs, note it, do not adopt it
before M4; it adds inference cost and its value is unclear at this scale.

---

## D8 — CV export: agent-authored Typst, compiled to PDF

**Chosen:** The CV agent writes **Typst markup**. A Mastra tool shells out to the
`typst` binary (present in the server container) and returns a PDF.

**Why:** Maximises agent autonomy — it controls layout, typography, spacing, and
section structure, not just text, so "make it more compact" or "emphasise the
leadership roles" become real capabilities. Typst compiles in milliseconds, has clean
readable syntax that LLMs handle far better than LaTeX, and produces excellent
output. No headless browser needed.

**Rejected — HTML + Playwright.** Works, but drags a ~400 MB browser into the image
for one feature, and is slower.

**Rejected — structured JSON into a fixed template.** Reliable and boring; the agent
becomes a text generator with no say in presentation.

**Rejected — LaTeX.** Heavyweight toolchain, LLMs produce more compile errors.

**Required:** the tool must return compiler errors to the agent so it can self-correct
and retry. Cap retries (3) to avoid a loop.

**DOCX:** not needed. Confirmed. Add later via the `docx` package if a recruiter asks.

---

## D9 — Validation and shared types: Zod

**Chosen:** Zod for all tool input/output schemas, shared via `packages/shared` where
the UI needs the same shape.

**Why:** Mastra's `createTool()` takes Zod schemas natively and derives the model-
facing JSON Schema from them. Using anything else means maintaining two definitions.

---

## D10 — Observability

**Chosen:** Mastra's built-in tracing written to Postgres, viewed in Mastra Studio.
`PinoLogger` for structured logs.

**Why:** Free, local, no third-party account, no data leaving the host. Studio also
gives an agent/workflow playground, which is the fastest debugging loop available.

**Rejected for now:** Langfuse / Braintrust / OTel export. Mastra has exporters for
all of them; adding one later is a config change. Not worth a service today.

---

## D11 — Linting & formatting: ESLint 9 (flat) + Prettier

**Chosen:** ESLint 9 flat config with `typescript-eslint` and `eslint-plugin-svelte`.
Prettier for formatting, with `prettier-plugin-svelte` and
`prettier-plugin-tailwindcss`. `eslint-config-prettier` to disable stylistic rules.

**Why:** This is a boring choice made for one hard reason: **nothing else can lint
`.svelte` files.** Svelte components need a dedicated parser to understand the
template, reactive statements, and rune semantics. `eslint-plugin-svelte` is the only
mature implementation.

**Rejected — oxlint.** Rust-based, 50–100× faster, and an earlier draft of this plan
chose it. It has no Svelte support. For a project that is roughly half Svelte, a
linter that ignores half the codebase is not a linter.

**Rejected — Biome.** Same problem: fast, excellent for TS/JS, no `.svelte` support.

**Rules:** enable `typescript-eslint`'s `strictTypeChecked` and `stylisticTypeChecked`
configs. Type-aware linting is slower but catches real bugs (floating promises,
unsafe `any` propagation, misused promises in event handlers) that plain syntactic
linting cannot. Given the coverage goals in D12, the extra seconds are worth it.

---

## D12 — Testing: Vitest + Playwright, with enforced coverage

**Chosen:** Vitest 4 as the single test runner across the whole monorepo (via
`projects` config), `@testing-library/svelte` on jsdom for component tests, Playwright
for E2E, and v8 coverage with enforced thresholds.

See [03-testing.md](03-testing.md) for the full strategy. Summary of the choices:

| Concern            | Tool                                    | Why                                                                                                                                                                                                           |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test runner        | **Vitest 4**                            | Shares Vite config, so aliases and plugins Just Work. Handles server, shared, and component tests in one `projects` config. Vitest 3 was planned, but it does not support the Vite 8 `apps/web` already uses. |
| Component tests    | **`@testing-library/svelte` + jsdom**   | What the official Svelte testing docs recommend. Fast, no browser download, large ecosystem, familiar API.                                                                                                    |
| E2E                | **Playwright**                          | No serious competitor. Also the home for the few assertions jsdom cannot make.                                                                                                                                |
| Deterministic LLMs | **`MockLanguageModelV2`** (`ai/test`)   | Lets agent behaviour be tested without network, cost, or flakiness. This is the key enabler for testing agents at all.                                                                                        |
| DB integration     | **Dedicated `postgres-test` container** | Real Postgres, real pgvector. Simpler and faster than Testcontainers.                                                                                                                                         |
| Coverage           | **`@vitest/coverage-v8`**               | Thresholds enforced in config; `bun run test` fails below them.                                                                                                                                               |

**Rejected — `vitest-browser-svelte`.** Runs components in real Chromium, which is
genuinely more faithful — runes, transitions, and real layout all behave correctly.
Rejected because it is a second component-testing stack for one benefit: jsdom has no
layout engine, so `scrollHeight` / `scrollTop` / `IntersectionObserver` are fake. Only
one planned test depends on that (auto-scroll respecting user scroll position), and
Playwright is already in the project for E2E. Put that single test there instead.

**Rejected — `bun test`.** Genuinely appealing: zero config, extremely fast, already
in the toolchain. Rejected because it cannot test Svelte components, which would mean
two runners, two configs, two coverage reports, and permanent ambiguity about which
command to run. One runner is worth more than the speed difference on a suite this
size. (Bun remains the package manager and server runtime — this is only about tests.)

**Rejected — Jest.** Slower, needs transform configuration, no Vite integration.

---

## D13 — TypeScript: pinned to exactly 6.0.3

**Chosen:** a single `typescript` dependency, pinned to the **exact** version
`6.0.3` (no `^`) in the root `package.json`. Used by `tsc --noEmit`,
`svelte-check`, `typescript-eslint`, and Prettier.

**Why pin exactly:** TypeScript does not follow semver. A minor bump routinely
introduces new errors through improved inference. An unpinned TS means a `bun install`
can break the build without any code changing. Upgrade deliberately, as its own commit.

**Why 6.0.3 specifically, and not `latest`:** as of 2026-07-30, `typescript@latest`
on npm is **7.0.2** — TypeScript 7 has shipped, and it _is_ the Go port, now
published under the main `typescript` package name rather than
`@typescript/native-preview`. Installing `typescript@latest` today therefore
silently swaps the compiler implementation. That is a trap, and this project must
not fall into it yet, because **the two type-aware tools this plan depends on both
refuse TypeScript 7**:

| Tool                | Version checked | Declared `typescript` peer range | Accepts 7? |
| ------------------- | --------------- | -------------------------------- | ---------- |
| `typescript-eslint` | 8.65.0          | `>=4.8.4 <6.1.0`                 | **No**     |
| `svelte-check`      | 4.7.4           | `^5.0.0 \|\| ^6.0.0`             | **No**     |

Both consume the compiler API, and the `microsoft/typescript-go` README still marks
the **API row "not ready"** and the **language service "in progress"** — which is
precisely why those peer ranges stop where they do. Type checking, emit, watch,
build mode and project references are all "done"; the _embedding_ API is not.

So `tsc` alone could be 7 today, but `bun run lint` and `bun run check` could not.
`6.0.3` is the newest release the whole toolchain agrees on, and 6.0.x is the
current stable JS-implemented compiler.

**Rejected — running both (TS 6 as the gate, `tsgo` as a fast `check:fast`).**
An earlier draft of this plan included exactly this. It means a non-authoritative
command whose diagnostics can drift from the real gate, plus another dependency to
keep aligned. On a codebase this size `tsc` is not the bottleneck. The cost is real
and the benefit is not. One compiler.

**Revisit when:** `typescript-eslint` and `svelte-check` widen their peer ranges to
admit `^7`. That is the single signal — it will only happen once the compiler API is
ready, so it subsumes watching the README. Then bump to 7 outright and get the speed
for free; it is a one-line change.

> Executing agent: before changing this pin, check the _actual published peer ranges_
> rather than the README or a blog post:
>
> ```bash
> curl -s https://registry.npmjs.org/typescript-eslint/latest | grep -o '"typescript":"[^"]*"'
> curl -s https://registry.npmjs.org/svelte-check/latest    | grep -o '"typescript":"[^"]*"'
> ```
>
> If both admit `^7`, adopt 7 as the **only** compiler and note the deviation. Do not
> run both. Do not use `typescript@latest` in the meantime — it is 7.

---

## D14 — Thinking is a per-request toggle, not a model property

**Chosen:** a single boolean, sent with the request, next to the model choice from
D6 — same argument, second parameter. The client owns it, same as the model: no
server-side default, no model that always thinks, no hidden budget the client
cannot see. A model that cannot think disables the toggle rather than hiding it, so
its absence is a fact about the model, not a silent no-op.

**Why:** the whole point of M1.6 is that nothing about generation is implicit. A
toggle that turned itself on for "smarter" models, or a fixed thinking budget picked
by the server, would be exactly the kind of default this project keeps rejecting —
see D6's "the route has no default" for the same reasoning applied here.

**Not doing:** a thinking-budget slider, a reasoning-effort dropdown, or a token
count in the UI. The boolean is the whole feature. If the budget needs tuning later,
that is a constant on the server, changed in a commit — not a client-facing control.
(A real effort-level control is now planned as its own task, M1.7's T1.7.7, once
OpenRouter models with graduated effort levels — not just on/off — are in scope.)

---

## D15 — The model catalog: live fetch from OpenRouter, not a static allowlist

**Chosen:** the picker is driven by a live fetch of OpenRouter's
`GET /api/v1/models/user` through the Mastra server, which caches it server-side
with a one-hour TTL and stale-serve on a failed refresh (the `OpenRouterCatalog`
class). There is no persisted snapshot, no client-side cache, and no hand-maintained
list. The static nine-entry Anthropic allowlist from M1.5 is gone.

**Why a live fetch replaces the allowlist.** OpenRouter fronts 337 models from 52
providers, and Mastra's model router resolves them under an `openrouter/` prefix.
Hand-typing that list, or its per-model capabilities, does not scale and goes stale
immediately — a new model ships and the picker does not know until someone edits a
file. A live fetch means the picker always reflects what OpenRouter actually
offers, including new models the day they appear.

**Why `/models/user` and not the public `/models`.** Measured live against this
account on 2026-08-04: the public `/models` returns 338 models with no key; the
`?zdr=true` filter returns 220 but drops every `openrouter/*` router (including the
default `openrouter/auto`) and 10 of 11 `~…-latest` pointers, because a router has
no endpoint of its own to carry a ZDR guarantee; `/models/user` returns 230, keeps
the routers, and applies the account's real privacy settings. It is a strict subset
of `/models` — the arithmetic is `220 zdr + 16 unfilterable (6 routers + 10
pointers) − 6 free models that log prompts`. So it needs no client-side privacy
logic at all: change a setting on the website and the picker follows without a
deploy. The trade-off is that it requires the API key to read, not just to use —
which is why `OPENROUTER_API_KEY` is `required()` in `env.ts` and the `.env.example`
billing note says so.

**Why privacy and icons were both dropped, for different measured reasons.**
Privacy: no ZDR, retention, or training flag exists on the model object or the
endpoints response — only policy _links_ and a country on `/api/v1/providers`, and
the useful status (which providers log prompts) is a human-typed table in
OpenRouter's docs with no API behind it. A badge that needs data the API does not
carry would be a hand-maintained lookup table that goes stale — the same standing
maintenance cost that got icons cut. Icons: no icon field on the model object; the
`@lobehub/icons-static-svg` route needs a hand-maintained slug mapping (about seven
aliases, about twenty providers with no icon) that goes stale as OpenRouter adds
providers; OpenRouter's own icon assets sit at an undocumented path not derivable
from the author slug (of a dozen probed live, only `Anthropic.svg` and `OpenAI.svg`
resolved). Both are text-only decisions, each with a second measured reason behind
it.

**Why there is no persisted snapshot.** OpenRouter serves the endpoint through
Cloudflare with `stale-if-error=3600`, so an origin outage is absorbed at the edge.
The only case a snapshot covers is our own server restarting offline, where
OpenRouter is also the transport and nothing can be sent anyway. A snapshot would
have meant inventing this repo's first hand-rolled table a milestone before M2
decides how tables are made. The in-memory TTL cache is enough.

**Why `openrouter/auto` is the default despite its unknowable per-message cost.**
`openrouter/auto` is deprecated in favour of `openrouter/auto-beta`, which
benchmarks far better (83.8% vs 50.0% on GPQA Diamond). OpenRouter performs the
slug swap themselves when the switch happens, so the id we hold keeps working and
gets the better router for free. Migrating now would buy the improvement earlier at
the cost of a user-visible id change made twice. Its per-message cost is the
sentinel `"-1"` — "billed at whatever the chosen model costs, unknowable in
advance" — and the thinking toggle is inert on a first visit; both accepted
knowingly. The default can never dangle, and no model id is hand-typed.

**Why settings live in a second picker (T1.7.8), not inside the model picker.**
The settings vary far too much per model to show inline the way M1.5's picker did:
`temperature` on 279 models, `reasoning_effort` on 79, `verbosity` on 11, and the
frontier models most likely to be picked have no temperature at all. A searchable
dialog over 325 models cannot live in a submenu, and the model picker is already
large. A second trigger opens a `SettingsPicker` holding thinking, effort,
temperature, verbosity, max output tokens and seed, each gated on the selected
model's own `supported_parameters`, each with an inline description, persisted per
model id. The settings trigger carries a visible summary rather than a bare icon,
because per-model persistence means switching models swaps an entire profile.

**Why the picker groups by release month, not by provider.** Decided 2026-08-04
after evaluating OpenRouter's own picker: 52 providers mostly holding one to three
community fine-tunes is a lot of menu for little payoff. Provider is a filter with
its own search box, not a two-level menu. Newest-first matches what a personal tool
is actually used for, and a flat list with a filter row is simpler to build and
keyboard-navigate.

**Why hover was rejected for the model details.** The phone is a first-class device
and has no hover. The details are behind a "More" control on the title row that
expands in place. An always-visible info line of icons was built (slice 3) and then
reversed (2026-08-06, slice 4): it overloaded the row, and the descriptive facts it
carried are already in the collapsible's settings list, context line, and price.
What stays on the row is the one thing that is a warning rather than a description:
"Cannot call tools" (65 models whose `supported_parameters` omits `tools`), as
amber text inside the collapsible.

**Why the `~…-latest` pointers are offered, not filtered.** Picking
`~anthropic/claude-opus-latest` follows Anthropic forward; picking the concrete id
stays put. Those are two different things to want. The tilde is part of the id and
must never reach the wire stripped — it is stripped for display and filtering only.
Stripping belongs in a derived display value; `~anthropic/claude-opus-latest` is the
pointer, and `anthropic/claude-opus-latest` without the tilde is not a model
OpenRouter has.

**Rejected — a Postgres snapshot of the catalog.** Covered above: the edge cache
absorbs the likely failure, and a snapshot would mean a hand-rolled table before M2.

**Rejected — privacy badges and provider icons.** Covered above: no sufficient
source for either, and both carry a standing maintenance cost.

**Rejected — `?zdr=true` as the catalog endpoint.** Drops every router including
the default; a filter that works at the endpoint level cannot see routers.

**Rejected — provider grouping in the picker.** Replaced by release-month grouping
with provider as a filter.

**Rejected — hover cards and an always-visible info line for model details.** Hover
does not exist on a phone; the info line overloaded the row.

**Rejected — migrating to `openrouter/auto-beta` now.** OpenRouter swaps the slug
themselves; migrating now means a user-visible id change made twice.
