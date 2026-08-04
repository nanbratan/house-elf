import type { SelectableModel } from '@house-elf/shared';

/**
 * Turns the client's `thinking` boolean into OpenRouter's `reasoning` parameter.
 *
 * The client sends a boolean and nothing else. It never sends a token budget, an
 * effort level, or a provider options object — the same rule as model
 * resolution, for the same reason: the request body reaches a provider that
 * charges money, so anything the provider would honour verbatim is decided here.
 *
 * OpenRouter normalises thinking across providers into one `reasoning` map,
 * documented at https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
 * — which is why no per-model table survives here. The route to that map was
 * read from `OpenRouterChatLanguageModel` in the installed `@mastra/core`: a
 * model named as a router string cannot reach the model's own settings, but
 * `doGenerate`/`doStream` spread `providerOptions.openrouter` at the root of the
 * request body, so the key sent below is the request field itself.
 */

/** Thrown when a request asks a model to think that cannot. */
export class ThinkingNotSupportedError extends Error {
	constructor(model: SelectableModel) {
		super(`Model ${model.id} cannot be asked to think.`);
		this.name = 'ThinkingNotSupportedError';
	}
}

/**
 * Whether a request wants thinking. Takes `unknown` because this is client
 * input: anything but `true` means no thinking, including an absent field.
 *
 * A request that omits the flag is a request that does not want thinking. This
 * is the one place a default is correct, because `false` costs nothing.
 */
export function wantsThinking(requested: unknown): boolean {
	return requested === true;
}

/**
 * Whether the model takes a `reasoning` parameter at all.
 *
 * `supported_parameters` rather than the presence of a `reasoning` object,
 * because those two disagree on the live catalog: `openrouter/auto` publishes no
 * `reasoning` object and yet lists the parameter, and a live request with
 * `reasoning: { enabled: true }` did stream reasoning. The object describes how a
 * model reasons; this list is what it accepts being asked.
 */
function acceptsReasoning(model: SelectableModel): boolean {
	return model.supportedParameters.includes('reasoning');
}

/**
 * The provider options for one request, or `undefined` when the model gives no
 * say — a mandatory-reasoning model is sent nothing, because the only values it
 * would accept are the ones it was going to use anyway.
 *
 * Thinking-off is stated out loud rather than left unsaid. Sonnet 5 and others
 * think unless told not to, so omitting the field would hand them a default the
 * user never chose, which is the whole thing this milestone exists to remove.
 */
export function thinkingProviderOptions(
	model: SelectableModel,
	thinking: boolean
): { openrouter: { reasoning: { enabled: boolean } } } | undefined {
	if (!acceptsReasoning(model)) {
		if (thinking) throw new ThinkingNotSupportedError(model);
		return undefined;
	}
	if (model.reasoning?.mandatory === true) return undefined;

	return { openrouter: { reasoning: { enabled: thinking } } };
}
