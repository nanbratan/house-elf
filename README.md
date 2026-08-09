# house-elf

A personal AI assistant platform. Not a product, not a SaaS — a single-user
substrate that makes it cheap to add a new specialised agent whenever a new
personal need shows up.

```
┌──────────────────────────────────────────────┐
│  apps/web — TanStack Start + React + Tailwind│
│                                              │
│  • Conversation list page                    │
│  • Conversation / new-conversation page      │
│  • @ai-sdk/react Chat  ← SSE stream          │
│  • Server routes = thin proxy (auth later)   │
└───────────────────┬──────────────────────────┘
                    │ HTTP + SSE (AI SDK stream protocol)
┌───────────────────▼──────────────────────────┐
│  apps/server — Mastra (Hono, run under Bun)  │
│                                              │
│  • Agents, tools, durable workflows          │
│  • Memory (history, working, semantic recall)│
│  • chatRoute() from @mastra/ai-sdk           │
│  • Studio on :4111 during dev                │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│  Postgres 17 + pgvector  (Docker)            │
│                                              │
│  memory · workflows · observability · scores │
│  schedules · threadState · vectors           │
└──────────────────────────────────────────────┘
```

The value is in the substrate, not any single agent. Adding an agent should be
"an agent plus its tools" and nothing more — if it requires touching the chat UI's
core rendering, the substrate is wrong.

The diagram is the target. Workflows, semantic recall and the specialised agents are
planned, not built — `bd ready` shows where the work actually is.

### Why there is no third "backend" service

Mastra **is** the backend. Its Hono-based server persists conversations, threads,
messages, working memory, workflow snapshots, traces and schedules through its
storage adapters, and `registerApiRoute()` covers any non-agent endpoint we need,
such as file upload or PDF download.

A separate API service would mean two deploy units, two sets of database access and
a synchronisation problem, for no benefit at this scale. **Do not add one.**
TanStack Start's server routes exist only as a thin proxy, so a session cookie can be
attached later and the Mastra origin kept off the public internet. They contain no
business logic.

## Layout

```
house-elf/
├─ apps/
│  ├─ web/                 # TanStack Start app
│  └─ server/              # Mastra app
│     └─ src/mastra/
│        ├─ index.ts       # Mastra instance: storage, agents, server
│        ├─ agents/
│        ├─ tools/
│        └─ middleware/
├─ packages/
│  └─ shared/              # Zod schemas + TS types shared by web and server
├─ infra/
│  └─ docker-compose.yml   # postgres + pgvector
├─ .agents/skills/         # mastra, beads
└─ .github/instructions/   # how code in this repo is written and tested
```

`packages/shared` starts nearly empty. Something goes there only once it is genuinely
needed by both sides — typically Zod schemas for tool inputs the UI also renders.

## Scope

**In scope:** conversation list, streaming chat with tool-call and reasoning display,
per-agent memory, a menu agent, a CV agent with PDF export, one non-trivial workflow,
local Docker dev, single-VPS deploy, basic auth.

**Out of scope for now:** multi-user, mobile, voice, browser automation,
message-platform integrations, evals in CI, multi-agent networks. Several are
interesting and the architecture must not preclude them — but they are not built
until there is a real need.

## Planning

Work is tracked in [Beads](https://github.com/gastownhall/beads), not in documents.
`bd ready` shows what is available, `bd show <id>` explains a piece of work, and
`bd list --all --type decision` is where technology choices and their rejected
alternatives are recorded.

## Running it

Requires [Bun](https://bun.sh) and Docker.

```bash
bun install                 # also installs the git hooks
cp .env.example .env        # then fill it in
bun run dev:all             # database, then both servers
```

`bun run dev` starts the two app servers and assumes the database is already up;
`dev:all` is `db:up && dev`. Neither runs the apps in Docker — only Postgres lives
there, so hot reloading works normally.

## Ports

| Port   | What                      | Notes                                         |
| ------ | ------------------------- | --------------------------------------------- |
| `5173` | TanStack Start dev server | The UI.                                       |
| `4111` | Mastra                    | Studio at `/`, agent API at `/api`.           |
| `5432` | Postgres                  | Dev data. Persisted in a named volume.        |
| `5433` | Postgres                  | Integration tests. In tmpfs — resets on stop. |

## Commands

| Command               | Does                                                       |
| --------------------- | ---------------------------------------------------------- |
| `bun run dev`         | Both app servers, prefixed output.                         |
| `bun run dev:all`     | Waits for the database to be healthy, then `dev`.          |
| `bun run verify:fast` | The pre-commit gate, scoped to what changed. Seconds.      |
| `bun run verify`      | The full gate: types, lint, format, tests, builds.         |
| `bun run test`        | Unit, integration and component tests, with coverage.      |
| `bun run test:e2e`    | Playwright. Starts its own dev server.                     |
| `bun run db:up`       | Both Postgres containers, waiting for their health checks. |
| `bun run db:down`     | Stops them. The test database's data is gone.              |

Run `verify:fast` before a commit. The full `verify` is unscoped and slow; a pre-push
hook runs the equivalent work per workspace and CI runs it again, so it rarely needs
running by hand.

Use `bun`, never `npm`, `pnpm` or `yarn`.
