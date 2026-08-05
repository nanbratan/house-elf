import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FilterSelect from '../../../src/lib/components/chat/FilterSelect.svelte';

const options = [
	{ value: 'anthropic', label: 'anthropic', hint: '16' },
	{ value: 'openai', label: 'openai', hint: '38' },
	{ value: 'google', label: 'google' }
];

function renderSelect(value: string[] = []) {
	const user = userEvent.setup();
	const onValueChange = vi.fn();

	render(FilterSelect, { label: 'Provider', options, value, onValueChange });

	return { user, onValueChange };
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: 'Provider' }));
	await waitFor(() => {
		expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
	});
}

afterEach(async () => {
	// bits-ui locks body scrolling while the list is open and restores the style
	// attribute a moment after it closes. Close it as a reader would, so the next
	// test in the file does not start on an inert page.
	if (screen.queryAllByRole('option').length > 0) {
		await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
		await waitFor(() => {
			expect(screen.queryByRole('option')).not.toBeInTheDocument();
		});
	}
});

describe('FilterSelect', () => {
	it('keeps its choices out of the way until it is opened', () => {
		renderSelect();

		expect(screen.queryByRole('option')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Provider' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('lists every option it was given, with its hint', async () => {
		const { user } = renderSelect();

		await openList(user);

		expect(screen.getByRole('option', { name: /anthropic/ })).toHaveTextContent(/anthropic\s*16/);
		expect(screen.getByRole('option', { name: /openai/ })).toBeVisible();
		expect(screen.getByRole('option', { name: 'google' })).toBeVisible();
	});

	it('reports a choice without waiting to be closed', async () => {
		const { user, onValueChange } = renderSelect();

		await openList(user);
		await user.click(screen.getByRole('option', { name: /openai/ }));

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['openai']);
	});

	it('adds to the choices already made rather than replacing them', async () => {
		const { user, onValueChange } = renderSelect(['anthropic']);

		await openList(user);
		await user.click(screen.getByRole('option', { name: /openai/ }));

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['anthropic', 'openai']);
	});

	it('takes a choice back when it is picked a second time', async () => {
		const { user, onValueChange } = renderSelect(['openai']);

		await openList(user);
		await user.click(screen.getByRole('option', { name: /openai/ }));

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith([]);
	});

	it('says how many choices are standing, so a closed list is not a silent one', () => {
		renderSelect(['anthropic', 'openai']);

		expect(screen.getByRole('button', { name: 'Provider' })).toHaveTextContent(/Provider\s*2/);
	});
});
