import type { SelectableModel } from '@house-elf/shared';

import type { ModelSection } from './model-list.ts';

/** A section heading, rendered as text rather than as a listbox option. */
export interface HeadingRow {
	readonly kind: 'heading';
	readonly id: string;
	readonly title: string;
	/**
	 * True only for the pinned heading, which carries the collapse toggle. The
	 * heading is a row rather than a wrapper so that a virtualized list can
	 * measure and scroll it like any other.
	 */
	readonly collapsible: boolean;
}

/** One model, and everything a row needs that the model itself does not say. */
export interface ModelListItemRow {
	readonly kind: 'model';
	readonly id: string;
	readonly model: SelectableModel;
	/** Position among model rows only, so it addresses the flat `items` array. */
	readonly itemIndex: number;
	readonly pinned: boolean;
}

export type ModelListRow = HeadingRow | ModelListItemRow;

export interface ModelRowsOptions {
	/** The browse or search sections, in the order they are shown. */
	readonly sections: readonly ModelSection[];
	/**
	 * The models of the pinned section, resolved and sorted. Empty when the
	 * section is not shown at all — while searching, pins are ordinary results.
	 */
	readonly pinned: readonly SelectableModel[];
	/** Every pinned id, including ones the pinned section is not showing. */
	readonly pinnedIds: readonly string[];
	readonly pinnedCollapsed: boolean;
}

export interface ModelRows {
	readonly rows: readonly ModelListRow[];
	/**
	 * The model rows' models, in row order. This is what the combobox navigates,
	 * so it must describe what is actually listed — a collapsed pinned section
	 * contributes nothing here either.
	 */
	readonly items: readonly SelectableModel[];
	/** Item index → row index, for scrolling a highlight into view. */
	readonly rowIndexByItem: readonly number[];
}

/**
 * The picker's list as one flat sequence of rows.
 *
 * Headings become rows so that the whole list is a single virtualizable
 * sequence and a flat listbox: nesting groups would mean either measuring a
 * group as one unit or navigating a tree, and the list is read top to bottom
 * regardless of which heading a row sits under.
 */
export function modelRows({
	sections,
	pinned,
	pinnedIds,
	pinnedCollapsed
}: ModelRowsOptions): ModelRows {
	const pinnedIdSet = new Set(pinnedIds);
	const rows: ModelListRow[] = [];
	const items: SelectableModel[] = [];
	const rowIndexByItem: number[] = [];

	function pushModel(model: SelectableModel, prefix: string) {
		rowIndexByItem.push(rows.length);
		rows.push({
			kind: 'model',
			// Prefixed by where the row sits, not by the model alone: the id keys the
			// virtualizer's size cache, and a pin listed twice would otherwise have
			// one row's measured height applied to both.
			id: `${prefix}:${model.id}`,
			model,
			itemIndex: items.length,
			pinned: pinnedIdSet.has(model.id)
		});
		items.push(model);
	}

	if (pinned.length > 0) {
		rows.push({
			kind: 'heading',
			id: 'heading:pinned',
			title: `Pinned (${String(pinned.length)})`,
			collapsible: true
		});

		// Collapsed drops the rows but keeps the heading: the toggle that folded
		// the section is the only way back, so it has to survive the fold.
		if (!pinnedCollapsed) for (const model of pinned) pushModel(model, 'pinned');
	}

	for (const section of sections) {
		rows.push({
			kind: 'heading',
			id: `heading:${section.id}`,
			title: section.title,
			collapsible: false
		});

		for (const model of section.models) pushModel(model, section.id);
	}

	return { rows, items, rowIndexByItem };
}
