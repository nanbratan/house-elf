# M1 — Chat, End to End

**Goal:** Type a message in the SvelteKit UI, watch a real agent stream a response
back, and see it call a tool with the arguments and result rendered in the UI.

**Why this is the second milestone:** it proves the single riskiest integration in
the project — Mastra's stream protocol meeting `@ai-sdk/svelte`. Everything after
this is additive. Do this before building any interesting agent.

---

## Tasks

### T1.1 — Expose an AI SDK chat endpoint

- Add `chatRoute()` from `@mastra/ai-sdk` to the Mastra instance's `server.apiRoutes`.
- Use the dynamic form (`path: '/chat/:agentId'`) so every future agent is reachable
  without a new route.
- Enable `sendReasoning: true` and `sendSources: true` — we want to render these.
- **Verify the current signature in the embedded docs.** Option names have changed
  between versions.
- Test with `curl` before touching the frontend: POST a messages array and confirm an
  SSE stream of AI SDK protocol parts comes back.

### T1.2 — A tool worth watching

Give the `general` agent one simple tool so tool-call rendering can be built and
verified. Suggestion: a `getCurrentTime` tool taking an IANA timezone. It is trivial,
deterministic, and easy to trigger on demand.

- `createTool()` with a Zod `inputSchema` and a clear model-facing `description`.
- Register it on the agent.
- Verify in Studio that the agent calls it.

### T1.3 — SvelteKit proxy route

- `src/routes/api/chat/[agentId]/+server.ts` — proxies POST to the Mastra chat route
  and streams the response through unchanged.
- Must preserve: the response body stream (no buffering), `Content-Type`, and the
  request's `AbortSignal` so client disconnects abort generation server-side.
- Mastra's origin comes from a server-only env var (`MASTRA_URL`), never exposed to
  the browser.

> This proxy is deliberately dumb. Its only purpose is to be the place where auth
> lands in M6 and to keep Mastra off the public internet. No logic here, ever.

### T1.4 — Chat UI

- Use `Chat` from `@ai-sdk/svelte` with a transport pointed at the local proxy route.
- Build a **part-driven** message renderer. Switch on part `type`:
  - `text` — markdown rendered. Use `marked` + `shiki` for code blocks. Sanitise.
  - `reasoning` — collapsed by default, expandable, visually de-emphasised.
  - `tool-*` — a collapsible card showing tool name, a status indicator
    (pending / running / done / error), the input arguments, and the result. Must
    render sensibly while arguments are still streaming in partial.
  - `source` — a small citation chip. **Deferred past M1**: nothing in the app
    emits a source part yet (no retrieval, no web search), so the chip would be
    untestable scaffolding. Build it when M4 gives it something to cite.
  - unknown types — render nothing, do not throw.
- Composer: textarea, Enter to send, Shift+Enter for newline, Stop button while
  streaming.
- Auto-scroll that respects the user scrolling up (do not yank them back down).
- Error state: show the error, offer regenerate.

### T1.5 — Streaming quality

- Confirm tokens appear progressively, not in one chunk.
- Confirm the Stop button aborts generation: the text stops growing in the browser,
  and the proxy's forwarded abort signal is asserted in a test.
- Confirm a mid-stream page refresh does not corrupt anything.

### T1.6 — Tests

- **Component:** the message renderer against synthetic `UIMessage` fixtures covering
  every part type, partial streaming tool arguments, and an unknown part type.
- **Component:** composer key handling and Stop-button visibility.
- **E2E:** auto-scroll follows the stream and stops once the user scrolls up
  (needs real layout — see [03-testing.md](03-testing.md)).
- ~~**Integration:** the agent calls `getCurrentTime` with the right argument~~ —
  **dropped.** Whether Mastra calls a registered tool is Mastra's behaviour, tested
  by Mastra. See the decision log.
- **Unit:** the `getCurrentTime` tool's timezone handling, including an invalid zone.
- **E2E:** send a message against a stubbed model and observe a streamed response.

---

## Definition of Done

Performed manually in a browser:

1. Send "hello" → response streams in token by token.
2. Ask "what time is it in Tokyo?" → the tool card appears, shows the timezone
   argument, shows the result, and the agent's answer follows.
3. Send a long request, press Stop mid-stream → generation halts and the reply stops
   growing.
4. Trigger an error (e.g. temporarily use an invalid API key) → the UI shows a
   readable error rather than a blank screen or a crash.
5. Ask for something requiring a code block → it renders with syntax highlighting.
6. `bun run verify` passes, including the new tests and coverage thresholds.

## Notes for the executing agent

- Conversations are **not persisted** in this milestone. Refreshing loses the thread.
  That is expected and is fixed in M2. Do not build persistence here.
- There is no conversation list yet — hardcode a single chat view.
- The message renderer built here is the component you will live with for the rest of
  the project. It is worth spending time on. Everything else in M1 is throwaway
  scaffolding.
- `chatRoute()`'s `version` option accepts only `'v5' | 'v6'`, but the installed `ai`
  is **7.0.42** — a major this plan did not anticipate. For a text-only response the
  two settings emit byte-identical chunks (verified in T1.1), so the default is left
  in place and the choice is settled in T1.4 against the real `@ai-sdk/svelte`
  client, where tool and approval parts can actually discriminate.
