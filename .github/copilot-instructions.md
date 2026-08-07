# GitHub Copilot Instructions

## Finding code — hard rule

Never search this repository with `grep`, `rg`, `find`, `glob`, or by opening files to
look around. Two tools answer every search:

- **You can name the symbol** → serena: `find_symbol`,
  `find_referencing_symbols`, `find_declaration`, `find_implementations`.
  Authoritative for references, and the only tool that edits.
- **You can only describe it** → claude-context `search_code`. Requires local Milvus:
  `cd ~/.context/milvus && docker compose up -d`.

Read a file only once a tool has told you which one, and read the smallest part of it
that answers the question.

Two limits, so do not ask these tools to cover them:

- `get_symbols_overview` on a `.svelte` file returns markup, not symbols. To see what
  a component contains, open that file.
- Neither tool proves an export is unused — a `.svelte` usage is easy to miss.
  `bun run check` is the arbiter before any delete, rename, or signature change.

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
