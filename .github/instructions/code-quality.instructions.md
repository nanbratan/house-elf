---
description: 'Use for any work in this repo. The working agreement: verify claims empirically, finish green, and capture new conventions as they are agreed.'
applyTo: '**'
---

# Working agreement

Loads on every request, so it stays short. Detail is in
[testing.instructions.md](./testing.instructions.md) and
[typescript.instructions.md](./typescript.instructions.md).

## Prove it, do not assert it

Never report something works because it should. Run it and quote the output.

- "The tests pass" means you ran them and are quoting the result.
- A UI change is verified in a browser. An HTTP 200 is not evidence the page renders.
- If the user says something is broken and your evidence disagrees, reproduce their
  exact steps before saying so — check the working directory, command, and file on disk.
- Never state a fact about a dependency from memory. Read the installed source.

## Finish green

`bun run verify:fast` passes before every commit: format, lint, types, and the tests
importing your changed files, scoped to the commit. Seconds.

Do not run the full `bun run verify` routinely — the pre-push hook and CI already do.
Run it by hand only when a change reaches beyond the files it touched: a dependency
bump, a config change, a moved or deleted file.

Restore debug edits and mutation probes before committing. Read your own diff.

## Commits

Conventional commits (`feat:`, `fix:`, `chore:`, `test:`), one per completed task. A
bug-fix commit contains the failing test that reproduces it.

Never commit or push without explicit approval. Stop after each task for review;
`bd close <id>` as you finish it, not in a batch at the end. Do not start the next
issue until the current one's acceptance criteria are met and verified **by running
the app**, not by reading the code.

## Ask rather than guess

On anything user-visible, or where an issue is ambiguous, ask. A wrong guess costs
more than a question.

## Believe the packages

If an issue contradicts what an installed package does, the package is right. Correct
the issue with `bd update <id>` in the same change.

## Capture what you are taught

A correction, a stated preference, or "that is not how we do it here" is a convention,
not a one-off. Propose it as an edit to the matching instructions file and wait for
approval — the `capture-convention` skill has the wording rules. Never write it
silently, and never reply "noted" without proposing the edit.
