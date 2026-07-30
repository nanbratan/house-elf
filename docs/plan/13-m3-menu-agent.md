# M3 — Menu Agent (first real use case)

**Goal:** A dedicated nutrition/meal-planning agent with its own memory, its own
tools, and its own persona — proving that adding an agent is cheap and touches
nothing in the chat substrate.

**The real test of this milestone:** how few files outside `apps/server/src/mastra/`
you had to change. Ideally: one, to add the agent to a picker.

---

## Tasks

### T3.1 — Multi-agent support in the UI

- Add an agent registry the UI can read. Mastra exposes agent listing — use
  `@mastra/client-js` rather than hardcoding a list, so new agents appear
  automatically.
- Agent picker on the new-conversation page. Threads record which agent they belong
  to (thread metadata), so `/c/[id]` routes to the right one.
- Keep this minimal: a dropdown or a row of cards. Not a settings system.

### T3.2 — Semantic recall

- Add `PgVector` to the Mastra instance, using the same `DATABASE_URL`.
- Enable semantic recall on the memory config, with an embedding model. Verify the
  embedding model identifier via the provider registry script — embedding models have
  their own naming.
- Tune `topK` and message-range conservatively. Over-recall wastes tokens and
  confuses the model.
- Verify: mention a specific meal in an early conversation, then many turns later ask
  about it in a different thread, and confirm recall pulls it in. Check the trace in
  Studio to confirm recall actually fired rather than the model guessing.

### T3.3 — Menu agent

`apps/server/src/mastra/agents/menu.ts`:

- Instructions establishing the persona: a nutrition-literate assistant that plans
  meals around training load, respects preferences and restrictions, and asks before
  assuming.
- Its own `Memory` with a **working memory template** structured for this domain:
  - Body stats and goals (weight, target, activity level)
  - Training schedule
  - Dietary restrictions and allergies
  - Foods loved / disliked
  - Kitchen constraints (equipment, time available, cooking skill)
  - Recent meals (rolling)
- Resource-scoped, like M2.

### T3.4 — Tools

Start with **one** tool and only add more if a real conversation demands it:

- `logMeal` — records what was eaten with an approximate macro breakdown, stored in
  working memory or a small dedicated table.

Deliberately *not* building yet: recipe search, barcode scanning, external nutrition
APIs, grocery lists. Add them when you actually miss them.

### T3.5 — Structured output where it helps

- When the agent produces a multi-day meal plan, having it emit structured output
  (Zod schema) enables a nice rendered plan card in the UI instead of a wall of text.
- Mastra supports structured output on agents; check `docs/agents/structured-output.md`.
- **Only do this if the plain-text version proves annoying to read.** Use it for a
  week first.

### T3.6 — Tests

- **Integration:** semantic recall retrieves a seeded relevant message and does *not*
  retrieve an irrelevant one.
- **Integration:** the menu agent calls `logMeal` with a schema-valid payload, using a
  mocked model.
- **Integration:** the menu agent's working memory is isolated from the general
  agent's — one does not leak into the other.
- **Unit:** any macro arithmetic in `logMeal`.
- **Component:** the agent picker, and thread→agent routing.

---

## Definition of Done

1. The new-conversation page lets you pick the menu agent; the thread remembers the
   choice across reloads.
2. Tell it your training schedule and dietary restrictions in one conversation. In a
   new conversation, ask for a meal plan → it respects both without being reminded.
3. `logMeal` fires and the tool card renders correctly.
4. A Studio trace shows semantic recall retrieving relevant older messages.
5. Adding the menu agent required **no changes** to the message renderer.
6. `bun run verify` passes.

## Notes for the executing agent

- Spend real time on the instructions and the working-memory template. This is where
  agent quality actually comes from — far more than tooling.
- If the agent is not updating working memory reliably, the template is probably too
  vague or the instructions do not tell it when to record things. Inspect working
  memory in Studio and iterate on the prompt, not on the code.
- Resist building a nutrition database. The models know food macros well enough for
  personal use.
