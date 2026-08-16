import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReasoningField } from '../../../src/lib/components/chat/ReasoningField.tsx';

function renderField(props: Partial<Parameters<typeof ReasoningField>[0]> = {}) {
	const onThinkingChange = vi.fn();
	const onEffortChange = vi.fn();

	render(
		<ReasoningField
			defaultEffort="low"
			effort="low"
			efforts={['low', 'high']}
			mandatory={false}
			onEffortChange={onEffortChange}
			onThinkingChange={onThinkingChange}
			thinking={false}
			{...props}
		/>
	);

	return { user: userEvent.setup(), onThinkingChange, onEffortChange };
}

describe('the thinking switch', () => {
	it('reports the current state', () => {
		renderField({ thinking: true });

		expect(screen.getByRole('switch', { name: 'Thinking' })).toBeChecked();
	});

	it('asks to turn thinking on', async () => {
		const { user, onThinkingChange } = renderField();

		await user.click(screen.getByRole('switch', { name: 'Thinking' }));

		expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('asks to turn it off again', async () => {
		const { user, onThinkingChange } = renderField({ thinking: true });

		await user.click(screen.getByRole('switch', { name: 'Thinking' }));

		expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(false);
	});
});

describe('what a setting does', () => {
	it('is behind the info icon rather than printed under the control', () => {
		// Four fields with a paragraph each turns the panel into a wall of prose.
		renderField();

		expect(screen.queryByText(/Works through the problem/)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'About thinking' })).toBeInTheDocument();
	});

	it('opens on a click, so it is reachable without a mouse to hover with', async () => {
		const { user } = renderField();

		await user.click(screen.getByRole('button', { name: 'About thinking' }));

		expect(await screen.findByText(/Works through the problem/)).toBeInTheDocument();
	});

	it('explains instead why a mandatory thinker cannot be stopped', async () => {
		const { user } = renderField({ mandatory: true, thinking: true });

		await user.click(screen.getByRole('button', { name: 'About thinking' }));

		expect(await screen.findByText(/It cannot be asked to stop/)).toBeInTheDocument();
	});
});

describe('a model that cannot be asked to stop', () => {
	it('shows the switch on and disabled', () => {
		// There is no off option to hide, and hiding the section would leave the
		// reader assuming the opposite of what the model does.
		renderField({ mandatory: true, thinking: true });
		const toggle = screen.getByRole('switch', { name: 'Thinking' });

		expect(toggle).toBeChecked();
		// base-ui renders the switch as a span with the ARIA state, not as a native
		// control, so `toBeDisabled` has nothing to read.
		expect(toggle).toHaveAttribute('aria-disabled', 'true');
	});

	it('cannot be switched off by clicking it', async () => {
		const { user, onThinkingChange } = renderField({ mandatory: true, thinking: true });

		await user.click(screen.getByRole('switch', { name: 'Thinking' }));

		expect(onThinkingChange).not.toHaveBeenCalled();
	});
});

describe('the effort control', () => {
	it('is absent while thinking is off, because a level would describe nothing', () => {
		renderField({ thinking: false });

		expect(screen.queryByRole('group', { name: 'Effort' })).not.toBeInTheDocument();
	});

	it('is absent for a model that takes no level, even when thinking is on', () => {
		renderField({ thinking: true, efforts: [] });

		expect(screen.queryByRole('group', { name: 'Effort' })).not.toBeInTheDocument();
	});

	it('always has a level selected, so it never reads as no effort at all', () => {
		renderField({ thinking: true });

		const slider = screen.getByRole('slider', { name: 'Effort' });

		expect(slider).toHaveValue('0');
		expect(slider).toHaveAttribute('aria-valuetext', 'low');
	});

	it('spans exactly the model’s own levels', () => {
		// The slider carries an index into the list, so its range is the list. There
		// is no room for a level OpenRouter has no name for.
		renderField({ thinking: true });

		expect(screen.getByRole('slider', { name: 'Effort' })).toHaveAttribute('max', '1');
	});

	it('shows the level beside the label, so the slider never has to be read', () => {
		renderField({ thinking: true, effort: 'high' });

		expect(screen.getByText('high')).toBeInTheDocument();
	});

	it('asks for the next level up when the slider is stepped', async () => {
		const { user, onEffortChange } = renderField({ thinking: true });

		screen.getByRole('slider', { name: 'Effort' }).focus();
		await user.keyboard('{ArrowRight}');

		expect(onEffortChange).toHaveBeenCalledExactlyOnceWith('high');
	});

	it('draws no slider for a model with a single level, which cannot be a range', () => {
		// `mistralai/mistral-small-2603` publishes exactly one, and a slider whose
		// min equals its max is not a control. The header still names the level.
		renderField({ thinking: true, efforts: ['high'], effort: 'high', defaultEffort: 'high' });

		expect(screen.queryByRole('slider')).not.toBeInTheDocument();
		expect(screen.getByText('high')).toBeInTheDocument();
	});
});

describe('the effort reset', () => {
	it('is absent while the level is the model’s own default', () => {
		renderField({ thinking: true });

		expect(screen.queryByRole('button', { name: 'Reset effort' })).not.toBeInTheDocument();
	});

	it('appears once the level differs, and returns it to the default', async () => {
		const { user, onEffortChange } = renderField({ thinking: true, effort: 'high' });

		await user.click(screen.getByRole('button', { name: 'Reset effort' }));

		expect(onEffortChange).toHaveBeenCalledExactlyOnceWith('low');
	});
});
