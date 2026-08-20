/**
 * Observer candidates for the working-memory eval suite. Adding a model to
 * the comparison is adding an entry here — nothing else in `evals/memory`
 * names a model id.
 *
 * Every id and `reasoningEffort` value was checked against the live
 * OpenRouter catalog (`openRouterCatalog.get(id).reasoning.supported_efforts`)
 * before being added — the catalog moves, so re-verify rather than copy an
 * old id. The one exception is a `@preset/...` id, which the catalog doesn't
 * list; see the comment on the `deepseek-flash` candidate below.
 */

/** Effort tokens actually seen across OpenRouter's `reasoning.supported_efforts`. */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * A tier map for `ModelByInputTokens` — catalog ids, not yet router-prefixed.
 * Kept as plain data rather than an already-constructed `ModelByInputTokens`
 * instance: building the runtime object needs each id run through
 * `routerModelId`, which is `memory-factory.ts`'s job, not this file's.
 */
export interface TieredModel {
	readonly upTo: Readonly<Record<number, string>>;
}

export interface ObserverCandidate {
	/** Report row label; also the id suffix for its registered Agent/Workflow. */
	readonly id: string;
	/** A catalog id, or a tier map of catalog ids by input-token threshold. */
	readonly model: string | TieredModel;
	/** The lowest effort each model's own `supported_efforts` allows for this role — stated explicitly per candidate, not defaulted. */
	readonly reasoningEffort: ReasoningEffort;
}

export const OBSERVER_CANDIDATES: readonly ObserverCandidate[] = [
	{
		id: 'gemini-flash',
		model: 'google/gemini-3.7-flash',
		reasoningEffort: 'low'
	},
	{
		id: 'luna',
		model: 'openai/gpt-5.6-luna',
		// `none` is this model's actual floor per `supported_efforts` — no override.
		reasoningEffort: 'low'
	},
	{
		id: 'deepseek-flash',
		// A preset, not a bare model id — excludes quantized providers, which a
		// bare `deepseek/...` id does not. Presets aren't public catalog entries
		// (`openRouterCatalog.get` returns nothing for one), so `reasoningEffort`
		// below is inherited from the `-0731` snapshot's own verified floor
		// (`low`; the bare `deepseek-v4-flash` id without `-0731` bottoms out at
		// `high`) rather than being independently confirmed for the preset itself.
		model: '@preset/deepseek-preset',
		reasoningEffort: 'low'
	},
	{
		id: 'gpt-5-4-mini',
		model: 'openai/gpt-5.4-mini',
		reasoningEffort: 'none'
	},
	{
		// Not a flat model — a real question about whether ModelByInputTokens
		// itself works end to end (router-prefixed tier ids, structured output,
		// live threshold switching) and whether working memory survives a
		// mid-conversation tier switch cleanly. Both are things testing the two
		// models individually cannot show.
		id: 'tiered-deepseek-gemini',
		model: {
			upTo: {
				10_000: '@preset/deepseek-preset',
				1_000_000: 'google/gemini-3.7-flash'
			}
		},
		reasoningEffort: 'low'
	}
] as const;

/**
 * The answering model every candidate's Agent shares — not one of the
 * Observer candidates above, so no row is ever "testing itself". Its own
 * output isn't scored, only its content, which the Observer extracts from —
 * held constant across every candidate for a fair comparison, and cheap since
 * neither its quality nor its cost is what's under test.
 */
export const EVAL_ANSWERING_MODEL_ID = 'openai/gpt-5-nano';

/** `gpt-5-nano` requires reasoning; `minimal` is its lowest supported effort. */
export const EVAL_ANSWERING_MODEL_REASONING_EFFORT: ReasoningEffort = 'minimal';

/**
 * The model that judges how well a candidate maintained the document.
 *
 * From a family no candidate belongs to, so no row is ever graded by itself —
 * `@preset/deepseek-preset` was wrong for exactly that reason, being the
 * `deepseek-flash` candidate's own model and half of `tiered-deepseek-gemini`.
 *
 * Priced well above every candidate, which is affordable only because one judge
 * call covers all four aspects of a case: judging is a few dollars per full
 * sweep, and catching a subtle mis-merge matters more here than saving cents.
 */
export const EVAL_JUDGE_MODEL_ID = 'google/gemini-3.7-flash';
// export const EVAL_JUDGE_MODEL_ID = 'anthropic/claude-sonnet-5';
