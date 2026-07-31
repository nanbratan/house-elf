# 00 — Overview

## What we are building

`house-elf` is a **single-user personal AI assistant platform**. Not a product, not
a SaaS. The goal is a durable foundation that makes it cheap to add a new
specialised agent whenever a new personal need shows up.

Intended agents over time (only the first two are in scope for this plan):

- **Menu agent** — meal planning around workouts, remembering dietary preferences,
  dislikes, macros, and what was eaten recently.
- **CV agent** — remembers the full career history so it never has to be
  re-explained; drafts and exports tailored CVs as PDF.
- _Later, out of scope:_ research assistant, browser automation, message triage,
  home automation, scheduling.

## Core design intent

The value is in the **substrate**, not any single agent. Every milestone after M2
should be "add an agent + its tools" and nothing more. If adding the CV agent
requires touching the chat UI's core rendering, the substrate is wrong.

## Architecture

```
┌──────────────────────────────────────────────┐
│  apps/web — SvelteKit 2 + Svelte 5 + Tailwind│
│                                              │
│  • Conversation list page                    │
│  • Conversation / new-conversation page      │
│  • @ai-sdk/svelte Chat  ← SSE stream         │
│  • Server routes = thin proxy (auth later)   │
└───────────────────┬──────────────────────────┘
                    │ HTTP + SSE (AI SDK stream protocol)
┌───────────────────▼──────────────────────────┐
│  apps/server — Mastra (Hono, run under Bun)  │
│                                              │
│  • Agents (menu, cv, general)                │
│  • Tools (typst render, nutrition, etc.)     │
│  • Workflows (durable, suspendable)          │
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

### Why there is no third "backend" service

Mastra **is** the backend. Its server (Hono-based) provides persistence for
conversations, threads, messages, working memory, workflow snapshots, traces, and
schedules — all through its storage adapters. It also supports arbitrary custom API
routes via `registerApiRoute()`, so any non-agent endpoint we need (file upload, PDF
download) lives there too.

Adding a separate API service would mean two deploy units, two sets of DB access,
and a synchronisation problem — for zero benefit at this scale. **Do not add one.**

SvelteKit's server routes exist only as a thin proxy layer, so that later we can
attach a session cookie and keep the Mastra origin off the public internet. They
contain no business logic.

## Repository layout

```
house-elf/
├─ apps/
│  ├─ web/                 # SvelteKit app
│  └─ server/              # Mastra app
│     └─ src/mastra/
│        ├─ index.ts       # Mastra instance: storage, agents, workflows, server
│        ├─ agents/
│        ├─ tools/
│        ├─ workflows/
│        └─ memory/
├─ packages/
│  └─ shared/              # Zod schemas + TS types shared by web and server
├─ docs/plan/              # this plan
├─ infra/
│  ├─ docker-compose.yml   # postgres+pgvector (dev), + apps (prod)
│  └─ Caddyfile            # prod only, added in M6
├─ .agents/skills/         # mastra skill (already present)
├─ package.json            # Bun workspaces root
└─ bunfig.toml
```

`packages/shared` starts nearly empty. Only put something there once it is genuinely
needed by both sides — typically Zod schemas for tool inputs that the UI also renders.

## Scope boundaries

**In scope:** conversation list, new conversation, streaming chat with tool-call and
reasoning display, per-agent memory, menu agent, CV agent with PDF export, one
non-trivial workflow, local Docker dev, single-VPS deploy, basic auth.

**Explicitly out of scope for now:** multi-user, mobile app, voice, browser
automation, message-platform integrations, evals in CI, multi-agent networks.
Several of these are _interesting_ and the architecture must not preclude them — but
they are not built until there is a real need.
