import type { SelectableModel } from '@house-elf/shared';

import { providerName } from './model-list.ts';

/** A toggle in the filter row, and the models it lets through. */
export interface CapabilityFilter {
	readonly id: string;
	readonly label: string;
}

/** What the reader has narrowed the list to. Empty everywhere means everything. */
export interface ModelFilters {
	readonly providers: ReadonlySet<string>;
	readonly modalities: ReadonlySet<string>;
	readonly capabilities: ReadonlySet<string>;
}

export const noFilters: ModelFilters = {
	providers: new Set(),
	modalities: new Set(),
	capabilities: new Set()
};

/** Price, not a capability — it gets a toggle of its own in the filter row. */
export const FREE = 'free';

/**
 * Capabilities this app can actually act on — not every key OpenRouter
 * publishes. A filter for something nothing in the app can set is noise.
 */
const capabilityCandidates: readonly (CapabilityFilter & {
	has(model: SelectableModel): boolean;
})[] = [
	{ id: 'reasoning', label: 'Thinking', has: (model) => supports(model, 'reasoning') },
	{ id: 'tools', label: 'Tools', has: (model) => supports(model, 'tools') },
	{ id: 'temperature', label: 'Temperature', has: (model) => supports(model, 'temperature') },
	{
		id: 'reasoning_effort',
		label: 'Thinking effort',
		has: (model) => supports(model, 'reasoning_effort')
	},
	{ id: 'verbosity', label: 'Verbosity', has: (model) => supports(model, 'verbosity') },
	{ id: FREE, label: 'Free', has: (model) => model.isFree }
];

function supports(model: SelectableModel, parameter: string): boolean {
	return model.supportedParameters.includes(parameter);
}

/**
 * The toggles worth showing, which is the ones this catalog splits on.
 *
 * A toggle every model matches filters nothing, and one no model matches yields
 * an empty list — both are dead controls. Rarity is the opposite of a reason to
 * hide one: the handful of models with an unusual capability are exactly the
 * ones that cannot be found by scrolling.
 */
export function availableCapabilities(
	models: readonly SelectableModel[]
): readonly CapabilityFilter[] {
	return capabilityCandidates
		.filter((candidate) => {
			let matching = 0;

			for (const model of models) {
				if (candidate.has(model)) matching += 1;
			}

			return matching > 0 && matching < models.length;
		})
		.map(({ id, label }) => ({ id, label }));
}

/** Every provider in the catalog, alphabetically, each with how many it holds. */
export function availableProviders(
	models: readonly SelectableModel[]
): readonly { name: string; count: number }[] {
	const counts = new Map<string, number>();

	for (const model of models) {
		const name = providerName(model);
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}

	return [...counts]
		.map(([name, count]) => ({ name, count }))
		.sort((provider, other) => provider.name.localeCompare(other.name));
}

/** Every input modality the catalog offers, alphabetically. */
export function availableModalities(models: readonly SelectableModel[]): readonly string[] {
	const modalities = new Set<string>();

	for (const model of models) {
		for (const modality of model.inputModalities) modalities.add(modality);
	}

	return [...modalities].sort((modality, other) => modality.localeCompare(other));
}

/**
 * Narrows the catalog. Choosing two providers widens the list, because they are
 * two answers to one question; choosing two capabilities narrows it, because a
 * reader asking for tools *and* thinking wants a model that does both.
 */
export function filterModels(
	models: readonly SelectableModel[],
	filters: ModelFilters
): readonly SelectableModel[] {
	if (activeFilterCount(filters) === 0) return models;

	const capabilities = capabilityCandidates.filter((candidate) =>
		filters.capabilities.has(candidate.id)
	);

	return models.filter((model) => {
		if (filters.providers.size > 0 && !filters.providers.has(providerName(model))) return false;

		if (
			filters.modalities.size > 0 &&
			!model.inputModalities.some((modality) => filters.modalities.has(modality))
		) {
			return false;
		}

		return capabilities.every((capability) => capability.has(model));
	});
}

/** How many answers the reader has given, which is what the funnel badge counts. */
export function activeFilterCount(filters: ModelFilters): number {
	return filters.providers.size + filters.modalities.size + filters.capabilities.size;
}
