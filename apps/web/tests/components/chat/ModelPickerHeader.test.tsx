import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ModelFiltersProps } from '../../../src/lib/components/chat/ModelFilters.tsx';
import { ModelPickerHeader } from '../../../src/lib/components/chat/ModelPickerHeader.tsx';
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

	render(
		<ModelPickerHeader
			search={overrides.search ?? ''}
			onSearchChange={onSearchChange}
			listId="test-list"
			countLabel={overrides.countLabel ?? '6 models'}
			models={models}
			filters={filters}
			onFiltersChange={onFiltersChange}
		/>
	);

	return { user, onSearchChange, onFiltersChange };
}

describe('ModelPickerHeader', () => {
	it('points the search box at the list it drives', () => {
		renderHeader();

		expect(screen.getByRole('combobox', { name: 'Search models' })).toHaveAttribute(
			'aria-controls',
			'test-list'
		);
	});

	it('reports each keystroke up', async () => {
		const { user, onSearchChange } = renderHeader();

		await user.type(screen.getByRole('combobox', { name: 'Search models' }), 'o');

		expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('o');
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
