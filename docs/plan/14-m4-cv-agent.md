# M4 — CV Agent, RAG & PDF Export

**Goal:** An agent that holds your entire career history, can be pointed at a job
description, and produces a tailored CV as a PDF — with the agent, not a template,
deciding the layout.

**Two new capabilities introduced:** explicit document RAG, and a binary-producing
tool.

---

## Part A — RAG over career documents

### T4.1 — Document ingestion

- A tool or custom API route that accepts a file (PDF, DOCX, Markdown, plain text),
  extracts text, chunks it, embeds it, and stores it in `PgVector` under a namespace
  for career documents.
- Use Mastra's `MDocument` and `.chunk()` — check `reference/rag/document.md` and
  `reference/rag/chunk.md` for the current API and chunking strategies.
- Attach metadata per chunk: source filename, document type
  (`cv` | `job-description` | `review` | `project-notes`), and date. This makes
  metadata-filtered retrieval possible.

### T4.2 — Upload UI

- A simple upload area, reachable from the CV agent's conversation view. Drag and
  drop, list of ingested documents, delete.
- Uploads go through the SvelteKit proxy to a custom Mastra API route
  (`registerApiRoute()`).
- Enforce a file size cap and an allowlist of MIME types at the boundary.

### T4.3 — Retrieval tool

- `createVectorQueryTool()` scoped to the career namespace, given to the CV agent.
- Verify with a Studio trace that retrieval returns the right chunks for a query
  like "what did I do at $COMPANY".

---

## Part B — The agent

### T4.4 — CV agent

- Instructions: an experienced CV writer that works from evidence in the retrieved
  documents, never fabricates experience, quantifies impact where the source data
  supports it, and tailors emphasis to a supplied job description.
- Working memory template for stable career facts: contact details, current title,
  years of experience, core skills, languages, education, links. These rarely change
  and should not require retrieval.
- **Explicit anti-hallucination instruction:** if a claim is not supported by
  retrieved content or working memory, ask rather than invent. This is the single
  most important line in the prompt.

---

## Part C — PDF export

### T4.5 — Typst in the container

- Add the `typst` binary to `apps/server`'s Docker image and to local dev setup
  (`brew install typst` on macOS). Document both in the README.
- Verify the binary is callable from the server process.

### T4.6 — The render tool

`renderTypstPdf` tool:

- **Input:** a Typst source string (Zod-validated, size-capped).
- **Behaviour:** write to a temp file in an isolated temp directory, invoke `typst
compile` with a timeout, read the resulting PDF.
- **Output:** on success, a document ID and a download URL. On failure, the
  compiler's stderr returned to the agent so it can fix its own markup.
- **Security — this is the sharp edge:**
  - Run with `--root` pointed at the temp directory so Typst cannot read arbitrary
    files from the host.
  - Hard timeout (e.g. 10s) and kill the process on expiry.
  - Never interpolate anything into a shell string — pass argv arrays.
  - Cap retries at 3 so a persistently-broken template cannot loop.
- Store generated PDFs on disk under a data volume, keyed by ID, with the path
  recorded so the download route can serve them.
- Unit-test the error-handling and timeout paths (`bun test`). This is one of the few
  places in the project with logic worth testing.

### T4.7 — Typst starting point

- Give the agent a **reference example** of a good CV in Typst in its instructions —
  a complete, compiling document showing the idioms (a `#let` for section headers,
  a two-column header block, spacing conventions).
- This is a _starting point, not a template_. State explicitly in the instructions
  that the agent may restructure it freely. The example exists so the agent writes
  valid Typst on the first try, not to constrain layout.

### T4.8 — Download & preview

- A custom Mastra API route serving the PDF by ID, proxied through SvelteKit.
- In the chat, a completed `renderTypstPdf` tool call renders as a download button
  and, ideally, an inline preview (`<iframe>` or `<embed>`).

### T4.9 — Tests

The render tool is the most test-worthy code in the project — real side effects, real
failure modes, real security surface.

- **Unit:** `renderTypstPdf` compiles valid Typst to a non-empty PDF (assert the
  `%PDF` magic bytes).
- **Unit:** invalid Typst returns the compiler's stderr rather than throwing.
- **Unit:** the retry cap holds — persistently invalid input stops at 3 attempts.
- **Unit:** the timeout fires and the child process is killed.
- **Unit — security:** Typst attempting to read a file outside the temp root fails.
  Assert this explicitly; it is the whole reason `--root` is set.
- **Unit:** oversized input is rejected at the schema boundary.
- **Integration:** ingest a document, retrieve it by similarity, and confirm metadata
  filters narrow results correctly.
- **Integration:** the CV agent calls the retrieval tool before drafting (mocked model).
- **E2E:** upload a document, see it listed; generate a PDF and fetch the download.

---

## Definition of Done

1. Upload two old CVs and a job description. They appear in the document list.
2. Ask "what did I do at $COMPANY?" → the answer is grounded in the uploaded
   documents; the Studio trace shows the retrieval tool firing.
3. Ask for a CV tailored to the uploaded job description → the agent writes Typst,
   the tool compiles it, and a PDF download appears in the chat.
4. Open the PDF. It looks like a real CV.
5. Say "make it one page and drop the older roles" → a revised PDF, visibly changed
   in layout, not just in text.
6. Deliberately make the agent emit broken Typst (or simulate it) → the compiler
   error comes back and the agent self-corrects.
7. Ask about a job you never held → it says it has no record, rather than inventing.
8. `bun run verify` passes, including the render tool's security and timeout tests.

## Notes for the executing agent

- Iterate on the Typst reference example by hand first. Get _one_ CV compiling and
  looking good before giving the agent the pen. Debugging "is it the agent or is it
  my Typst?" simultaneously is miserable.
- Retrieval quality is mostly a chunking problem. If answers are vague, try larger
  chunks with more overlap before touching the prompt.
- Point 7 is not optional. An agent that invents employment history is worse than no
  agent.
