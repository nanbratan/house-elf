# M5 — Workflows, Human-in-the-Loop & Schedules

**Goal:** Use Mastra's durable orchestration for something that genuinely needs it —
a multi-step process that pauses for your input and survives a server restart.

**Why now and not earlier:** workflows are the most interesting part of Mastra and
also the easiest thing to over-apply. By M5 you have two real agents and will know
which multi-step process actually annoys you.

---

## When to use a workflow instead of an agent

Read `docs/workflows/overview.md` and `references/core-concepts.md` from the skill.
The short version:

- **Agent** — open-ended, the model decides what to do next.
- **Workflow** — you know the steps; you want determinism, retries, branching,
  parallelism, durability, and the ability to suspend for days.

If the steps are known in advance, it is a workflow. If not, it is an agent.

---

## Tasks

### T5.1 — Choose the workflow

Pick **one** based on what has actually been irritating you by now. Candidates:

- **Weekly meal plan** — gather context (training week, recent meals, current goals)
  → generate a draft plan → **suspend for your approval/edits** → on resume, produce
  the final plan and a consolidated shopping list. Runs on a schedule every Sunday.
- **CV tailoring pipeline** — parse job description → extract required competencies →
  retrieve matching evidence → draft → **suspend for review** → render PDF.

The meal plan is the better first choice: it exercises scheduling *and* suspend/resume,
and the output is genuinely useful weekly.

### T5.2 — Build the workflow

- Compose with `createWorkflow` / `createStep`. Verify current API in embedded docs.
- Use at least one non-linear construct — `.parallel()` for independent context
  gathering, or `.branch()` for a conditional path — so the orchestration is
  exercised rather than being a disguised sequence.
- Steps that call agents should use the agent's `.generate()` / structured output,
  not the streaming path.
- Zod schemas on every step's input and output. This is where workflow type safety
  comes from.

### T5.3 — Suspend and resume

- The approval step calls `suspend()` with a payload describing what needs review.
- Verify the run genuinely survives a **full server restart** while suspended — the
  snapshot is in Postgres. Restart the container mid-run and resume afterwards. This
  is the whole point; do not skip verifying it.
- On resume, the workflow receives your edits and continues.

### T5.4 — Workflow UI

- A `/workflows` page listing runs and their status.
- Suspended runs show the payload and a form to supply resume data.
- Streaming workflow progress: `@mastra/ai-sdk` has `workflowRoute()` and
  `handleWorkflowStream()`. Use them so step-by-step progress appears live rather
  than the UI waiting on a single request.
- Keep this UI utilitarian. Studio already provides a good workflow inspector — the
  custom UI exists only for the approval interaction.

### T5.5 — Scheduling

- Schedule the workflow (weekly). Check `docs/workflows/scheduled-workflows.md` and
  `reference/schedules/overview.md` — schedules require a storage adapter
  implementing the `schedules` domain, which Postgres does.
- Verify the schedule persists across restarts and that its trigger history is
  recorded.
- Add a manual "run now" trigger so you are not waiting a week to test.

### T5.6 — Notification

- When a run suspends awaiting your input, you need to know. Simplest sufficient
  option: an unread badge on the `/workflows` nav item.
- Do not build email/push/Telegram notifications yet. Note that Mastra has a signals
  and channels system if this becomes a real need.

### T5.7 — Tests

Workflows are deterministic given mocked models, so they test well.

- **Integration:** the workflow runs end to end and produces the expected output shape.
- **Integration:** each branch is exercised; the parallel step's results merge correctly.
- **Integration:** the workflow suspends with the expected payload.
- **Integration — the important one:** suspend, **discard the in-memory runtime and
  rehydrate from Postgres**, then resume and complete. This is the durability
  guarantee; assert it rather than trusting it.
- **Integration:** a failing step retries per its policy and surfaces the error.
- **Unit:** any pure step logic (date maths for the training week, list consolidation
  for the shopping list).
- **Component:** the suspended-run approval form renders its payload and submits.

---

## Definition of Done

1. Trigger the workflow manually → it runs, and step progress streams into the UI.
2. It suspends at the approval step and appears in the suspended list.
3. **Restart the Mastra server while it is suspended.** The run is still there.
   Supply your input → it resumes and completes correctly.
4. The scheduled trigger fires (verify by temporarily setting a short interval).
5. Studio shows the full trace including the suspension gap.
6. `bun run verify` passes, including the rehydrate-and-resume durability test.

## Notes for the executing agent

- Step 3 is the milestone. Everything else is scaffolding around proving durability.
- Do not convert existing agent conversations into workflows. Agents and workflows
  coexist; the chat remains agent-driven.
- Resist adding a workflow *builder* UI. You write workflows in TypeScript.
