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
 * Only for reading. `~anthropic/claude-opus-latest` *is* the id — the tilde is
 * what makes it follow Anthropic forward — so a stripped value must never be
 * written back onto anything sent to the server.
 */
export function providerName(model: SelectableModel): string {
	return model.provider.startsWith('~') ? model.provider.slice(1) : model.provider;
}

function monthOf(model: SelectableModel): string {
	return new Date(model.createdAt).toISOString().slice(0, 7);
}

/**
 * Routers first, then release months, newest first.
 *
 * Depends on the catalog alone, which is fetched once and does not change while
 * the picker is open — so this belongs to a `$derived` on the models, not to
 * one a keystroke invalidates.
 */
export function releaseSections(models: readonly SelectableModel[]): readonly ModelSection[] {
	const routers: SelectableModel[] = [];
	const byMonth = new Map<string, SelectableModel[]>();

	for (const model of models) {
		// Routers pick a model per request, so their own release date groups
		// nothing. They sit above the months rather than inside one.
		if (model.isRouter) {
			routers.push(model);
			continue;
		}

		const month = monthOf(model);
		const released = byMonth.get(month);

		if (released) released.push(model);
		else byMonth.set(month, [model]);
	}

	const months = [...byMonth]
		.sort(([month], [other]) => other.localeCompare(month))
		.map(([month, released]) => ({
			id: month,
			title: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
			models: released.sort((model, other) => other.createdAt - model.createdAt)
		}));

	return routers.length === 0
		? months
		: [{ id: 'routers', title: 'Routers', models: routers }, ...months];
}

/**
 * What the reader typed, as one ranked list.
 *
 * Grouping a result set fragments it into one-row sections, which helps nobody,
 * and while searching the order wanted is best match rather than most recent.
 * The label is the only thing matched: it is what a row is looked up by, and
 * provider gets a filter of its own rather than a second, invisible meaning here.
 */
export function searchSections(
	models: readonly SelectableModel[],
	search: string
): readonly ModelSection[] {
	const query = search.trim().toLowerCase();
	// A label the query opens ranks above one that merely contains it, so "opus"
	// leads with Opus rather than with something that mentions it further in.
	const opening: SelectableModel[] = [];
	const containing: SelectableModel[] = [];

	for (const model of models) {
		const label = model.label.toLowerCase();

		if (label.startsWith(query)) opening.push(model);
		else if (label.includes(query)) containing.push(model);
	}

	const matches = [...opening, ...containing];

	return matches.length === 0 ? [] : [{ id: 'search', title: 'Best matches', models: matches }];
}
