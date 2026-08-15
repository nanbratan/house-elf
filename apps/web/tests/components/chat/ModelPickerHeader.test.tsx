import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ModelFiltersProps } from '../../../src/lib/components/chat/ModelFilters.tsx';
import { ModelPickerHeader } from '../../../src/lib/components/chat/ModelPickerHeader.tsx';
import { Combobox, ComboboxList } from '../../../src/lib/components/ui/combobox.tsx';
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
	const onInputValueChange = vi.fn();

	// The input is a real `Combobox.Input`, so it needs the root that owns the
	// list it points at. `inline open` is the composition ModelPicker uses.
	render(
		<Combobox
			inline
			open
			items={models}
			inputValue={overrides.search ?? ''}
			onInputValueChange={onInputValueChange}
		>
			<ModelPickerHeader
				search={overrides.search ?? ''}
				onSearchChange={onSearchChange}
				countLabel={overrides.countLabel ?? '6 models'}
				models={models}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>
			<ComboboxList aria-label="Models" />
		</Combobox>
	);

	return { user, onSearchChange, onFiltersChange, onInputValueChange };
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

	// The query belongs to the combobox root now, not to the header — the header
	// reports only the clear.
	it('reports each keystroke up to the combobox that owns the query', async () => {
		const { user, onInputValueChange } = renderHeader();

		await user.type(screen.getByRole('combobox', { name: 'Search models' }), 'o');

		expect(onInputValueChange).toHaveBeenCalledOnce();
		expect(onInputValueChange.mock.calls[0]?.[0]).toBe('o');
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
