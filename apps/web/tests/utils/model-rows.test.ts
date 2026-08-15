import { describe, expect, it } from 'vitest';

import type { ModelSection } from '../../src/lib/utils/model-list.ts';
import { modelRows, type ModelListRow } from '../../src/lib/utils/model-rows.ts';
import { selectableModel } from '../helpers/models.ts';

const opus = selectableModel({ id: 'anthropic/claude-opus-5', label: 'Opus 5' });
const sonnet = selectableModel({ id: 'anthropic/claude-sonnet-4-5', label: 'Sonnet 4.5' });
const gpt = selectableModel({ id: 'openai/gpt-5.3-chat', label: 'GPT-5.3 Chat' });

const august: ModelSection = { id: '2026-08', title: 'August 2026', models: [opus, sonnet] };
const july: ModelSection = { id: '2026-07', title: 'July 2026', models: [gpt] };

const noPins = { pinned: [], pinnedIds: [], pinnedCollapsed: false };

/** What the list reads as, top to bottom: headings by title, models by label. */
function labels(rows: readonly ModelListRow[]) {
	return rows.map((row) => (row.kind === 'heading' ? `# ${row.title}` : row.model.label));
}

describe('the picker rows', () => {
	it('lays sections out as a heading followed by its models', () => {
		const { rows } = modelRows({ sections: [august, july], ...noPins });

		expect(labels(rows)).toEqual([
			'# August 2026',
			'Opus 5',
			'Sonnet 4.5',
			'# July 2026',
			'GPT-5.3 Chat'
		]);
	});

	it('has nothing at all to show for no sections and no pins', () => {
		expect(modelRows({ sections: [], ...noPins })).toEqual({
			rows: [],
			items: [],
			rowIndexByItem: []
		});
	});

	it('gives every row a distinct id, so a measurement follows its own row', () => {
		const { rows } = modelRows({
			sections: [august, july],
			pinned: [gpt],
			pinnedIds: [gpt.id],
			pinnedCollapsed: false
		});

		expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
	});
});

describe('the pinned section as rows', () => {
	it('leads with a collapsible heading counting its models', () => {
		const { rows } = modelRows({
			sections: [july],
			pinned: [opus, sonnet],
			pinnedIds: [opus.id, sonnet.id],
			pinnedCollapsed: false
		});

		expect(labels(rows)).toEqual([
			'# Pinned (2)',
			'Opus 5',
			'Sonnet 4.5',
			'# July 2026',
			'GPT-5.3 Chat'
		]);
		expect(rows[0]).toMatchObject({ kind: 'heading', collapsible: true });
	});

	it('keeps the heading but drops the models when collapsed', () => {
		const { rows } = modelRows({
			sections: [july],
			pinned: [opus, sonnet],
			pinnedIds: [opus.id, sonnet.id],
			pinnedCollapsed: true
		});

		// The heading holds the only way to unfold the section, so folding it away
		// would strand the reader.
		expect(labels(rows)).toEqual(['# Pinned (2)', '# July 2026', 'GPT-5.3 Chat']);
	});

	it('has no heading when nothing is pinned', () => {
		const { rows } = modelRows({ sections: [july], ...noPins, pinnedCollapsed: true });

		expect(labels(rows)).toEqual(['# July 2026', 'GPT-5.3 Chat']);
	});

	it('marks a pin listed outside the pinned section as pinned all the same', () => {
		// What searching looks like: the section is gone, its models rank among the
		// results, and their stars still have to read as filled.
		const { rows } = modelRows({
			sections: [{ id: 'search', title: 'Best matches', models: [opus, gpt] }],
			pinned: [],
			pinnedIds: [opus.id],
			pinnedCollapsed: false
		});

		expect(rows.filter((row) => row.kind === 'model').map((row) => row.pinned)).toEqual([
			true,
			false
		]);
	});

	it('marks only the pinned models as pinned', () => {
		const { rows } = modelRows({ sections: [august, july], ...noPins });

		expect(rows.filter((row) => row.kind === 'model').map((row) => row.pinned)).toEqual([
			false,
			false,
			false
		]);
	});
});

describe('the flat item order behind the rows', () => {
	it('is the models in row order, headings passed over', () => {
		const { items } = modelRows({
			sections: [july],
			pinned: [opus],
			pinnedIds: [opus.id],
			pinnedCollapsed: false
		});

		expect(items).toEqual([opus, gpt]);
	});

	it('leaves out a collapsed pin, which is not listed to navigate to', () => {
		const { items } = modelRows({
			sections: [july],
			pinned: [opus],
			pinnedIds: [opus.id],
			pinnedCollapsed: true
		});

		expect(items).toEqual([gpt]);
	});

	it('numbers each model row by its place in that order', () => {
		const { rows } = modelRows({ sections: [august, july], ...noPins });

		expect(rows.filter((row) => row.kind === 'model').map((row) => row.itemIndex)).toEqual([
			0, 1, 2
		]);
	});

	it('maps each item back to the row that shows it', () => {
		const { rowIndexByItem, rows } = modelRows({
			sections: [august, july],
			pinned: [gpt],
			pinnedIds: [gpt.id],
			pinnedCollapsed: false
		});

		expect(rowIndexByItem.map((rowIndex) => rows[rowIndex])).toEqual(
			rows.filter((row) => row.kind === 'model')
		);
	});
});
