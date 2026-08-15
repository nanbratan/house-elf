import type { SelectableModel } from '@house-elf/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ModelFilters } from '../../../src/lib/components/chat/ModelFilters.tsx';
import {
	type ModelFilters as ModelFiltersValue,
	noFilters
} from '../../../src/lib/utils/model-filters.ts';
import { selectableModel } from '../../helpers/models.ts';

const anthropicModels = [
	selectableModel({
		id: 'anthropic/claude-a',
		inputModalities: ['text', 'image'],
		supportedParameters: ['temperature', 'reasoning']
	}),
	selectableModel({ id: 'anthropic/claude-b', inputModalities: ['text'] }),
	selectableModel({ id: 'anthropic/claude-c', inputModalities: ['text'] })
];
const openaiModels = [
	selectableModel({ id: 'openai/gpt', inputModalities: ['text'], isFree: true })
];
const models: readonly SelectableModel[] = [...anthropicModels, ...openaiModels];

/**
 * The row holds no answers of its own — the picker does, and outlives it — so a
 * test has to stand in for that owner, as `Picker` below stands in for its
 * unmounting too.
 */
function Owner({
	catalog,
	onChange,
	mounted
}: {
	catalog: readonly SelectableModel[];
	onChange: (filters: ModelFiltersValue) => void;
	mounted: boolean;
}) {
	const [filters, setFilters] = useState<ModelFiltersValue>(noFilters);

	return mounted ? (
		<ModelFilters
			models={catalog}
			filters={filters}
			onChange={(next) => {
				setFilters(next);
				onChange(next);
			}}
		/>
	) : null;
}

function renderFilters(catalog: readonly SelectableModel[] = models) {
	const user = userEvent.setup();
	const onChange = vi.fn();

	const view = render(<Owner catalog={catalog} onChange={onChange} mounted />);

	return { user, onChange, view };
}

async function openFilters(catalog?: readonly SelectableModel[]) {
	const rendered = renderFilters(catalog);

	await rendered.user.click(screen.getByRole('button', { name: 'Filters' }));

	return rendered;
}

/**
 * Opens one filter's popup. The popup mounts a tick after the trigger is
 * clicked, so its options cannot be queried in the same breath.
 */
async function openPopup(user: ReturnType<typeof userEvent.setup>, label: string) {
	await user.click(screen.getByRole('combobox', { name: label }));
	await waitFor(() => {
		expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
	});
}

/**
 * Dismisses the open popup and waits for it to leave the tree. None of the
 * three popups is modal, so this is not needed to reach the rest of the row —
 * it keeps only one set of options in the tree at a time, so an option can be
 * asked for by name without saying which popup it belongs to.
 */
async function closePopup(user: ReturnType<typeof userEvent.setup>) {
	await user.keyboard('{Escape}');
	await waitFor(() => {
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
	});
}

/** Opens a filter, picks one option, and dismisses it again. */
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, optionName: string) {
	await openPopup(user, label);
	await user.click(screen.getByRole('option', { name: new RegExp(optionName) }));
	await closePopup(user);
}

describe('ModelFilters', () => {
	it('stays out of the way until it is asked for', () => {
		renderFilters();

		expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('opens on the funnel', async () => {
		await openFilters();

		expect(screen.getByRole('combobox', { name: 'Provider' })).toBeVisible();
		expect(screen.getByRole('combobox', { name: 'Accepts' })).toBeVisible();
		expect(screen.getByRole('combobox', { name: 'Can do' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	});

	it('offers each provider with the weight it carries', async () => {
		const { user } = await openFilters();

		await openPopup(user, 'Provider');

		expect(screen.getByRole('option', { name: /anthropic/ })).toHaveTextContent(/anthropic\s*3/);
		expect(screen.getByRole('option', { name: /openai/ })).toHaveTextContent(/openai\s*1/);
	});

	it('offers every input the catalog accepts', async () => {
		const { user } = await openFilters();

		await openPopup(user, 'Accepts');

		expect(screen.getByRole('option', { name: 'image' })).toBeVisible();
		expect(screen.getByRole('option', { name: 'text' })).toBeVisible();
	});

	it('asks about price on its own, not among the capabilities', async () => {
		const { user } = await openFilters();

		await openPopup(user, 'Can do');

		expect(screen.getByRole('option', { name: 'Thinking' })).toBeVisible();
		expect(screen.queryByRole('option', { name: 'Free' })).not.toBeInTheDocument();

		await closePopup(user);

		expect(screen.getByRole('button', { name: 'Free', pressed: false })).toBeVisible();
	});

	it('has no free toggle when nothing in the catalog is free', async () => {
		await openFilters(anthropicModels);

		expect(screen.queryByRole('button', { name: 'Free' })).not.toBeInTheDocument();
	});

	it('has no capability list at all when the catalog splits on nothing', async () => {
		await openFilters([selectableModel()]);

		expect(screen.queryByRole('combobox', { name: 'Can do' })).not.toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Provider' })).toBeVisible();
		expect(screen.getByRole('combobox', { name: 'Accepts' })).toBeVisible();
	});

	it('reports a chosen provider', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Provider', 'openai');

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});
	});

	it('reports a chosen input', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Accepts', 'image');

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('reports free alongside the capabilities, since that is what it filters on', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Can do', 'Thinking');
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(),
			modalities: new Set(),
			capabilities: new Set(['reasoning', 'free'])
		});
	});

	it('keeps every answer given, not only the last one', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Provider', 'openai');
		await choose(user, 'Accepts', 'image');

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(['openai']),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('takes more than one answer to the same question without reopening', async () => {
		const { user, onChange } = await openFilters();

		await openPopup(user, 'Accepts');
		await user.click(screen.getByRole('option', { name: 'image' }));
		await user.click(screen.getByRole('option', { name: 'text' }));

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(),
			modalities: new Set(['image', 'text']),
			capabilities: new Set()
		});
	});

	it('counts the answers given on the funnel', async () => {
		const { user } = await openFilters();

		await choose(user, 'Provider', 'anthropic');
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('2');
	});

	it('counts the answers given on the pill they were given to', async () => {
		const { user } = await openFilters();

		await choose(user, 'Accepts', 'image');

		expect(screen.getByRole('combobox', { name: 'Accepts' })).toHaveTextContent('1');
		expect(screen.getByRole('combobox', { name: 'Provider' })).not.toHaveTextContent('1');
	});

	it('offers nothing to clear until there is something to clear', async () => {
		const { user } = await openFilters();

		expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

		await choose(user, 'Accepts', 'image');

		expect(screen.getByRole('button', { name: 'Clear filters' })).toBeVisible();
	});

	it('takes every answer back at once', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Provider', 'openai');
		await choose(user, 'Accepts', 'image');
		await user.click(screen.getByRole('button', { name: 'Free' }));
		await user.click(screen.getByRole('button', { name: 'Clear filters' }));

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(),
			modalities: new Set(),
			capabilities: new Set()
		});
		expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('1');
		expect(screen.getByRole('combobox', { name: 'Provider' })).not.toHaveTextContent('1');
		expect(screen.getByRole('button', { name: 'Free', pressed: false })).toBeVisible();
	});

	it('still shows the answers when the picker that holds them reopens', async () => {
		// The row unmounts with the picker while the picker goes on narrowing the
		// list — so an answer kept only in the row would leave the list filtered by
		// something no pill admitted to.
		const { user, view } = await openFilters();

		await choose(user, 'Accepts', 'image');
		view.rerender(<Owner catalog={models} onChange={vi.fn()} mounted={false} />);
		view.rerender(<Owner catalog={models} onChange={vi.fn()} mounted />);

		expect(screen.getByRole('combobox', { name: 'Accepts' })).toHaveTextContent('1');
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('1');
	});

	it('leaves the filters standing once they have been used', async () => {
		// The row describes the catalog, not the narrowed list — a filter that
		// disappeared the moment it was used could not be undone.
		const { user } = await openFilters();

		await choose(user, 'Provider', 'openai');

		expect(screen.getByRole('combobox', { name: 'Accepts' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Free' })).toBeVisible();
	});

	describe('the provider search', () => {
		it('narrows the list to what was typed', async () => {
			const { user } = await openFilters();

			await openPopup(user, 'Provider');
			await user.type(screen.getByRole('combobox', { name: 'Search providers' }), 'open');

			await waitFor(() => {
				expect(screen.queryByRole('option', { name: /anthropic/ })).not.toBeInTheDocument();
			});
			expect(screen.getByRole('option', { name: /openai/ })).toBeVisible();
		});

		it('says so when nothing matches', async () => {
			const { user } = await openFilters();

			await openPopup(user, 'Provider');
			await user.type(screen.getByRole('combobox', { name: 'Search providers' }), 'mistral');

			expect(await screen.findByText('No provider matches')).toBeVisible();
			expect(screen.queryByRole('option')).not.toBeInTheDocument();
		});

		it('clears the query but stays open once an answer is given', async () => {
			const { user, onChange } = await openFilters();

			await openPopup(user, 'Provider');
			const search = screen.getByRole('combobox', { name: 'Search providers' });
			await user.type(search, 'open');
			await user.click(await screen.findByRole('option', { name: /openai/ }));

			expect(onChange).toHaveBeenCalledExactlyOnceWith({
				providers: new Set(['openai']),
				modalities: new Set(),
				capabilities: new Set()
			});
			expect(search).toHaveValue('');
			await waitFor(() => {
				expect(screen.getByRole('option', { name: /anthropic/ })).toBeVisible();
			});
		});

		it('offers the whole catalog again when it is reopened', async () => {
			const { user } = await openFilters();

			await openPopup(user, 'Provider');
			await user.type(screen.getByRole('combobox', { name: 'Search providers' }), 'open');
			await waitFor(() => {
				expect(screen.queryByRole('option', { name: /anthropic/ })).not.toBeInTheDocument();
			});
			await closePopup(user);

			await openPopup(user, 'Provider');

			expect(screen.getByRole('option', { name: /anthropic/ })).toBeVisible();
		});
	});
});
