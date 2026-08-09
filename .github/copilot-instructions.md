# GitHub Copilot Instructions

## Finding code — hard rule

Four tools, one decision tree — walk it in order for every question about this
codebase:

1. **The question is vague — you don't know exactly what you're looking for**, e.g.
   "where is auth handled" rather than "where is `handleAuth` used" → **claude-context**.
   Semantic search over the already-indexed repo; it matches meaning, not exact
   names or patterns. Requires local Milvus running:
   `cd ~/.context/milvus && docker compose up -d`.
2. **The question is a specific lookup, not a modification.** Two branches:
   - **Structural or cross-cutting questions** — architecture, module structure,
     complexity/hotspot signals, a call trace across repos/services, dead code,
     impact/blast-radius analysis, cross-service HTTP/async links, or anything else
     the persisted knowledge graph is built for → **codebase-memory**. Its
     call/usage edges are confidence-scored, not exact — confirm with serena before
     acting on one.
   - **Anything else** — you know or can pattern-match the symbol's name and want
     its exact declaration, references, or implementations in this repo →
     **serena**. LSP-backed, so the answer is exact, not inferred.
3. **You want to make a modification** — rename, delete, insert, or rewrite a
   symbol → **serena**, always. It is the only one of the four allowed to write
   code.
4. **Only once 1–3 have genuinely been tried and none of them answer the
   question** → fall back to opening/reading/editing files directly, or bash
   commands (`grep`/`rg`/`find`/`glob` included). This is the last resort, not a
   shortcut.

Read a file only once a tool has told you which one, and read the smallest part of it
that answers the question.

None of these prove an export is unused — a JSX-only usage is easy to miss. `bun run
check` is the arbiter before any delete, rename, or signature change.

## Issue tracking

This repository uses **Beads (bd)** for issue tracking.

## Core Workflow

- Use `bd ready` to find unblocked work
- Use `bd create` to track new work
- Use `bd update <id> --claim` before starting
- Use `bd close <id>` when work is complete
- Treat commit, push, and Dolt remote sync as policy-controlled handoff actions
- Do not commit, push, or run Dolt remote sync unless explicitly authorized

## Context Loading

Run `bd prime` for the full workflow context.

If the Beads Copilot plugin is installed, Copilot CLI will automatically run
`bd prime` on session start and before compaction.
