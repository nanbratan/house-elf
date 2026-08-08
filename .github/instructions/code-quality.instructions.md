---
description: 'Use for any work in this repo. The working agreement: verify claims empirically, finish green, and capture new conventions as they are agreed.'
applyTo: '**'
---

# Working agreement

Kept short deliberately — this file loads on every request. Detail lives in
[testing.instructions.md](./testing.instructions.md) and
[typescript.instructions.md](./typescript.instructions.md).

## Prove it, do not assert it

Do not tell the user something works because it should. Run it, curl it, open it in a
browser, and show the output.

- "The tests pass" means you ran them and are quoting the result.
- A UI change is verified in a browser. An HTTP 200 is not evidence the page renders.
- When the user says something is broken and your evidence says otherwise, reproduce
  their exact steps before disagreeing — check the working directory, the command,
  and the file on disk.
- Never state a fact about a dependency from memory. Read the installed source or its
  embedded docs.

## Finish green, per task

`bun run verify:fast` must pass before every commit. It runs the pre-commit hook's
checks — format, lint, types, and only the tests that import your changed files —
scoped to what the commit contains, so it costs seconds.

Do not run the full `bun run verify` routinely. The pre-push hook already runs that
gate, decomposed per workspace and skipping what your change cannot have broken, and
CI runs it unscoped after that. Reach for it by hand only when you have reason to
think something outside your changed files broke — a dependency bump, a config
change, a moved file.

Restore any mutation or debug edit before committing; check the diff for leftovers.

## Commits

Conventional commits (`feat:`, `fix:`, `chore:`, `test:`). One commit per completed
task, not one per milestone. A bug-fix commit contains the failing test that
reproduces it.

## Stop at the task boundary

One task at a time. Stop after each for review and commit. Close it in Beads
(`bd close <id>`) as you finish it, not in a batch at the end.

## Ask rather than guess

On anything user-visible, or where an issue is ambiguous, ask. A wrong guess costs
more than a question.

## Believe the packages

If an issue contradicts what an installed package does, the package is right. Correct
the issue with `bd update <id>` in the same change.

## Capture what you are taught

When the user corrects your approach, states a preference, or tells you how something
should be done in this repo — that is a convention, not a one-off. Propose it as an
edit to the matching instructions file so the next session does not need the same
conversation. See the `capture-convention` skill for how.

Propose the wording and wait for approval. Do not write it silently.
