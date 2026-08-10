# ai-elements — vendored catalogue

**Mostly reference material — but five of these files are imported directly by the app.**

Most components here are read, then copied _out_ of this directory and edited as our own
under `lib/components/`. The snapshot exists so `claude-context` can index it and an agent
can see what ai-elements already offers before hand-rolling a replacement.

Five are imported as they stand, pending graduation under the `house-elf-2la` epic:
`conversation` (MessageTranscript), `reasoning` and `tool` (MessagePart), `model-selector`
(ModelPicker, ModelRow, PinnedSection), `prompt-input` (Composer). Those are in the
typecheck program and ship in the bundle, unlike the rest — `tsconfig.json`'s
`exclude` only drops this directory from the root file set, it does not shield files
reachable through an app import.

The directory is excluded from every quality gate — `eslint.config.js`, `.prettierignore`,
coverage — so `bun run lint` and `bun run format` will not report on it. It is also
excluded from the `codebase-memory` index, so `search_graph` and `trace_path` silently
under-report any caller that lives here; use serena to confirm a symbol's real callers
before acting on a graph result. Keep files byte-identical to upstream so the next refresh
diffs cleanly; where that proves impossible, record the divergence under Layout.

## Provenance

| | |
| --- | --- |
| Source registry | `https://elements.ai-sdk.dev/api/registry/registry.json` |
| Per-component endpoint | `https://elements.ai-sdk.dev/api/registry/<name>.json` |
| shadcn endpoint | `https://ui.shadcn.com/r/styles/new-york-v4/<name>.json` |
| ai-elements version | 1.9.0 |
| Snapshot taken | 2026-08-08 |
| Licence | Apache-2.0 (Vercel) |

Fetched straight from the registry, not with the `ai-elements` CLI: that package's whole
job is to shell out to `shadcn@latest add`, which assumes a Next.js project with shadcn
already initialised. Neither is true here.

To refresh: re-fetch every `items[]` entry of type `registry:component` from the index,
writing each `files[].content` to `<name>.tsx`, then walk the `registryDependencies` that
are not themselves ai-elements components and pull those from the shadcn endpoint into
`ui/`.

Skip `shimmer` and `plan` when you do: shadcn's `shimmer` CSS utility covers what they
need, `reasoning.tsx` imports `Shimmer` from `../../ui/shimmer.tsx` accordingly, and
taking upstream's versions puts the `motion` dependency back.

## Layout

- `*.tsx` — the 46 ai-elements components.
- `ui/*.tsx` — the 25 shadcn components they depend on, pulled transitively so that no
  file here references a component missing from the snapshot.

The tables below describe upstream, so they still list components and dependencies this
snapshot does not carry.

Import paths are upstream's and are **not** rewritten: `@/registry/default/ui/button` and
`@/registry/new-york-v4/ui/textarea` both mean `ui/button.tsx` and `ui/textarea.tsx` here,
and `@/lib/utils` means shadcn's `cn` helper. Fix them up when you copy a file out.

The tables below are what later chunks need in order to know what a component drags in —
`conversation` pulls `use-stick-to-bottom`, `message` pulls `streamdown`, `model-selector`
pulls `command`, which pulls `cmdk`.

## Dependencies

| Component | npm dependencies | registry dependencies |
| --- | --- | --- |
| `agent` | `ai`, `lucide-react` | `accordion`, `badge`, `code-block` |
| `artifact` | `lucide-react` | `button`, `tooltip` |
| `attachments` | `ai`, `lucide-react` | `button`, `hover-card` |
| `audio-player` | `ai`, `media-chrome` | `button`, `button-group` |
| `canvas` | `@xyflow/react` | — |
| `chain-of-thought` | `@radix-ui/react-use-controllable-state`, `lucide-react` | `badge`, `collapsible` |
| `checkpoint` | `lucide-react` | `button`, `separator`, `tooltip` |
| `code-block` | `lucide-react`, `shiki` | `button`, `select` |
| `commit` | `lucide-react` | `avatar`, `button`, `collapsible` |
| `confirmation` | `ai` | `alert`, `button` |
| `connection` | `@xyflow/react` | — |
| `context` | `ai`, `tokenlens` | `button`, `hover-card`, `progress` |
| `controls` | `@xyflow/react` | — |
| `conversation` | `ai`, `lucide-react`, `use-stick-to-bottom` | `button` |
| `edge` | `@xyflow/react` | — |
| `environment-variables` | `lucide-react` | `badge`, `button`, `switch` |
| `file-tree` | `lucide-react` | `collapsible` |
| `image` | `ai` | — |
| `inline-citation` | `lucide-react` | `badge`, `carousel`, `hover-card` |
| `jsx-preview` | `lucide-react`, `react-jsx-parser` | — |
| `message` | `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `ai`, `lucide-react`, `streamdown` | `button`, `button-group`, `tooltip` |
| `mic-selector` | `@radix-ui/react-use-controllable-state`, `lucide-react` | `button`, `command`, `popover` |
| `model-selector` | — | `command`, `dialog` |
| `node` | `@xyflow/react` | `card` |
| `open-in-chat` | `lucide-react` | `button`, `dropdown-menu` |
| `package-info` | `lucide-react` | `badge` |
| `panel` | `@xyflow/react` | — |
| `persona` | `@rive-app/react-webgl2` | — |
| `plan` | `lucide-react` | `button`, `card`, `collapsible`, `shimmer` |
| `prompt-input` | `ai`, `lucide-react`, `nanoid` | `command`, `dropdown-menu`, `hover-card`, `input-group`, `select`, `spinner`, `tooltip` |
| `queue` | `lucide-react` | `button`, `collapsible`, `scroll-area` |
| `reasoning` | `@radix-ui/react-use-controllable-state`, `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `lucide-react`, `streamdown` | `collapsible`, `shimmer` |
| `sandbox` | `ai`, `lucide-react` | `collapsible`, `tabs`, `tool` |
| `schema-display` | `lucide-react` | `badge`, `collapsible` |
| `shimmer` | `motion` | — |
| `snippet` | `lucide-react` | `input-group` |
| `sources` | `lucide-react` | `collapsible` |
| `speech-input` | `lucide-react` | `button`, `spinner` |
| `stack-trace` | `@radix-ui/react-use-controllable-state`, `lucide-react` | `button`, `collapsible` |
| `suggestion` | — | `button`, `scroll-area` |
| `task` | `lucide-react` | `collapsible` |
| `terminal` | `ansi-to-react`, `lucide-react` | `button` |
| `test-results` | `lucide-react` | `badge`, `collapsible` |
| `tool` | `ai`, `lucide-react` | `badge`, `collapsible`, `code-block` |
| `toolbar` | `@xyflow/react` | — |
| `transcription` | `@radix-ui/react-use-controllable-state`, `ai` | — |
| `voice-selector` | `@radix-ui/react-use-controllable-state`, `lucide-react` | `button`, `command`, `dialog`, `spinner` |
| `web-preview` | `lucide-react` | `button`, `collapsible`, `input`, `tooltip` |

| shadcn component | npm dependencies | registry dependencies |
| --- | --- | --- |
| `accordion` | `radix-ui` | — |
| `alert` | — | — |
| `avatar` | `radix-ui` | — |
| `badge` | `radix-ui` | — |
| `button` | `radix-ui` | — |
| `button-group` | — | `button`, `separator` |
| `card` | — | — |
| `carousel` | `embla-carousel-react` | `button` |
| `collapsible` | `radix-ui` | — |
| `command` | `cmdk` | `dialog` |
| `dialog` | `radix-ui` | — |
| `dropdown-menu` | `radix-ui` | — |
| `hover-card` | `radix-ui` | — |
| `input` | — | — |
| `input-group` | — | `button`, `input`, `textarea` |
| `popover` | `radix-ui` | — |
| `progress` | `radix-ui` | — |
| `scroll-area` | `radix-ui` | — |
| `select` | `radix-ui` | — |
| `separator` | `radix-ui` | — |
| `spinner` | `class-variance-authority` | — |
| `switch` | `radix-ui` | — |
| `tabs` | `radix-ui` | — |
| `textarea` | — | — |
| `tooltip` | `radix-ui` | — |
