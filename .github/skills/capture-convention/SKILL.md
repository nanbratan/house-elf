---
name: capture-convention
description: 'Use when the user corrects an approach, rejects a suggestion, states a coding preference, or explains how something should be done in this repo — e.g. "tests should not do X", "we always Y", "why did you Z", or a correction repeated from an earlier session. Turns that correction into a durable rule in .github/instructions/ so it does not have to be explained to the next agent. Also use when asked to "remember this", "write that down", or "add that to the instructions".'
---

# Capture a convention

The user should have to explain a preference once. This skill turns a correction into
a rule that loads automatically next time.

## When this fires

Any of these is a signal, whether or not the user asks you to write anything down:

- A correction: "that's not how we do it", "why would you do that?"
- A rejected suggestion, especially one you argued for.
- A preference stated in passing: "keep tests dumb", "I don't want a mock there".
- A repeat: the user is telling you something a previous session was also told.
- A rule discovered empirically — a package behaves unlike its docs, a command has a
  non-obvious form, a whole class of bug has one cause.

Frustration is the strongest signal. "I have to explain this every time" means the
rule belongs in a file, immediately.

## What is not a convention

Do not capture:

- A decision about this task only ("use haiku here") — that is task context.
- Something already covered. Extending an existing rule beats adding a near-duplicate.
- A preference you inferred rather than were told. Ask first.
- Anything the linter, formatter, or type-checker already enforces. A rule a tool can
  check should be a tool, not prose.

## Where it goes

| The rule is about                                   | File                                                |
| --------------------------------------------------- | --------------------------------------------------- |
| How tests are written, mocked, or proven            | `.github/instructions/testing.instructions.md`      |
| Code style, types, errors, comments, file placement | `.github/instructions/typescript.instructions.md`   |
| shadcn components, base-ui, theme tokens            | `.github/instructions/ui.instructions.md`           |
| How we work: verification, scope, workflow          | `.github/instructions/code-quality.instructions.md` |
| A decision and its alternatives, with reasoning     | `bd create --type=decision`                         |
| What happened and what it taught us                 | `bd update <id> --append-notes`                     |

The instructions files hold the rule. Beads holds the story. A big lesson gets both:
a one-line rule, and a note on the issue explaining how it was learned.

`code-quality.instructions.md` loads on every request — keep it short. Prefer the
scoped files.

## How to write it

1. **State the rule as an instruction**, not as a narrative. "A test asserts an
   outcome, not a mechanism" — not "we discussed how mocks were bad".
2. **Add the reason in one clause.** A rule without a why gets ignored the first time
   it is inconvenient.
3. **Show the failure mode** if it is subtle. A two-line wrong/right pair beats a
   paragraph.
4. **Generalise once, no further.** From "don't assert the status your stub returned"
   to "never assert a value your own stub produced" — but not to "avoid mocks".
5. **Put it in an existing section** if one fits. A long file of one-line sections is
   a list nobody reads.

## Procedure

1. Recognise the signal.
2. Pick the file and the section it extends.
3. Draft the wording — usually two to five lines.
4. **Show the user the proposed text and wait.** They may want it narrower, or not at
   all. Do not commit a rule they did not approve.
5. Apply it, run `bunx prettier --write` on the file, and mention it in the commit
   alongside the work that prompted it.

## Keeping it honest

- If a rule turns out to be wrong, delete or correct it in the same change that
  proves it wrong. A stale rule is worse than no rule.
- If two rules conflict, resolve them rather than leaving both.
- Rules describe this repo. Do not import general advice nobody here asked for.
