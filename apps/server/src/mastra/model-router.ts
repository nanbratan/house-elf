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
 * Confirmed rather than inferred, 2026-08-03:
 *
 * - `provider-registry.mjs --provider openrouter` lists 337 ids in the
 *   two-segment catalog form, and `@mastra/core`'s embedded docs spell the
 *   router string `openrouter/openai/gpt-oss-safeguard-20b` — three segments.
 * - OpenRouter's own catalog spells Anthropic versions with dots
 *   (`anthropic/claude-haiku-4.5`) where the allowlist uses dashes
 *   (`anthropic/claude-haiku-4-5`), which looks like it should 404. It does not:
 *   OpenRouter normalises the separator. All nine allowlisted ids were POSTed to
 *   `/api/v1/chat/completions` and every one returned 200 naming its dotted
 *   equivalent, so the prefix composes over the existing list unchanged.
 */
const OPENROUTER_PREFIX = 'openrouter/';

/**
 * Takes a resolved model rather than a string, so a client-supplied id cannot
 * reach a provider by being prefixed — it has to survive the allowlist first.
 */
export function routerModelId(model: SelectableModel): string {
	return `${OPENROUTER_PREFIX}${model.id}`;
}
