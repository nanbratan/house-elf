import type { SelectableModel } from '@house-elf/shared';

/**
 * The one place the OpenRouter prefix is written.
 *
 * Two id shapes exist and only one of them crosses the wire to Mastra. The
 * catalog id is what the picker shows and what a browser sends —
 * `anthropic/claude-opus-5`, already containing a slash. Mastra's model router
 * addresses it under a provider of its own, so the string it resolves has three
 * segments: `openrouter/anthropic/claude-opus-5`. The router id is derived here
 * and never leaves the server; nothing else composes the prefix.
 *
 * Confirmed rather than inferred, 2026-08-03: `provider-registry.mjs --provider
 * openrouter` lists 337 ids in the two-segment catalog form, and `@mastra/core`'s
 * embedded docs spell the router string
 * `openrouter/openai/gpt-oss-safeguard-20b` — three segments. The catalog ids
 * now come from OpenRouter's own response verbatim, so the prefix is the only
 * transformation between what the browser names and what the router resolves.
 */
const OPENROUTER_PREFIX = 'openrouter/';

/**
 * Takes a model object rather than a bare id, so a client-supplied string
 * cannot reach a provider by being prefixed — it has to have come out of the
 * catalog, or be the initial-model constant, first.
 */
export function routerModelId(model: Pick<SelectableModel, 'id'>): string {
	return `${OPENROUTER_PREFIX}${model.id}`;
}
