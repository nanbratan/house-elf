import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TemperatureField } from '../../../src/lib/components/chat/TemperatureField.tsx';

function renderField(props: Partial<Parameters<typeof TemperatureField>[0]> = {}) {
	const onTemperatureChange = vi.fn();
	const onSendTemperatureChange = vi.fn();

	render(
		<TemperatureField
			defaultTemperature={undefined}
			onSendTemperatureChange={onSendTemperatureChange}
			onTemperatureChange={onTemperatureChange}
			sendsTemperature={false}
			temperature={1}
			{...props}
		/>
	);

	return { user: userEvent.setup(), onTemperatureChange, onSendTemperatureChange };
}

describe('what the setting does', () => {
	it('is behind the info icon rather than printed under the control', () => {
		renderField({ defaultTemperature: 0.7, temperature: 0.7 });

		expect(screen.queryByText(/varies its wording/)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'About temperature' })).toBeInTheDocument();
	});

	it('opens on a click', async () => {
		const { user } = renderField({ defaultTemperature: 0.7, temperature: 0.7 });

		await user.click(screen.getByRole('button', { name: 'About temperature' }));

		expect(await screen.findByText(/varies its wording/)).toBeInTheDocument();
	});
});

describe('a model that publishes a default', () => {
	it('shows the slider directly, with no switch to find first', () => {
		renderField({ defaultTemperature: 0.7, temperature: 0.7 });

		expect(screen.getByRole('slider', { name: 'Temperature' })).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	it('rests the slider on that default', () => {
		renderField({ defaultTemperature: 0.7, temperature: 0.7 });

		expect(screen.getByRole('slider', { name: 'Temperature' })).toHaveValue('0.7');
	});

	it('asks for a new value when the slider is moved', async () => {
		const { user, onTemperatureChange } = renderField({
			defaultTemperature: 0.7,
			temperature: 0.7
		});

		// Focus and keyboard rather than `user.type`, which clicks first: the click
		// reaches base-ui's pointer-capture drag handling, and jsdom implements no
		// Pointer Capture API. Dragging is a browser concern; stepping is the
		// behaviour this component wires up.
		screen.getByRole('slider', { name: 'Temperature' }).focus();
		await user.keyboard('{ArrowRight}');

		expect(onTemperatureChange).toHaveBeenCalledExactlyOnceWith(0.8);
	});
});

describe('the reset on a published default', () => {
	it('is absent while the slider rests on it', () => {
		// Resting on the default is nothing to return to.
		renderField({ defaultTemperature: 0.7, temperature: 0.7 });

		expect(screen.queryByRole('button', { name: 'Reset temperature' })).not.toBeInTheDocument();
	});

	it('appears once the value differs, and unsets the stored value', async () => {
		const { user, onTemperatureChange } = renderField({
			defaultTemperature: 0.7,
			temperature: 1.4
		});

		await user.click(screen.getByRole('button', { name: 'Reset temperature' }));

		expect(onTemperatureChange).toHaveBeenCalledExactlyOnceWith(undefined);
	});
});

describe('a model that publishes no default', () => {
	it('offers a switch instead of a slider, because there is no honest resting position', () => {
		renderField();

		expect(screen.getByRole('switch', { name: 'Temperature' })).not.toBeChecked();
		expect(screen.queryByRole('slider')).not.toBeInTheDocument();
	});

	it('sizes that switch like the thinking one, so the panel does not look uneven', () => {
		renderField();

		expect(screen.getByRole('switch', { name: 'Temperature' })).toHaveAttribute(
			'data-size',
			'default'
		);
	});

	it('reveals the slider at 1 once the switch is on', () => {
		renderField({ sendsTemperature: true });

		expect(screen.getByRole('slider', { name: 'Temperature' })).toHaveValue('1');
	});

	it('asks only for the switch to move, so the reader’s number survives being turned off', async () => {
		const { user, onSendTemperatureChange, onTemperatureChange } = renderField({
			sendsTemperature: true,
			temperature: 1.6
		});

		await user.click(screen.getByRole('switch', { name: 'Temperature' }));

		expect(onSendTemperatureChange).toHaveBeenCalledExactlyOnceWith(false);
		expect(onTemperatureChange).not.toHaveBeenCalled();
	});

	it('offers no reset, since there is no default to return to', () => {
		renderField({ sendsTemperature: true, temperature: 1.6 });

		expect(screen.queryByRole('button', { name: 'Reset temperature' })).not.toBeInTheDocument();
	});
});
