---
name: beads-implement
description: 'Pick up a ready Beads issue and deliver it end to end. Use when the user says "beads-implement", "/beads-implement", "do next bead", "implement the next bead", "work the next issue", "pick up bd-123", or asks to start work already tracked in Beads. Claims the issue, splits the work into reviewable commits, stops for human review at every commit, sanity-checks with a cheap model, and finishes green.'
---

# Implement a bead

Take one issue from Beads and deliver it. The user should be able to open a fresh
window, run this, and watch it land without steering.

## Step 1 — Take the work

If the user named an issue, use it. Otherwise:

```bash
bd ready
```

Pick the **highest-priority ready issue** (P0 first). Bugs outrank features at equal
priority. If the top candidates are genuinely equivalent, ask rather than guess.

```bash
bd show <id>
bd update <id> --claim
```

Read the issue **and its parent epic** — the epic holds the _why_ and the constraints.
`bd show` on the parent is cheap and usually decisive.

## Step 2 — Check the issue is actually ready

Before writing code, confirm you can answer:

- What exactly am I building?
- Which files do I touch? (the issue should name them — if not, that is a defect)
- How will I know it works?

**If the issue cannot answer these, stop.** Do not improvise the missing half.
Report what is missing and ask the user whether to run `/beads-plan` on it instead.
Guessing here produces the wrong thing and poisons the issue for the next session.

**If the issue contradicts the code**, the code wins. Say so, and fix the issue text
in the same session. The plan was written earlier; reality is now.

## Step 3 — Plan the commits before writing anything

Decide up front how the work splits. **Each commit is one reviewable idea.**

Good splits:

- a refactor that changes no behaviour, then the behaviour change on top
- schema/types, then the logic using them, then the UI
- the failing test, then the fix (mandatory for bugs — see below)

Bad splits: "part 1 / part 2" with no meaning; anything that leaves the repo red.

**Every commit must stand on its own**: it compiles, tests pass, and it makes sense in
`git log` without the next one. If a split cannot meet that bar, it is one commit.

State the plan to the user before starting — one line per commit. Small issues are
often a single commit, and that is fine; do not manufacture splits.

**A bug fix starts with a failing test.** Write the test, watch it fail for the right
reason, then fix it. A fix without a test that would have caught it is not done.

## Step 4 — Build one commit's worth

Follow the repo's working agreement:

- `.github/instructions/` is the authority on how code is written and tested.
- Never write Mastra code from memory — consult the `mastra` skill, prefer embedded
  docs in `node_modules/@mastra/*/dist/docs/`. Never invent model ids.
- Do not scaffold ahead. If this issue does not need a file, do not create it.
- Comments: question every one. Keep non-obvious _why_ and measured facts; delete
  restatements of the code and framework tutorials.
- Tests ship with the code, never deferred.

Search with `claude-context search_code` or serena — not grep/find/glob.

## Step 5 — Gate it

```bash
bun run verify:fast
```

This is the pre-commit hook, on demand: format, lint, types, and only the tests that
import your changed files. Seconds, not minutes. Use it freely as you work, and make
it pass before every commit.

Do not run the full `bun run verify` as a matter of course — it is unscoped and slow,
and the pre-push hook already runs that work decomposed per workspace, with CI
running it serially after that. Reach for it by hand only when the change could have
broken something outside the files it touched: a dependency bump, a config or build
change, a moved or deleted file.

Restore any debug edit or mutation probe, and read your own diff for leftovers:

```bash
git diff
```

## Step 6 — Cheap sanity check

Before showing the user, get a second opinion from a **cheaper model** — it costs
little and catches the obvious things you have gone blind to.

Use the `task` tool with `agent_type: "code-review"` and a small model
(`model: "claude-haiku-4.5"`, or `gpt-5.4-mini`). Give it the full diff and the
issue's acceptance criteria, and ask specifically:

- Does this actually satisfy the acceptance criteria?
- Any bug, logic error, or unhandled case?
- Anything left behind — debug code, commented-out blocks, a stray `console.log`?
- Comments that restate the code rather than explain it?

Act on what it finds. **Ignore style nitpicking** — Prettier and ESLint already own
that, and a cheap model will happily invent taste. If it flags something you disagree
with, say why rather than silently dropping it.

## Step 7 — Stop for human review

**Stop here. Every commit, without exception.**

Show the user:

- what changed, and why, in a couple of lines
- the diff (`git diff`), or the files if it is large
- the verify result you actually ran
- what the cheap review said

Then **wait**. Do not commit. Do not start the next commit. Do not push.

This repo's git policy is conservative: no commit, no push, no `bd dolt push` without
explicit authority for that action. Propose the command and let the user run or
approve it.

When approved and asked to commit, use a message that explains _why_, references the
bead id, and carries the trailer:

```
<short summary>

<why this change, not what — the diff shows what>

Refs: <bead-id>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Then return to step 4 for the next commit, until the issue is delivered.

## Step 8 — Close it out

When every commit is in and the acceptance criteria are met:

```bash
bd close <id> --reason="<what shipped>"
bd ready
```

Record anything a future session cannot reconstruct from the code — a surprise, a
rejected approach, a package that behaved unlike its docs:

```bash
bd update <id> --append-notes "..."
```

File follow-ups you discovered rather than silently expanding scope:

```bash
bd create --type=<bug|task> --parent=<epic-id> --title="..." --body-file -
```

Keep memories rare. `bd remember` injects into **every** `bd prime`, so it is only for
short, genuinely cross-cutting rules — never per-task detail.

Finish with a handoff: what changed, what you ran, issue status, and any command left
for the user to run.

## Never

- Never commit or push without explicit approval.
- Never leave the repo red between commits.
- Never defer tests to "later".
- Never expand scope mid-issue — file a new bead instead.
- Never claim something works because it should. Run it and quote the output.
