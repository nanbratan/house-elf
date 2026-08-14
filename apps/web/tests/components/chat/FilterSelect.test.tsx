import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilterSelect } from '../../../src/lib/components/chat/FilterSelect.tsx';

const options = [
	{ value: 'anthropic', label: 'anthropic', hint: '16' },
	{ value: 'openai', label: 'openai', hint: '38' },
	{ value: 'google', label: 'google' }
];

function renderSelect(value: string[] = []) {
	const user = userEvent.setup();
	const onValueChange = vi.fn();

	render(
		<FilterSelect label="Provider" options={options} value={value} onValueChange={onValueChange} />
	);

	return { user, onValueChange };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: 'Provider' }));
	await waitFor(() => {
		expect(screen.getAllByRole('menuitemcheckbox').length).toBeGreaterThan(0);
	});
}

describe('FilterSelect', () => {
	it('keeps its choices out of the way until it is opened', () => {
		renderSelect();

		expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Provider' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('lists every option it was given, with its hint', async () => {
		const { user } = renderSelect();

		await openMenu(user);

		// The hint is part of the item's text content, so it lands in the
		// accessible name — assert label and hint together so a dropped hint fails.
		expect(screen.getByRole('menuitemcheckbox', { name: /anthropic\s*16/ })).toBeVisible();
		expect(screen.getByRole('menuitemcheckbox', { name: /openai\s*38/ })).toBeVisible();
		expect(screen.getByRole('menuitemcheckbox', { name: 'google' })).toBeVisible();
	});

	it('adds a choice, staying open so more than one can be made', async () => {
		// The custom part is `closeOnClick={false}`: without it the menu closes on
		// each pick, and the second assertion fails.
		const { user, onValueChange } = renderSelect(['anthropic']);

		await openMenu(user);
		await user.click(screen.getByRole('menuitemcheckbox', { name: /openai/ }));

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['anthropic', 'openai']);
		expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(3);
	});

	it('takes a choice back when it is picked a second time', async () => {
		const { user, onValueChange } = renderSelect(['openai']);

		await openMenu(user);
		await user.click(screen.getByRole('menuitemcheckbox', { name: /openai/ }));

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith([]);
	});

	it('says how many choices are standing, so a closed menu is not a silent one', () => {
		renderSelect(['anthropic', 'openai']);

		expect(screen.getByRole('button', { name: 'Provider' })).toHaveTextContent(/Provider\s*2/);
	});
});
