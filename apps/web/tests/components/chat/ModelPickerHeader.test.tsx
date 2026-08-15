import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ModelFiltersProps } from '../../../src/lib/components/chat/ModelFilters.tsx';
import { ModelPickerHeader } from '../../../src/lib/components/chat/ModelPickerHeader.tsx';
import { Command, CommandList } from '../../../src/lib/components/ui/command.tsx';
import { selectableModel } from '../../helpers/models.ts';

let filtersProps: ModelFiltersProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelFilters.tsx', () => ({
	ModelFilters: (props: ModelFiltersProps) => {
		filtersProps = props;
		return <div data-testid="model-filters" />;
	}
}));

const models = [selectableModel()];
const filters = {
	providers: new Set(['anthropic']),
	modalities: new Set<string>(),
	capabilities: new Set<string>()
};

function renderHeader(overrides: { search?: string; countLabel?: string } = {}) {
	const user = userEvent.setup();
	const onSearchChange = vi.fn();
	const onFiltersChange = vi.fn();

	// A real cmdk input needs the Command context that owns its label and list.
	// ModelPicker sets the same pair on the real thing.
	render(
		<Command label="Search models">
			<ModelPickerHeader
				search={overrides.search ?? ''}
				onSearchChange={onSearchChange}
				countLabel={overrides.countLabel ?? '6 models'}
				models={models}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>
			<CommandList label="Models" />
		</Command>
	);

	return { user, onSearchChange, onFiltersChange };
}

describe('ModelPickerHeader', () => {
	// Resolved from the rendered list, not asserted as a literal: the bug this
	// replaces was an `aria-controls` naming an id nothing on the page had.
	it('points the search box at the list it drives', () => {
		renderHeader();

		expect(screen.getByRole('combobox', { name: 'Search models' })).toHaveAttribute(
			'aria-controls',
			screen.getByRole('listbox', { name: 'Models' }).id
		);
	});

	it('reports each keystroke up', async () => {
		const { user, onSearchChange } = renderHeader();

		await user.type(screen.getByRole('combobox', { name: 'Search models' }), 'o');

		expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('o');
	});

	it('offers no way to clear an empty search', () => {
		renderHeader({ search: '' });

		expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
	});

	it('clears the search and puts the caret back', async () => {
		const { user, onSearchChange } = renderHeader({ search: 'opus' });

		await user.click(screen.getByRole('button', { name: 'Clear search' }));

		expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('');
		expect(screen.getByRole('combobox', { name: 'Search models' })).toHaveFocus();
	});

	it('announces the count live, so a filter is heard before it is seen', () => {
		renderHeader({ countLabel: '2 models' });

		expect(screen.getByText('2 models')).toHaveAttribute('aria-live', 'polite');
	});

	it('hands the filter row the catalog and relays its changes', () => {
		const { onFiltersChange } = renderHeader();

		expect(filtersProps?.models).toBe(models);
		expect(filtersProps?.filters).toBe(filters);

		const next = {
			providers: new Set(['openai']),
			modalities: new Set<string>(),
			capabilities: new Set<string>()
		};
		filtersProps?.onChange(next);

		expect(onFiltersChange).toHaveBeenCalledExactlyOnceWith(next);
	});
});
