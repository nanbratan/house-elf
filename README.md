# house-elf

A personal AI assistant. SvelteKit chat UI → Mastra agent server → Postgres + pgvector.

Single user, single machine. The plan lives in [docs/plan](docs/plan/README.md);
[docs/plan/PROGRESS.md](docs/plan/PROGRESS.md) is the source of truth for what is built.

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

| Port   | What                 | Notes                                         |
| ------ | -------------------- | --------------------------------------------- |
| `5173` | SvelteKit dev server | The UI.                                       |
| `4111` | Mastra               | Studio at `/`, agent API at `/api`.           |
| `5432` | Postgres             | Dev data. Persisted in a named volume.        |
| `5433` | Postgres             | Integration tests. In tmpfs — resets on stop. |

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
