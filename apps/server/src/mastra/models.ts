import type { ModelCatalog, SelectableModel } from '@house-elf/shared';

/**
 * The server-side model allowlist.
 *
 * The model name arrives from the browser, on a path that spends money and can
 * reach every configured provider, so it is treated as untrusted input: a
 * request either names an entry in this list exactly, or it is rejected. A
 * client-supplied string is never interpolated into a model reference.
 *
 * Every id below was taken from
 * `.agents/skills/mastra/scripts/provider-registry.mjs --provider anthropic`,
 * not from memory. Dated snapshots (`…-20251001`) are pins of the undated alias
 * beside them and add nothing to compare, and `claude-opus-4-1` is flagged
 * `deprecated` by the registry; neither is offered.
 *
 * Note that Mastra's `ModelRouterModelId` ends in `(string & {})`, so it accepts
 * any string and gives no compile-time protection here. This list is the runtime
 * check that catches bad ids before they reach a provider.
 *
 * There is no server-side default. A request either names a model or it is
 * rejected — a default here would be a second, invisible way to spend money,
 * and it would mean a client bug that drops the field silently bills the wrong
 * model instead of failing. Choosing the initial selection is the picker's job.
 */

export type { ModelFamily, SelectableModel } from '@house-elf/shared';

/**
 * Every entry's `thinking` value was read off Anthropic's per-model table at
 * https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting
 * ("Configurations each model rejects"), not inferred from the family or the
 * version number.
 *
 * `optional` says the choice is ours to make, not that thinking starts off.
 * Opus 5 and Sonnet 5 think unless told not to, and they are still `optional`
 * because they accept being told not to — confirmed by asking Opus 5 with
 * thinking off and getting an answer with no reasoning rather than a 400. What
 * a model *defaults* to never reaches this file: the server states the choice
 * outright on every request, so there is no default left to describe.
 *
 * `always` is for models that reject `disabled` — Fable 5 and Mythos 5 — and
 * `unsupported` for models that cannot think. Neither state has a model on this
 * list; both are kept because the allowlist is expected to grow, and a wrong
 * value here costs a rejected request on every send.
 *
 * How thinking is *requested* differs by model and is `thinking.ts`'s business.
 */
const initialModel = {
	id: 'anthropic/claude-haiku-4-5',
	label: 'Haiku 4.5',
	family: 'haiku',
	generation: '4.5',
	thinking: 'optional'
} as const satisfies SelectableModel;

/** Ordered newest first within each family: Opus, Sonnet, then Haiku. */
export const SELECTABLE_MODELS: readonly SelectableModel[] = [
	{
		id: 'anthropic/claude-opus-5',
		label: 'Opus 5',
		family: 'opus',
		generation: '5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-opus-4-8',
		label: 'Opus 4.8',
		family: 'opus',
		generation: '4.8',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-opus-4-7',
		label: 'Opus 4.7',
		family: 'opus',
		generation: '4.7',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-opus-4-6',
		label: 'Opus 4.6',
		family: 'opus',
		generation: '4.6',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-opus-4-5',
		label: 'Opus 4.5',
		family: 'opus',
		generation: '4.5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-sonnet-5',
		label: 'Sonnet 5',
		family: 'sonnet',
		generation: '5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-sonnet-4-6',
		label: 'Sonnet 4.6',
		family: 'sonnet',
		generation: '4.6',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-sonnet-4-5',
		label: 'Sonnet 4.5',
		family: 'sonnet',
		generation: '4.5',
		thinking: 'optional'
	},
	initialModel
];

/** The picker's first-visit choice. Request resolution still has no default. */
export const INITIAL_MODEL_ID = initialModel.id;

export const MODEL_CATALOG = {
	initialModelId: INITIAL_MODEL_ID,
	models: SELECTABLE_MODELS
} satisfies ModelCatalog;

const byId = new Map(SELECTABLE_MODELS.map((model) => [model.id, model]));

/** Thrown when a request does not name a model the allowlist offers. */
export class UnknownModelError extends Error {
	constructor(requested: unknown) {
		// The value is client-supplied and ends up in the server log, so a string
		// is truncated and anything else is reported by type rather than echoed.
		let described: string;
		if (requested === undefined || requested === null) {
			described = 'No model was named, and there is no default';
		} else if (typeof requested === 'string') {
			described = `Model ${JSON.stringify(requested.slice(0, 80))} is not in the allowlist`;
		} else {
			described = `Model a ${typeof requested} is not in the allowlist`;
		}
		super(`${described}. Name one of: ${SELECTABLE_MODELS.map((m) => m.id).join(', ')}.`);
		this.name = 'UnknownModelError';
	}
}

/** Exact-match lookup. Returns `undefined` rather than throwing. */
export function findModel(id: string): SelectableModel | undefined {
	return byId.get(id);
}

/**
 * Resolve what a request asked for. Every request must name a model that
 * matches the allowlist exactly; naming nothing is an error, not a default.
 *
 * Takes `unknown` on purpose — this is the point where client input enters.
 */
export function resolveModel(requested: unknown): SelectableModel {
	if (typeof requested !== 'string') throw new UnknownModelError(requested);
	const model = findModel(requested);
	if (model === undefined) throw new UnknownModelError(requested);
	return model;
}
