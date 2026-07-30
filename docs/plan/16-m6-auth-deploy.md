# M6 — Auth & Deployment

**Goal:** The stack runs on a small VPS, reachable over HTTPS at a real domain, with
only you able to log in.

**Critical constraint:** by this point the app holds your career history, health
data, and food logs, and has API keys with real spend attached. Do not expose it
without auth. Do not treat this milestone as optional polish.

---

## Part A — Auth

### T6.1 — Choose the mechanism

Single user, so the requirement is "keep everyone else out", not "identity management".

**Recommended:** Better Auth with a passkey (WebAuthn) as the only credential.
Passkeys mean no password to leak, no reset flow to build, and they are a genuinely
modern thing to play with. Better Auth also has a documented Mastra integration
(`docs/server/auth/better-auth.md`), so the same session works on both sides.

**Acceptable simpler fallback** if passkeys prove fiddly: a single long random
bearer token in an httpOnly cookie, set by a login page that checks one env-var
secret. Ugly but adequate for one user. Mastra also ships a "Simple Auth" provider
(`docs/server/auth/simple-auth.md`) — check whether it covers this.

Do not build user registration, roles, or password reset.

### T6.2 — Enforce it in two places

1. **SvelteKit** — a `hooks.server.ts` handle that rejects unauthenticated requests
   to everything except the login route and static assets.
2. **Mastra** — configure Mastra's auth so the server rejects unauthenticated
   requests directly. **Do not rely solely on the proxy.** If Mastra's port is ever
   reachable, it must defend itself.

### T6.3 — Nothing to do for identity

The resource ID stays the `OWNER` constant introduced in M2. Auth here is a gate on
the front door, not an identity system — there is exactly one user and the memory
layer already has the only resource ID it will ever need.

**Do not** wire the resource ID to a session, add a users table, or introduce
per-user data partitioning. That is work for a problem you do not have.
---

## Part B — Deployment

### T6.4 — Build artifacts

- `apps/server`: multi-stage Dockerfile. Build with `mastra build`, run the output
  under Bun. Include the `typst` binary. Non-root user.
- `apps/web`: build with `@sveltejs/adapter-node`, run under Bun. Non-root user.
- Both images built for the VPS's architecture — if developing on Apple Silicon and
  deploying to an x86 VPS, either build with `--platform linux/amd64` or use an ARM
  VPS. Decide and document this.

### T6.5 — Production compose

`infra/docker-compose.prod.yml` with four services:

| Service | Notes |
|---|---|
| `caddy` | Automatic TLS via Let's Encrypt. Only service with published ports (80/443). |
| `web` | SvelteKit. Internal network only. |
| `server` | Mastra. Internal network only — **never** publish 4111. |
| `postgres` | Internal network only. Named volume. |

Additional requirements:

- Named volumes for Postgres data and generated PDFs.
- Restart policies (`unless-stopped`).
- Healthchecks; `web` and `server` depend on `postgres` being healthy.
- Secrets from a `.env` file on the host, never baked into images.
- `Caddyfile` routes the domain to `web`. Mastra Studio is **not** exposed publicly.

### T6.6 — Backups

- A cron'd `pg_dump` to a compressed file with rotation (keep ~14 dailies).
- Push the dumps off the box — cheap object storage (Hetzner Storage Box, Backblaze
  B2, S3) via `rclone` or `restic`.
- **Test a restore.** An untested backup is not a backup. Restore into a throwaway
  local Postgres and confirm the data is there.

### T6.7 — Deploy flow

- A `deploy.sh` doing: build images → push to a registry (GHCR is free) → SSH →
  pull → `docker compose up -d`. Or build on the VPS directly if it has the RAM.
- Do not build a CI/CD pipeline yet. A script you run manually is correct at this
  scale. GitHub Actions can come later if deploying becomes frequent enough to annoy.

### T6.8 — Host hardening

- SSH keys only; password auth disabled; root login disabled.
- UFW: allow 22, 80, 443. Deny everything else.
- Unattended security upgrades enabled.
- Confirm from an external machine that ports 4111 and 5432 are **not** reachable.

---

## Definition of Done

1. `https://yourdomain` serves the app with a valid certificate.
2. Visiting any route while logged out redirects to login. Logging in works.
3. From an external network, the Mastra port and the Postgres port are unreachable
   (verify with `nmap` or `nc`, not by assumption).
4. Requests directly to the Mastra service without credentials are rejected by
   Mastra itself, not just by the proxy.
5. All M1–M5 functionality works in production: streaming chat, memory across
   threads, document upload, PDF generation, the scheduled workflow.
6. `docker compose down && docker compose up -d` preserves all data.
7. A backup has been taken **and restored** successfully.
8. `bun run verify` passes, including tests asserting that unauthenticated requests
   are rejected by both the SvelteKit hook and Mastra itself.

## Notes for the executing agent

- Deploy an early milestone's state first to shake out the infrastructure, then bring
  the rest up. Debugging TLS, DNS, auth, and application bugs simultaneously is the
  worst possible ordering.
- Watch the API keys. A scheduled workflow that loops on a failure can spend real
  money. Mastra has a `CostGuardProcessor` — consider it, and set spend limits in
  each provider's dashboard regardless.
- If ops turn out to be more annoying than interesting, Mastra platform is a
  legitimate escape hatch. Nothing in this design prevents moving to it.
