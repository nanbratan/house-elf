# M2 — Threads, Persistence & Memory

**Goal:** Conversations survive restarts, are listed in a sidebar, and the agent
remembers facts about you across _different_ conversations.

**Why this matters most:** this is the milestone that turns a chat toy into an
assistant. The resource-vs-thread scoping decision made here determines whether
"stop re-explaining my career to it" actually works.

---

## Key concept: resource vs thread

Read Mastra's memory docs carefully before writing code.

- **`thread`** — one conversation. Message history is thread-scoped.
- **`resource`** — the user. Since this is single-user, the resource ID is a
  constant (e.g. `owner`). Put it in one place; do not scatter the literal.

**Working memory must be resource-scoped.** If it is thread-scoped, a new
conversation starts from nothing and the entire premise of the CV and menu agents
collapses. Verify this behaviour explicitly — it is the DoD's most important check.

---

## Tasks

### T2.1 — Memory configuration

- Create a shared `Memory` instance in `src/mastra/memory/`, backed by the Postgres
  store, with:
  - message history (last N turns — start with a conservative N, tune later)
  - **resource-scoped working memory** with a template covering general personal
    facts (name, location, timezone, communication preferences)
- Attach it to the `general` agent.
- Verify the exact config shape against embedded docs; memory options were
  restructured in Mastra v1.

**A long thread is silently truncated, twice over, and nothing in the app says
so.** Two OpenRouter behaviours combine badly with growing history, and neither is
handled today — `finishReason` appears nowhere in the codebase.

- Overflow is not an error. `context_length_exceeded`, `max_tokens_exceeded` and
  `token_limit_exceeded` are converted into **successful** completions with
  `finish_reason: "length"`. The answer stops mid-sentence and looks finished.
- Context compression (middle-out, dropping messages from the middle) is opt-in
  via `plugins: [{ id: 'context-compression' }]` **except on endpoints with ≤8k
  context, where it is on by default** and can only be turned off explicitly.

Pick a deliberate position while choosing N above, rather than inheriting one:
whether to enable compression, and whether a truncated turn is marked in the UI.
`X-OpenRouter-Metadata: enabled` reports compression in `pipeline` when it fires,
so "did this happen" is answerable rather than guessed at.

### T2.2 — Thread lifecycle

- Creating a new conversation creates a thread with a generated ID.
- Sending a message passes `{ thread, resource }` through to the agent. With
  `@ai-sdk/svelte` this goes via the transport's `prepareSendMessagesRequest` into
  the request body, which `chatRoute()` reads.
- Verify in Studio or via `mastra api` that threads and messages are landing in
  Postgres.

### T2.3 — Conversation list

- Fetch threads for the resource. Mastra exposes thread listing via its server
  routes and the client SDK — check `reference/client-js/memory.md` and
  `reference/memory/listThreads.md` for the current API.
- Decide the access path: either the SvelteKit proxy calls Mastra's REST routes, or
  `@mastra/client-js` is used server-side. **Prefer `@mastra/client-js`** — it is
  typed and tracks the server's API. Add it to `apps/web` as a server-only dep.
- Sidebar renders threads newest-first with title and relative timestamp.
- Clicking a thread navigates to `/c/[id]`.
- Delete a thread (with confirmation).

### T2.4 — Thread titles

- Auto-title a thread from its first exchange. Simplest good approach: after the
  first assistant response completes, call a cheap/fast model to produce a ≤6-word
  title, and store it on the thread's metadata.
- Do not build manual renaming yet unless auto-titling proves bad.

### T2.5 — Load an existing conversation

- `/c/[id]` loads that thread's message history server-side and hydrates the `Chat`
  instance with it.
- Mastra stores messages in its own format. Use `toAISdkMessages()` (or the current
  equivalent — verify) from `@mastra/ai-sdk` to convert for the UI.
- Verify tool calls and reasoning from previous turns still render correctly after a
  reload. This is the part most likely to be subtly broken.

### T2.6 — New conversation page

- `/` shows the empty state with a composer. Sending the first message creates the
  thread and redirects to `/c/[id]` without losing the in-flight stream.

### T2.7 — Tests

This milestone has the highest-value tests in the project. Write them carefully.

- **Integration:** working memory written in thread A is visible in thread B for the
  same resource. _This is the test that protects the entire premise of the project._
- **Integration:** thread create / list / delete, and message ordering on reload.
- **Integration:** message history round-trips through the Mastra → AI SDK conversion
  with tool-call and reasoning parts intact.
- **Component:** the sidebar renders threads, sorts newest-first, and handles the
  empty state.
- **E2E:** create a conversation, reload, history is intact.

---

## Definition of Done

1. Start a conversation, send 3 messages, restart the entire stack
   (`docker compose down && up`, restart dev servers), reload — the conversation is
   in the sidebar with its history intact, including tool-call cards.
2. Tell the agent "my name is X and I live in Y." Start a **brand-new conversation**.
   Ask "where do I live?" → it answers correctly. _(This validates resource-scoped
   working memory. If this fails, nothing else in this milestone matters.)_
3. Threads are auto-titled sensibly.
4. Deleting a thread removes it from the list and from the database.
5. `bun run verify` passes. In particular, the cross-thread working-memory test
   exists and passes — it is the regression net for point 2.

## Notes for the executing agent

- Inspect the working memory document directly in Studio to confirm it is being
  updated. Do not infer it from the agent's answers alone.
- Semantic recall is **not** in this milestone — it needs embeddings and adds cost.
  It arrives in M3.
- `packages/shared` probably earns its existence here: the thread summary type used
  by both the sidebar and the proxy. If it does not, still do not create it.
