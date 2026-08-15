import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelList } from '../../../src/lib/components/chat/ModelList.tsx';
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
				onToggleCollapsed={onToggleCollapsed}
				onTogglePin={onTogglePin}
				onToggleDetails={onToggleDetails}
			/>
		</Combobox>
	);

	return { onToggleCollapsed, onTogglePin, onToggleDetails };
}

/** The list top to bottom, headings marked. */
function listShape(): string[] {
	const list = screen.getByRole('listbox', { name: 'Models' });
	return [...list.children].map((child) => {
		const testid = child.getAttribute('data-testid');
		if (testid === 'list-heading') return `# ${child.textContent}`;
		if (testid?.startsWith('row-')) return testid.slice('row-'.length);
		return `? ${child.tagName}`;
	});
}

describe('ModelList', () => {
	it('renders headings and rows in the order it was given them', () => {
		renderList();

		expect(listShape()).toEqual(['# August 2026', opus.id, sonnet.id, '# July 2026', gpt.id]);
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
