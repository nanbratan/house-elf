import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CostTierField } from '../../../src/lib/components/chat/CostTierField.tsx';

function renderField(props: Partial<Parameters<typeof CostTierField>[0]> = {}) {
	const onChange = vi.fn();

	render(
		<CostTierField onChange={onChange} tiers={['low', 'medium', 'high']} value="low" {...props} />
	);

	return { user: userEvent.setup(), onChange };
}

describe('the tiers', () => {
	it('spans exactly the tiers the router accepts', () => {
		// The slider carries an index into the list, so its range is the list. There
		// is no room for a segment OpenRouter has no name for.
		renderField();

		const slider = screen.getByRole('slider', { name: 'Cost tier' });

		expect(slider).toHaveAttribute('min', '0');
		expect(slider).toHaveAttribute('max', '2');
	});

	it('rests on low, which is what a request with no tier already does', () => {
		renderField();

		expect(screen.getByRole('slider', { name: 'Cost tier' })).toHaveValue('0');
	});

	it('announces the tier’s name rather than its notch number', () => {
		renderField({ value: 'medium' });

		const slider = screen.getByRole('slider', { name: 'Cost tier' });

		expect(slider).toHaveValue('1');
		expect(slider).toHaveAttribute('aria-valuetext', 'medium');
	});

	it('shows the tier beside the label, so the slider never has to be read', () => {
		renderField({ value: 'medium' });

		expect(screen.getByText('medium')).toBeInTheDocument();
	});

	it('asks for the next tier up when the slider is stepped', async () => {
		const { user, onChange } = renderField();

		screen.getByRole('slider', { name: 'Cost tier' }).focus();
		await user.keyboard('{ArrowRight}');

		expect(onChange).toHaveBeenCalledExactlyOnceWith('medium');
	});
});

describe('what the tier means', () => {
	it('calls it a band rather than a spending limit', async () => {
		// OpenRouter's routing docs: "a tier is a band, not a ceiling, so models
		// cheaper than the band are excluded as well as models above it". Both auto
		// routers behave this way, so there is one description, not two.
		const { user } = renderField();

		await user.click(screen.getByRole('button', { name: 'About cost tier' }));

		expect(await screen.findByText(/band, not a spending limit/)).toBeInTheDocument();
		expect(screen.getByText(/cheaper than the band are ruled out/)).toBeInTheDocument();
	});
});

describe('the reset', () => {
	it('is absent while the tier is the documented default', () => {
		renderField();

		expect(screen.queryByRole('button', { name: 'Reset cost tier' })).not.toBeInTheDocument();
	});

	it('appears once a tier is chosen, and returns it', async () => {
		const { user, onChange } = renderField({ value: 'high' });

		await user.click(screen.getByRole('button', { name: 'Reset cost tier' }));

		expect(onChange).toHaveBeenCalledExactlyOnceWith('low');
	});
});
