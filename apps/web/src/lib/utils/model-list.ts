import type { SelectableModel } from '@house-elf/shared';

/** One headed block of the picker's list. */
export interface ModelSection {
	/** Stable across renders, so a keyed `{#each}` does not rebuild the list. */
	readonly id: string;
	readonly title: string;
	readonly models: readonly SelectableModel[];
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

/**
 * The provider as it should be read, without the `~` that marks a pointer.
 *
 * Only for reading and matching. `~anthropic/claude-opus-latest` *is* the id —
 * the tilde is what makes it follow Anthropic forward — so a stripped value must
 * never be written back onto anything sent to the server.
 */
export function providerName(model: SelectableModel): string {
	return model.provider.startsWith('~') ? model.provider.slice(1) : model.provider;
}

const NO_MATCH = 3;

/**
 * How well a model answers the query, lowest first. Label before provider,
 * because a reader typing "opus" is naming a model, and a reader typing
 * "anthropic" is naming a shelf to look on.
 */
function rankOf(model: SelectableModel, query: string): number {
	const label = model.label.toLowerCase();

	if (label.startsWith(query)) return 0;
	if (label.includes(query)) return 1;
	if (providerName(model).toLowerCase().includes(query)) return 2;

	return NO_MATCH;
}

function monthOf(model: SelectableModel): string {
	return new Date(model.createdAt).toISOString().slice(0, 7);
}

function releaseSections(models: readonly SelectableModel[]): readonly ModelSection[] {
	const byMonth = new Map<string, SelectableModel[]>();

	for (const model of models) {
		const month = monthOf(model);
		const released = byMonth.get(month);

		if (released) released.push(model);
		else byMonth.set(month, [model]);
	}

	return [...byMonth]
		.sort(([month], [other]) => other.localeCompare(month))
		.map(([month, released]) => ({
			id: month,
			title: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
			models: released.toSorted((model, other) => other.createdAt - model.createdAt)
		}));
}

/**
 * The picker's list: routers first, then everything else by release month,
 * newest month first.
 *
 * A search flattens all of that into one ranked list. Grouping a search result
 * fragments it into one-row sections, which helps nobody — and while searching,
 * "best match" is the order the reader wants, not "most recent".
 */
export function modelSections(
	models: readonly SelectableModel[],
	search: string
): readonly ModelSection[] {
	const query = search.trim().toLowerCase();

	if (query !== '') {
		const matches = models
			.map((model) => ({ model, rank: rankOf(model, query) }))
			.filter(({ rank }) => rank !== NO_MATCH)
			.sort((match, other) => match.rank - other.rank)
			.map(({ model }) => model);

		return matches.length === 0 ? [] : [{ id: 'search', title: 'Best matches', models: matches }];
	}

	const routers = models.filter((model) => model.isRouter);
	const sections = releaseSections(models.filter((model) => !model.isRouter));

	// Routers have no release month worth grouping by — they pick a model per
	// request — so they sit above the months rather than inside one.
	return routers.length === 0
		? sections
		: [{ id: 'routers', title: 'Routers', models: routers }, ...sections];
}
