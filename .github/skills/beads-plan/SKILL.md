---
name: beads-plan
description: 'Turn a high-level idea into a Beads epic with ready-to-implement deliverable chunks. Use when the user says "beads-plan", "/beads-plan", "plan this", "make beads for this", "create an epic for", or describes something they want built, changed, or fixed that is not yet tracked in Beads — e.g. "I want the chat to remember my preferences", "the model picker is slow", "we should add X". Classifies bug vs feature, interrogates requirements, investigates the code, and writes the epic and chunks so an implementing agent needs no further context.'
---

# Plan work into Beads

The user has arrived with an idea in their head and nothing written down. You leave
with an epic whose chunks another agent — in a fresh session, cheaper model, no memory
of this conversation — can pick up and deliver **without asking a single question**.

**Write no application code in this session.** Planning and implementing are separate
on purpose. Mixing them turns a plan into a rationalisation of whatever got built.

## Why this is strict

The implementing agent will have `bd prime` and one issue. That is all.

Every question you fail to ask becomes a wrong guess. Every file you fail to name
becomes an investigation repeated in every future session, burning the context this
whole workflow exists to protect. Investigation happens **once — here — and is written
down.**

---

## Step 1 — Classify: bug, feature, or chore?

Decide first, because it sets priority.

- **Bug** — the code does not do what it was built to do. Something regressed, or a
  case was never handled. There is an implicit "should" already in the repo.
- **Feature** — new capability. Nothing is broken; something is missing.
- **Chore** — no behaviour change: dependency bumps, tooling, refactors.

**Bugs outrank features.** A bug gets P0–P1 and is expected to jump the queue; a
feature starts at P2 unless the user argues otherwise. State your classification out
loud so the user can correct it — "this is a bug, so it goes ahead of the picker work"
is exactly what they will want to challenge.

Check it is not already tracked before planning anything:

```bash
bd search "<keyword>"
bd list --status=open
```

If it is a **bug**, find the **cause** before writing the issue. An issue describing
only the symptom hands the investigation to the implementer — the exact cost this
workflow removes.

## Step 2 — Interrogate. Assume nothing.

This step is always done too fast. Slow down.

**You may not invent a requirement.** If a detail is not stated by the user, present in
the code, or recorded in Beads, then it is **unknown** — and unknown means you ask. It
does not mean you pick something sensible and move on.

Before asking, check whether the answer already exists:

```bash
bd search "<keyword>"      # already tracked or already decided?
bd memories <keyword>      # a standing rule about this?
```

and search the code — `claude-context search_code` when you can only describe it,
serena `find_symbol` when you can name it. This repo forbids grep/find/glob for
discovery; those two tools are the search interface.

If none of that confirms it, **ask the user.** One question at a time, concrete
choices, recommend one. Keep going until the answer could not surprise you.

Cover at least:

- **Scope** — what is explicitly _not_ included? Undefined edges are where a chunk
  quietly becomes a month.
- **User-visible behaviour** — the standing repo rule is _ask rather than guess on
  anything user-visible_. Wording, empty states, error states, loading states.
- **Constraints** — cost budget, offline behaviour, a dependency to avoid, a URL that
  must keep working, a performance bar.
- **Done** — how will the user know it works? This becomes acceptance criteria.
- **Rejected alternatives** — if they considered another approach and dropped it,
  capture why, or a future agent will helpfully re-propose it.

"I don't mind, you choose" is a real answer. Record it as a decision on the issue so
it is not re-litigated later.

## Step 3 — Investigate the code, and write down what you find

**This is what makes chunks cheap to implement.** Do the exploration once, here.

For every area the work touches, record:

- exact **file paths**, and the symbols inside them that will change
- the **pattern to follow** — the nearest sibling that already does this well
- the **tests** covering it today, and where new tests belong
- anything **surprising**: a constraint, a workaround, a reason the obvious approach
  fails

Verify rather than assert. If you believe a function behaves a certain way, read it.

**Never state a dependency's behaviour from memory.** Read the installed source or its
embedded docs in `node_modules/@mastra/*/dist/docs/`. For Mastra, consult the `mastra`
skill first — its API moves fast and training data is stale. Never invent model ids;
run `.agents/skills/mastra/scripts/provider-registry.mjs`.

## Step 4 — Cut it into deliverable chunks

The part the user cares most about.

**A chunk is one coherent deliverable.** The test: _could this be committed, reviewed,
and left in `master` overnight without embarrassment?_

- **Too big** — "build the settings system". Spans server, schema and UI; no reviewer
  can hold it in their head.
- **Too small** — "add a Zod field". Delivers nothing alone; nobody can tell if it
  works.
- **Right** — "the server accepts and validates per-model settings, with tests". One
  layer, working end to end, provable.

Rules that hold in this repo:

- Slice by **layer or capability**, never by file type. There is no "write the tests"
  chunk — tests ship with the code that needs them, always.
- Every chunk ends green: `bun run verify:fast` passes with it.
- Every chunk is independently reviewable. If chunk 3 is meaningless without chunk 4,
  they are one chunk.
- Size it to a focused session. If you cannot state the deliverable in one sentence,
  it is not one chunk.
- Order so something demonstrable exists **early**. A thin working path beats a
  perfect foundation with nothing on top.

## Step 5 — Write the epic and its chunks

```bash
bd create --type=epic --priority=<0-4> --title="..." --body-file -
bd create --type=task --parent=<epic-id> --priority=<0-4> \
  --title="..." --acceptance="..." --design="..." --notes="..." --body-file -
bd dep add <chunk-id> <depends-on-id>
```

Priorities are `0`–`4` or `P0`–`P4`. bd rejects "high"/"medium"/"low".
Use `--body-file -` with a heredoc for anything multi-line; avoid `bd edit`, which
opens `$EDITOR` and blocks.

**The epic** carries the _why_: the problem, the constraints agreed in step 2, what is
out of scope, and the alternatives rejected.

**Each chunk must stand alone.** Assume its reader has seen nothing else — not this
conversation, not the other chunks. Include:

- **What to build**, concretely.
- **Where** — the file paths and symbols from step 3, and the pattern to copy. This is
  the single highest-value part of the issue.
- **How to verify** — as `--acceptance`, in observable terms. "The picker shows a
  warning for models without tool support" beats "settings work correctly".
- **Decisions already made** — as `--design`, so nobody reopens them.
- **Traps** — as `--notes`. What you would say over a colleague's shoulder.

Wire dependencies with `bd dep add` so `bd ready` reveals work in a safe order. Do not
serialise chunks that could run in parallel — false dependencies are invisible and
slow everything down.

## Step 6 — Prove a stranger could pick it up

Re-read the top-ranked chunk **as if you knew nothing about this conversation**:

- Could I start without asking a question?
- Do I know which files to open, without searching?
- Do I know when I am finished?

Any "no" — fix it now. This is the last checkpoint before a fresh, possibly cheaper,
agent has to work from that text alone.

Then show the user the shape and ask whether the cut is right:

```bash
bd show <epic-id>
bd ready
```

They know things about their own priorities that the code cannot tell you.

## Never

- Never write application code in this session.
- Never invent a requirement to avoid an awkward question.
- Never create a chunk you could not implement yourself from its text alone.
- Never commit, push, or run `bd dolt push`. Report and let the user decide.
