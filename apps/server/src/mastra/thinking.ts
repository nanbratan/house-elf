import type { SelectableModel } from '@house-elf/shared';

import { SELECTABLE_MODELS } from './models';

/**
 * Turns the client's `thinking` boolean into Anthropic's provider options.
 *
 * The client sends a boolean and nothing else. It never sends a token budget, a
 * thinking type, or a provider options object — the same rule as the model
 * allowlist, for the same reason: the request body reaches a provider that
 * charges money, so anything the provider would honour verbatim is decided
 * here.
 *
 * Everything below was read from Anthropic's per-model table at
 * https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting
 * and cross-checked against the anthropic provider bundled in `@mastra/core`
 * (`anthropicLanguageModelOptions`, whose `thinking` is a discriminated union of
 * `adaptive` | `enabled` | `disabled`).
 */

/**
 * How a model wants to be asked to think.
 *
 * - `adaptive` — 4.6 and newer. `{ type: 'enabled' }` is deprecated on 4.6 and
 *   returns a 400 on 4.7 and later. The model decides per request whether to
 *   think, so a thinking-on request may still answer directly; that is the
 *   mode's design, not a bug.
 * - `extended` — 4.5 and earlier. Takes a token budget, and rejects
 *   `{ type: 'adaptive' }` with a 400.
 */
type ThinkingMode = 'adaptive' | 'extended';

const THINKING_MODES: Readonly<Record<string, ThinkingMode>> = {
	'anthropic/claude-opus-5': 'adaptive',
	'anthropic/claude-opus-4-8': 'adaptive',
	'anthropic/claude-opus-4-7': 'adaptive',
	'anthropic/claude-opus-4-6': 'adaptive',
	'anthropic/claude-sonnet-5': 'adaptive',
	'anthropic/claude-sonnet-4-6': 'adaptive',
	'anthropic/claude-opus-4-5': 'extended',
	'anthropic/claude-sonnet-4-5': 'extended',
	'anthropic/claude-haiku-4-5': 'extended'
};

/**
 * Thinking depth for the `extended` models, which have no `effort` lever.
 *
 * A constant, not a control — the budget is a target rather than a cap, so a
 * larger one is only paid for on questions that actually use it. Anthropic's
 * floor is 1,024 and it counts toward `max_tokens`, which `@mastra/core` sets to
 * 64,000 for these three, so there is headroom to raise this.
 *
 * Suggested alternatives if 4k proves shallow: 8,192 for noticeably more room on
 * multi-step reasoning, or 16,000 — Anthropic's own starting point for complex
 * tasks — at the cost of slower first tokens when it is used. Above 32k they
 * recommend batch processing, so that is the practical ceiling here.
 *
 * The `adaptive` models ignore this: they get Anthropic's default effort
 * (`high`) instead, which is why the two families behave comparably.
 */
export const THINKING_BUDGET_TOKENS = 4096;

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
 * The provider options for one request, or `undefined` when the model gives no
 * say — an always-on model is sent nothing, because the only values it would
 * accept are the ones it was going to use anyway.
 *
 * Note that thinking-off is stated out loud rather than left unsaid. Opus 5 and
 * Sonnet 5 think unless told not to, so omitting the field would hand them a
 * default the user never chose, which is the whole thing this milestone exists
 * to remove.
 */
export function thinkingProviderOptions(
	model: SelectableModel,
	thinking: boolean
): { anthropic: { thinking: Record<string, unknown> } } | undefined {
	if (model.thinking === 'always') return undefined;
	if (model.thinking === 'unsupported') {
		if (thinking) throw new ThinkingNotSupportedError(model);
		return undefined;
	}

	if (!thinking) return { anthropic: { thinking: { type: 'disabled' } } };

	// `display: 'summarized'` is what makes the reasoning pane show anything.
	// Without it 4.7+ return thinking blocks whose text is empty.
	return THINKING_MODES[model.id] === 'adaptive'
		? { anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } }
		: { anthropic: { thinking: { type: 'enabled', budgetTokens: THINKING_BUDGET_TOKENS } } };
}

/** Every allowlisted model that can think must say how. Guarded by a test. */
export function modelsMissingAThinkingMode(): readonly string[] {
	return SELECTABLE_MODELS.filter(
		(model) => model.thinking !== 'unsupported' && THINKING_MODES[model.id] === undefined
	).map((model) => model.id);
}
