import type { ModelCatalog, SelectableModel } from '@house-elf/shared';

import type { OpenRouterModel } from './openrouter-catalog';
import { openRouterCatalog } from './openrouter-catalog';

/**
 * What a chat request is allowed to name, and what the picker is shown.
 *
 * The model name arrives from the browser, on a path that spends money and can
 * reach every model OpenRouter fronts, so it is treated as untrusted input: a
 * request either names an entry in the catalog the server itself fetched, or it
 * is rejected. A client-supplied string is never interpolated into a model
 * reference.
 *
 * There is no server-side default. A request either names a model or it is
 * rejected — a default here would be a second, invisible way to spend money,
 * and it would mean a client bug that drops the field silently bills the wrong
 * model instead of failing. Choosing the initial selection is the picker's job.
 */

export type { SelectableModel } from '@house-elf/shared';

/**
 * The picker's first-visit choice. Request resolution still has no default.
 *
 * A router rather than a model, so a first message goes somewhere sensible
 * without this file holding an opinion about which model is best today.
 *
 * The `openrouter/` here is OpenRouter's own author slug, not the Mastra router
 * prefix — this is a catalog id, and `routerModelId` prefixes it again to reach
 * `openrouter/openrouter/auto`.
 */
export const INITIAL_MODEL_ID = 'openrouter/auto';

/**
 * The model the Observer runs on. Never client-supplied.
 *
 * Multimodal on purpose: a text-only model reduces an attachment to
 * `[File #1: floorplan.pdf]`, which M4 needs.
 *
 * A catalog id, like `INITIAL_MODEL_ID` — `routerModelId` adds the router prefix.
 * Bare, it resolves through Mastra's direct Google provider and wants a key this
 * repo does not carry.
 */
export const OBSERVER_MODEL_ID = '~google/gemini-flash-latest';

/**
 * The model that runs the Observer on a short input — in practice every
 * per-message extraction, since idle buffering observes one turn at a time.
 *
 * Input size is the only thing that separates the two jobs: extraction sees one
 * exchange, compaction sees the whole window, and both run through
 * `observation.model`. So a tier boundary is what splits them.
 *
 * Also multimodal (`file`, `image`, `text`), so an attachment still reaches the
 * Observer on this tier rather than being reduced to a placeholder.
 */
export const EXTRACTOR_MODEL_ID = 'openai/gpt-5.6-luna';

/** Input tokens above which observation is compaction rather than extraction. */
export const EXTRACTOR_MAX_INPUT_TOKENS = 10_000;

/** OpenRouter states `created` in seconds; the schema carries milliseconds. */
const SECONDS_TO_MS = 1000;

function providerOf(id: string): string {
	// The `~` marks a `…-latest` pointer and is part of the id, so it is stripped
	// for the derived slug only — `anthropic/claude-opus-latest` is not a model.
	return id.replace(/^~/, '').split('/')[0] ?? id;
}

function toSelectableModel(model: OpenRouterModel): SelectableModel {
	return {
		id: model.id,
		label: model.name,
		provider: providerOf(model.id),
		description: model.description,
		createdAt: model.created * SECONDS_TO_MS,
		contextLength: model.context_length,
		maxCompletionTokens: model.top_provider.max_completion_tokens ?? undefined,
		knowledgeCutoff: model.knowledge_cutoff ?? undefined,
		inputModalities: model.architecture.input_modalities,
		supportedParameters: model.supported_parameters,
		pricing: { prompt: model.pricing.prompt, completion: model.pricing.completion },
		defaultParameters: { temperature: model.default_parameters.temperature ?? undefined },
		isFree: model.pricing.prompt === '0' && model.pricing.completion === '0',
		isRouter: model.id.startsWith('openrouter/'),
		reasoning:
			model.reasoning === undefined
				? undefined
				: {
						mandatory: model.reasoning.mandatory,
						supportedEfforts: model.reasoning.supported_efforts,
						defaultEffort: model.reasoning.default_effort,
						defaultEnabled: model.reasoning.default_enabled,
						supportsMaxTokens: model.reasoning.supports_max_tokens
					}
	};
}

export async function selectableModels(): Promise<readonly SelectableModel[]> {
	return (await openRouterCatalog.list()).map(toSelectableModel);
}

export async function modelCatalog(): Promise<ModelCatalog> {
	return { initialModelId: INITIAL_MODEL_ID, models: await selectableModels() };
}

/** Thrown when a request does not name a model the catalog offers. */
export class UnknownModelError extends Error {
	constructor(requested: unknown) {
		// The value is client-supplied and ends up in the server log, so a string
		// is truncated and anything else is reported by type rather than echoed.
		// The catalog is never enumerated here; it runs to hundreds of ids.
		let described: string;
		if (requested === undefined || requested === null) {
			described = 'No model was named, and there is no default';
		} else if (typeof requested === 'string') {
			described = `Model ${JSON.stringify(requested.slice(0, 80))} is not in the catalog`;
		} else {
			described = `Model a ${typeof requested} is not in the catalog`;
		}
		super(`${described}. Choose one the model picker offers.`);
		this.name = 'UnknownModelError';
	}
}

/**
 * Resolve what a request asked for. Every request must name a model the current
 * catalog carries; naming nothing is an error, not a default.
 *
 * Takes `unknown` on purpose — this is the point where client input enters.
 */
export async function resolveModel(requested: unknown): Promise<SelectableModel> {
	if (typeof requested !== 'string') throw new UnknownModelError(requested);
	const model = await openRouterCatalog.get(requested);
	if (model === undefined) throw new UnknownModelError(requested);
	return toSelectableModel(model);
}
