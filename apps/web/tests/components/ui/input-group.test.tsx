import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '../../../src/lib/components/ui/input-group.tsx';

// Only the click behaviour: the rest is a props-to-class-names wrapper covered
// by its consumers. Whether the addon exempts a nested button decides what is
// allowed to live inside one.
describe('InputGroupAddon', () => {
	it('sends a click on the dead space around the control into the control', async () => {
		const user = userEvent.setup();
		render(
			<InputGroup>
				<InputGroupInput aria-label="Search" />
				<InputGroupAddon align="inline-end">
					<span>3 models</span>
				</InputGroupAddon>
			</InputGroup>
		);

		await user.click(screen.getByText('3 models'));

		expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
	});

	it('lets a button in the addon keep the click it was given', async () => {
		const user = userEvent.setup();
		render(
			<InputGroup>
				<InputGroupInput aria-label="Search" />
				<InputGroupAddon align="inline-end">
					<button type="button">Filters</button>
				</InputGroupAddon>
			</InputGroup>
		);

		await user.click(screen.getByRole('button', { name: 'Filters' }));

		expect(screen.getByRole('textbox', { name: 'Search' })).not.toHaveFocus();
	});
});
