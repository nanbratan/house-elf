# Useful components from assistant-ui

assistant-ui ships three tiers: Elements, Components, and Primitives. The difference between Elements and Components is still unclear to me.

Re-organized by **functional concern** instead of by the assistant-ui tier. Each item is tagged with its tier:
`[util]` = Utility · `[prim]` = Primitive · `[ui]` = Component (`docs/ui/*`) · `[el]` = Element (`elements/*`).

---

# Part 1 — For current scope

Components we can adopt right away, where we already have code that can be swapped for the assistant-ui equivalent.

## Streaming & markdown rendering

- `[ui]` <https://www.assistant-ui.com/docs/ui/streamdown> - Suggests streamdown can run inside assistant-ui. If so, we should just do that.
- `[el]` <https://www.assistant-ui.com/elements/streaming-text> - A very basic streaming-text variant. I'd rather use streamdown + shiki (the ai-elements option): better performance optimizations and syntax highlighting via shiki. We could potentially combine ai-elements and assistant-ui here.
- `[ui]` <https://www.assistant-ui.com/docs/ui/markdown> - assistant-ui has its own markdown rendering, but it isn't used by streaming-text and has no highlighting, so it's unclear whether we need it.
- `[util]` <https://www.assistant-ui.com/docs/utilities/tw-shimmer> - Shimmer utility.

## Thread & message list

- `[prim]` <https://www.assistant-ui.com/docs/primitives/thread> - Primitive for the messages list.
- `[prim]` <https://www.assistant-ui.com/docs/primitives/message> - Primitive for a single message in the list.
- `[ui]` <https://www.assistant-ui.com/docs/ui/thread> - A ready-made combined component. Looks good but has several issues: the loader while waiting for the agent's response is just a single dot (I'd prefer a shimmer with some text, or at least three dots); scrolling doesn't always work (e.g. it didn't scroll when the agent produced markdown); code is rendered without highlighting. That said, I love that tool calls are grouped under one collapsible, with each tool inside also collapsible — so tool calls don't inflate the screen and you can still drill into their details.
- `[el]` <https://www.assistant-ui.com/elements/message-pair> - Not sure it's worth using: it defaults to streaming-text, and the benefit over our own pairing isn't clear.
- `[el]` <https://www.assistant-ui.com/elements/scroll-anchor> - Not sure this is worth taking or what its point is; our current approach may be fine.
- `[prim]` <https://www.assistant-ui.com/docs/primitives/thread-list> - Unclear how this differs from the Elements thread-list.
- `[el]` <https://www.assistant-ui.com/elements/thread-list> - We currently have our own implementation; this looks much better.

## Composer

- `[prim]` <https://www.assistant-ui.com/docs/primitives/composer> - Foundational composer primitive.
- `[el]` <https://www.assistant-ui.com/elements/composer> - The obvious choice for our composer, but our model picker would differ and we don't need voice. The streaming part would also differ (likely streamdown).
- `[el]` <https://www.assistant-ui.com/elements/command-palette> - Could potentially serve as our model picker, but we need to evaluate whether it's worth it.

## Model selection

- `[ui]` <https://www.assistant-ui.com/docs/ui/model-selector> - Looks much better than the Elements model picker and is apparently composable, so we can extend it to our needs. We should evaluate whether we even need it.
- `[el]` <https://www.assistant-ui.com/elements/model-picker> - Better than the small dropdown picker, but still far inferior to what we have now.
- `[el]` <https://www.assistant-ui.com/elements/composer-model-picker> - A small dropdown model picker that doesn't meet our needs; we don't need it.

## Status & reasoning indicators

- `[el]` <https://www.assistant-ui.com/elements/thinking-indicator> - Great, but I don't like the blue dot on the left. Could work for the "waiting for the agent's response" state.
- `[el]` <https://www.assistant-ui.com/elements/typing-indicator> - Usable for the state where the agent hasn't produced anything yet.
- `[ui]` <https://www.assistant-ui.com/docs/ui/dot-matrix> - Looks cool as a loading indicator; we should probably use it somewhere.
- `[el]` <https://www.assistant-ui.com/elements/reasoning-panel> - Nice for grouping reasoning parts together.
- `[ui]` <https://www.assistant-ui.com/docs/ui/reasoning> - A reasoning indicator; unclear how it compares to the Elements reasoning-panel.

## Tools

- `[el]` <https://www.assistant-ui.com/elements/tool-call>
- `[ui]` <https://www.assistant-ui.com/docs/ui/tool-fallback> - Lets us provide a default rendering fallback.
- `[ui]` <https://www.assistant-ui.com/docs/ui/tool-group> - Useful for combining multiple tool calls into one row instead of several.
- `[el]` <https://www.assistant-ui.com/elements/tool-group> - We'll obviously want to group multiple tool calls to avoid a column of 10 calls (hard to view on mobile).

## Errors

- `[el]` <https://www.assistant-ui.com/elements/error-state> - Would be nice to use this instead of our hand-rolled error UI.

## Message timing

- `[el]` <https://www.assistant-ui.com/elements/message-timing> - Need to verify this is possible with Mastra.

## Structured output

- `[el]` <https://www.assistant-ui.com/elements/spec-sheet> - Could work for extra model details; we'd just enhance it with tool warnings and preserve our structure.

## Rejected / replace with existing

- `[ui]` <https://www.assistant-ui.com/docs/ui/scrollbar> - Works poorly; better to just use the shadcn scrollbar.

---

# Part 2 — Good to have moving forward (not right now)

Also needs validation on whether Mastra even supports it.

## Attachments

- `[prim]` <https://www.assistant-ui.com/docs/primitives/attachment> - Attachment primitives.
- `[ui]` <https://www.assistant-ui.com/docs/ui/attachment> - Attachment UI built from the primitives.
- `[el]` <https://www.assistant-ui.com/elements/message-attachment> - Great once we add attachments, but rendering them in a column may take up all the space. We should look at how ai-elements handles it.
- `[el]` <https://www.assistant-ui.com/elements/composer-attachments> - We'll need to send attachments to an agent; this looks exactly like what we need.

## Messages — QoL

- `[el]` <https://www.assistant-ui.com/elements/message-actions> - Good to have, but without likes — only copy/regenerate.
- `[el]` <https://www.assistant-ui.com/elements/edit-message> - Obviously great for when a mistake has been made; not sure Mastra supports it.
- `[el]` <https://www.assistant-ui.com/elements/quote-reply> - Great as a QoL feature.
- `[el]` <https://www.assistant-ui.com/elements/stopped-run>
- `[el]` <https://www.assistant-ui.com/elements/day-separator>
- `[el]` <https://www.assistant-ui.com/elements/confidence-marker> - Awesome for once we add search/research, to make clear what's from the web vs. from memory. Not sure Mastra supports it.

## Tools

- `[el]` <https://www.assistant-ui.com/elements/tool-timeline> - Looks good, but I'm not sure what I'd use it for.
- `[el]` <https://www.assistant-ui.com/elements/tool-error> - Should complement our tool-call chip so we can actually act on errors. Unclear how it's meant to work with Mastra — would it be a HIL thing?

## Knowledge / search / research

- `[el]` <https://www.assistant-ui.com/elements/web-search> - Worth adding once we add search, to give visibility into what was searched and where.
- `[el]` <https://www.assistant-ui.com/elements/inline-citation> - Would make web search better by keeping sources clear in the response. Not sure Mastra returns citations inline in the text.
- `[el]` <https://www.assistant-ui.com/elements/image-generation> - Obviously what we want to make image generation work.
- `[el]` <https://www.assistant-ui.com/elements/retrieval-chunks> - Not sure we can use it, but a cool thing to have — I like the scoring part.
- `[el]` <https://www.assistant-ui.com/elements/memory-chips> - Would be cool to see what the agent remembered, but I don't know whether we have visibility into that in Mastra.
- `[el]` <https://www.assistant-ui.com/elements/research-report> - The next step after basic web search is an advanced research capability. This could be cool for giving visibility into the process.

## Structured output / progress

- `[el]` <https://www.assistant-ui.com/elements/job-progress> - Could be cool for visualizing Mastra's workflow progress, if possible.

## Agents

- `[el]` <https://www.assistant-ui.com/elements/subagent-list> - Cool for later, once we can run subagents.
- `[el]` <https://www.assistant-ui.com/elements/agent-status> - If Mastra supports it, great for always knowing what's in progress.
- `[el]` <https://www.assistant-ui.com/elements/approval-card> - This, or something like it, will be needed for HIL.
- `[el]` <https://www.assistant-ui.com/elements/artifact-card> - Great for artifacts; later we'll have PDF generation etc. and will need this component for it.
- `[el]` <https://www.assistant-ui.com/elements/agent-card> - Not sure how to use it, but I suspect it'll be useful when we have multiple agents to choose from.

## Composer

- `[el]` <https://www.assistant-ui.com/elements/composer-slash-commands> - Pre-defined custom prompts are obviously good to have.
- `[el]` <https://www.assistant-ui.com/elements/composer-context> - Not sure OpenRouter/Mastra supports it, but it'd be great for avoiding overspending.
- `[el]` <https://www.assistant-ui.com/elements/context-breakdown> - Great for visibility and optimizing an agent, but I'm not sure it's possible with Mastra/OpenRouter.
- `[el]` <https://www.assistant-ui.com/elements/prompt-library> - Same idea as prompts: later we'll want custom prompts to avoid repeating myself; worth exploring.

## Thread / app shell

- `[el]` <https://www.assistant-ui.com/elements/empty-state> - Could be a nice upgrade over our current empty state.
- `[el]` <https://www.assistant-ui.com/elements/connection-state> - Good to have.
- `[el]` <https://www.assistant-ui.com/elements/conversation-search> - Good for searching within a conversation so we can find anything in it. May not be a great fit, though, since I'm planning a virtual list — unclear how the two work together, but worth checking.
- `[el]` <https://www.assistant-ui.com/elements/thread-search> - Obviously good to have.
- `[el]` <https://www.assistant-ui.com/elements/settings-panel> - We already plan to have a settings panel/modal. Looks nice but isn't usable as-is: our settings will be large (many configurations), so one setting per row would be wasteful — we should group them.

## Media / misc

- `[ui]` <https://www.assistant-ui.com/docs/ui/directive-text> - Not sure how I'd actually use it, but it'd be cool to reference tools or agents inline in a message — so an agent can call specific tools on demand, or invoke a specific agent that has memory about something and ask it.
- `[ui]` <https://www.assistant-ui.com/docs/ui/image> - Really cool for once we implement image generation, since it can be zoomed.
