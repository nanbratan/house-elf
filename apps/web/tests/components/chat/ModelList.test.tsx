import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
	ModelList,
	type ModelListVirtualizer
} from '../../../src/lib/components/chat/ModelList.tsx';
import type { ModelRowProps } from '../../../src/lib/components/chat/ModelRow.tsx';
import { Combobox } from '../../../src/lib/components/ui/combobox.tsx';
import { modelRows, type ModelListRow } from '../../../src/lib/utils/model-rows.ts';
import { selectableModel } from '../../helpers/models.ts';

const rowPropsById = new Map<string, ModelRowProps>();
vi.mock('../../../src/lib/components/chat/ModelRow.tsx', () => ({
	ModelRow: (props: ModelRowProps) => {
		rowPropsById.set(props.model.id, props);
		return <div data-testid={`row-${props.model.id}`} />;
	}
}));

const opus = selectableModel({ id: 'anthropic/claude-opus-5', label: 'Opus 5' });
const sonnet = selectableModel({ id: 'anthropic/claude-sonnet-4-5', label: 'Sonnet 4.5' });
const gpt = selectableModel({ id: 'openai/gpt-5.3-chat', label: 'GPT-5.3 Chat' });

const august = { id: '2026-08', title: 'August 2026', models: [opus, sonnet] };
const july = { id: '2026-07', title: 'July 2026', models: [gpt] };

function renderList(
	overrides: {
		rows?: readonly ModelListRow[];
		itemCount?: number;
		detailsOpenId?: string | null;
		pinnedCollapsed?: boolean;
	} = {}
) {
	const built = modelRows({
		sections: [august, july],
		pinned: [],
		pinnedIds: [],
		pinnedCollapsed: false
	});
	const virtualizerRef = createRef<ModelListVirtualizer>();
	const onToggleCollapsed = vi.fn();
	const onTogglePin = vi.fn();
	const onToggleDetails = vi.fn();

	render(
		<Combobox inline open items={built.items}>
			<ModelList
				rows={overrides.rows ?? built.rows}
				itemCount={overrides.itemCount ?? built.items.length}
				selectedModelId={sonnet.id}
				detailsOpenId={overrides.detailsOpenId ?? null}
				pinnedCollapsed={overrides.pinnedCollapsed ?? false}
				virtualizerRef={virtualizerRef}
				onToggleCollapsed={onToggleCollapsed}
				onTogglePin={onTogglePin}
				onToggleDetails={onToggleDetails}
			/>
		</Combobox>
	);

	return { virtualizerRef, onToggleCollapsed, onTogglePin, onToggleDetails };
}

/**
 * The list top to bottom, headings marked. Read from the rendered rows rather
 * than the listbox's children: the virtualizer nests them under a scroller and
 * a sizing wrapper, and lays them out by transform, so document order is the
 * only order there is.
 */
function listShape(): string[] {
	return screen.queryAllByTestId(/^(row-|list-heading$)/).map((element) => {
		const testid = element.getAttribute('data-testid') ?? '';
		return testid === 'list-heading' ? `# ${element.textContent}` : testid.slice('row-'.length);
	});
}

describe('ModelList', () => {
	it('renders headings and rows in the order it was given them', () => {
		renderList();

		expect(listShape()).toEqual(['# August 2026', opus.id, sonnet.id, '# July 2026', gpt.id]);
	});

	it('mounts a window of rows, not the catalog', () => {
		// The whole point of the exercise: 500 models must not become 500 mounted
		// rows. The exact size of the window is the virtualizer's business — that it
		// is far short of everything, and not empty, is ours.
		const many = Array.from({ length: 500 }, (_, index) =>
			selectableModel({ id: `p/model-${String(index)}`, label: `Model ${String(index)}` })
		);
		const built = modelRows({
			sections: [{ id: 'all', title: 'All', models: many }],
			pinned: [],
			pinnedIds: [],
			pinnedCollapsed: false
		});

		renderList({ rows: built.rows, itemCount: built.items.length });

		const mounted = screen.queryAllByTestId(/^row-/).length;

		expect(mounted).toBeGreaterThan(0);
		expect(mounted).toBeLessThan(100);
	});

	it('hands each row its place in the flat list and the size of it', () => {
		renderList();

		expect(rowPropsById.get(gpt.id)?.index).toBe(2);
		expect(rowPropsById.get(gpt.id)?.listedCount).toBe(3);
	});

	it('marks the selected model, and only it', () => {
		renderList();

		expect(rowPropsById.get(sonnet.id)?.selected).toBe(true);
		expect(rowPropsById.get(opus.id)?.selected).toBe(false);
	});

	it('opens the details of one row at a time', () => {
		renderList({ detailsOpenId: opus.id });

		expect(rowPropsById.get(opus.id)?.detailsOpen).toBe(true);
		expect(rowPropsById.get(sonnet.id)?.detailsOpen).toBe(false);
	});

	it('says so when there is nothing to list', () => {
		renderList({ rows: [], itemCount: 0 });

		expect(screen.getByText('No models found.')).toBeVisible();
	});

	it('offers no fold on an ordinary heading', () => {
		renderList();

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('folds the pinned heading, which is the only one that folds', async () => {
		const pinned = modelRows({
			sections: [july],
			pinned: [opus],
			pinnedIds: [opus.id],
			pinnedCollapsed: false
		});
		const { onToggleCollapsed } = renderList({
			rows: pinned.rows,
			itemCount: pinned.items.length
		});

		await userEvent.setup().click(screen.getByRole('button', { expanded: true }));

		expect(onToggleCollapsed).toHaveBeenCalledOnce();
	});
});
