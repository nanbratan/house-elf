# NOTICE

## Vercel AI Elements

Parts of the chat UI in `apps/web/src/lib/components/chat/` were written by
reading Vercel's AI Elements (https://github.com/vercel/ai-elements), which is
licensed under the Apache License, Version 2.0.

Copyright 2023 Vercel, Inc.

No source was copied — AI Elements is React and this is Svelte — but the
following behaviours were taken from it rather than invented here, and the
credit belongs there:

- The complete set of tool-call states and what each one means to a reader
  (`ToolCard.svelte`, from `packages/elements/src/tool.tsx`).
- Reasoning that opens while the model thinks, reports how long it took, and
  collapses a beat after it finishes (`ReasoningPart.svelte`, from
  `packages/elements/src/reasoning.tsx`).
- Guarding Enter against IME composition with composition events as well as
  `KeyboardEvent.isComposing` (`Composer.svelte`, from
  `packages/elements/src/prompt-input.tsx`).

`remend`, used in `apps/web/src/lib/markdown.ts`, is a normal dependency from
the same project and is also Apache-2.0.
