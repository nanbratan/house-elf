# house-elf — agent instructions

Personal AI assistant platform: SvelteKit chat UI → Mastra agent server → Postgres +
pgvector. Single user, no deadline. [README.md](README.md) describes the architecture.

## Where the rules are

Do not look for rules in this file. They live in `.github/instructions/`, which loads
automatically in VS Code — read the files directly if your tool does not:

| File                           | Governs                                               |
| ------------------------------ | ----------------------------------------------------- |
| `code-quality.instructions.md` | Verification, scope, workflow. Applies to everything. |
| `typescript.instructions.md`   | Types, errors, comments, placement, Mastra, Svelte.   |
| `react.instructions.md`        | Composition, render posture, hooks, JSX, TanStack.    |
| `testing.instructions.md`      | What a test may assert, mocking limits, coverage.     |

They are the working agreement, not suggestions. When the user teaches you a new one,
capture it with the `capture-convention` skill rather than replying "noted".

## Where the work is

Beads, not documents. `bd prime` for the workflow, `bd ready` for what is available,
`bd list --all --type decision` for why a technology was chosen.

An issue is meant to carry its own context: what to build, which files, how you will
know it works. If it does not, that is a defect in the issue — say so and ask, rather
than improvising the missing half.
