import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { SelectableModel } from '@house-elf/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ModelPicker from '../../../src/lib/components/chat/ModelPicker.svelte';

const models = [
	{
		id: 'anthropic/claude-opus-5',
		label: 'Opus 5',
		family: 'opus',
		generation: '5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-opus-4-5',
		label: 'Opus 4.5',
		family: 'opus',
		generation: '4.5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-sonnet-4-5',
		label: 'Sonnet 4.5',
		family: 'sonnet',
		generation: '4.5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-haiku-4-5',
		label: 'Haiku 4.5',
		family: 'haiku',
		generation: '4.5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-haiku-3-5',
		label: 'Haiku 3.5',
		family: 'haiku',
		generation: '3.5',
		thinking: 'optional'
	}
] as const satisfies readonly SelectableModel[];

afterEach(async () => {
	// bits-ui locks scrolling by writing `overflow: hidden` and `pointer-events: none`
	// onto `document.body`, and restores the old style attribute ~24ms after the last
	// lock is released. `cleanup()` only unmounts, so a test that left the modal open
	// would leave the body inert for the rest of the file. Close it as a reader would
	// and wait for the release, rather than resetting the body ourselves — that reset
	// is the behaviour under test.
	const dialog = screen.queryByRole('dialog');
	if (dialog) await fireEvent.keyDown(dialog, { key: 'Escape' });
	await waitFor(() => {
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
	});
});

async function openPicker(
	selectedModelId: string = models[0].id,
	selectedModelLabel = 'Opus 5',
	thinkingProps: { thinking?: boolean; canChooseThinking?: boolean } = {}
) {
	const user = userEvent.setup();
	const onselect = vi.fn();
	const onthinkingchange = vi.fn();
	const thinking = thinkingProps.thinking ?? false;
	render(ModelPicker, {
		props: {
			models,
			selectedModelId,
			onselect,
			thinking,
			canChooseThinking: thinkingProps.canChooseThinking ?? true,
			onthinkingchange
		}
	});
	await user.click(
		screen.getByRole('button', {
			name: `Choose model. Current model: ${selectedModelLabel}${thinking ? ', thinking on' : ''}`
		})
	);

	return { user, onselect, onthinkingchange };
}

describe('model picker', () => {
	describe('the thinking switch', () => {
		it('shows the switch off, and asks to turn thinking on when clicked', async () => {
			const { user, onthinkingchange } = await openPicker();

			const toggle = screen.getByRole('switch', { name: 'Thinking' });
			expect(toggle).toHaveAttribute('aria-checked', 'false');

			await user.click(toggle);

			expect(onthinkingchange).toHaveBeenCalledExactlyOnceWith(true);
		});

		it('turns thinking back off', async () => {
			const { user, onthinkingchange } = await openPicker(models[0].id, 'Opus 5', {
				thinking: true
			});

			expect(screen.getByRole('switch', { name: 'Thinking' })).toHaveAttribute(
				'aria-checked',
				'true'
			);

			await user.click(screen.getByRole('switch', { name: 'Thinking' }));

			expect(onthinkingchange).toHaveBeenCalledExactlyOnceWith(false);
		});

		it('has no switch to show for a model that is always on or never on', async () => {
			// `canChooseThinking` is false for the two capability states that leave
			// nothing to decide: `always` (nothing to turn off) and `unsupported`
			// (nothing to turn on). Either way, there is no question for a toggle to ask.
			await openPicker(models[0].id, 'Opus 5', { canChooseThinking: false });

			expect(screen.queryByRole('switch')).not.toBeInTheDocument();
		});
	});

	it('names thinking on the trigger, so an expensive setting is not a hidden one', async () => {
		await openPicker(models[0].id, 'Opus 5', { thinking: true });

		// The accessible name is asserted by openPicker, which finds the trigger by
		// it. This is the visible half.
		expect(
			screen.getByRole('button', { name: /Current model: Opus 5, thinking on/ })
		).toHaveTextContent('Thinking');
	});

	it('locks page scrolling only while the modal is open', async () => {
		const { user } = await openPicker();

		expect(document.body).toHaveStyle({ overflow: 'hidden' });

		await user.keyboard('{Escape}');
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
		});
	});

	it('shows each family name with the generation in every model label', async () => {
		await openPicker();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toHaveTextContent(/^Opus 5$/);
		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toHaveTextContent(/^Sonnet 4\.5$/);
		expect(screen.getByRole('option', { name: 'Haiku 3.5' })).toHaveTextContent(/^Haiku 3\.5$/);
	});

	it('finds every model in a searched family', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'Haiku' }
		});

		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Haiku 4.5' })).toBeVisible();
			expect(screen.getByRole('option', { name: 'Haiku 3.5' })).toBeVisible();
			expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
		});
	});

	it('finds every model in a searched generation', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: '4.5' }
		});

		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Opus 4.5' })).toBeVisible();
			expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toBeVisible();
			expect(screen.getByRole('option', { name: 'Haiku 4.5' })).toBeVisible();
			expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
		});
	});

	it('finds a model by its provider id', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'claude-sonnet' }
		});

		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toBeVisible();
			expect(screen.queryByRole('option', { name: 'Haiku 3.5' })).not.toBeInTheDocument();
		});
	});

	it('marks the current model as selected for assistive technology', async () => {
		await openPicker(models[2].id, 'Sonnet 4.5');

		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByRole('option', { name: 'Opus 5' })).toHaveAttribute(
			'aria-selected',
			'false'
		);
	});

	it('selects a searched model from the keyboard', async () => {
		const { user, onselect } = await openPicker();
		const search = screen.getByRole('combobox', { name: 'Search models' });

		await user.click(search);
		await fireEvent.input(search, { target: { value: 'Sonnet' } });
		await waitFor(() => {
			expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
		});
		await fireEvent.keyDown(search, { key: 'ArrowDown' });
		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await fireEvent.keyDown(search, { key: 'Enter' });

		expect(onselect).toHaveBeenCalledOnce();
		expect(onselect).toHaveBeenCalledWith(models[2].id);
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});
});
