import { fireEvent, render, screen } from '@testing-library/svelte';
import type { SelectableModel } from '@house-elf/shared';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { modelPickerStub } from '../../stubs/keys';
import { stubCallback, stubProps } from '../../stubs/stub-props';

vi.mock('../../../src/lib/components/chat/ModelPicker.svelte', async () => ({
	default: (await import('../../stubs/ModelPickerStub.svelte')).default
}));

const Composer = (await import('../../../src/lib/components/chat/Composer.svelte')).default;

const models = [
	{
		id: 'anthropic/claude-opus-5',
		label: 'Opus 5',
		family: 'opus',
		generation: '5',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-sonnet-4-6',
		label: 'Sonnet 4.6',
		family: 'sonnet',
		generation: '4.6',
		thinking: 'optional'
	},
	{
		id: 'anthropic/claude-haiku-4-5',
		label: 'Haiku 4.5',
		family: 'haiku',
		generation: '4.5',
		thinking: 'optional'
	}
] as const;

function renderComposer(
	status: 'ready' | 'submitted' | 'streaming' | 'error' = 'ready',
	selectedModelId = 'anthropic/claude-haiku-4-5',
	availableModels: readonly SelectableModel[] = models
) {
	const onsend = vi.fn();
	const onstop = vi.fn();
	const onmodelselect = vi.fn();
	const onthinkingchange = vi.fn();
	const { container, unmount } = render(Composer, {
		props: {
			status,
			onsend,
			onstop,
			models: availableModels,
			selectedModelId,
			onmodelselect,
			thinking: false,
			canChooseThinking: true,
			onthinkingchange
		}
	});

	return {
		onsend,
		onstop,
		onmodelselect,
		onthinkingchange,
		container,
		unmount,
		textarea: screen.getByRole('textbox', { name: 'Message' })
	};
}

describe('composer', () => {
	describe('key handling', () => {
		it('sends on Enter and clears the box, ready for the next message', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer();

			await user.type(textarea, 'hello{Enter}');

			expect(onsend).toHaveBeenCalledExactlyOnceWith('hello');
			expect(textarea).toHaveValue('');
		});

		it('inserts a newline on Shift+Enter instead of sending', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer();

			await user.type(textarea, 'first{Shift>}{Enter}{/Shift}second');

			expect(onsend).not.toHaveBeenCalled();
			expect(textarea).toHaveValue('first\nsecond');
		});

		it('ignores Enter on whitespace, so a stray keypress sends nothing', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer();

			await user.type(textarea, '   {Enter}');

			expect(onsend).not.toHaveBeenCalled();
		});

		describe('typing a language that needs an input method editor', () => {
			// Japanese, Chinese and Korean are typed phonetically, and the IME offers
			// a list of candidate characters. Enter picks the highlighted candidate —
			// it means "yes, that word", not "send". Treating it as send fires the
			// message on the first word of every sentence.
			it('does not send the Enter that accepts a candidate', async () => {
				const user = userEvent.setup();
				const { onsend, textarea } = renderComposer();

				await user.type(textarea, 'にほんご');
				await fireEvent.compositionStart(textarea);
				// Deliberately the unhelpful case: the browser omits `isComposing`.
				await fireEvent.keyDown(textarea, { key: 'Enter' });

				expect(onsend).not.toHaveBeenCalled();
			});

			it('sends once composition has ended', async () => {
				const user = userEvent.setup();
				const { onsend, textarea } = renderComposer();

				await user.type(textarea, 'にほんご');
				await fireEvent.compositionStart(textarea);
				await fireEvent.compositionEnd(textarea);
				await fireEvent.keyDown(textarea, { key: 'Enter' });

				expect(onsend).toHaveBeenCalledExactlyOnceWith('にほんご');
			});
		});
	});

	describe('while a reply is arriving', () => {
		it.each(['submitted', 'streaming'] as const)(
			'offers Stop rather than Send when status is %s',
			(status) => {
				renderComposer(status);

				expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
				expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
			}
		);

		it('aborts when Stop is clicked', async () => {
			const user = userEvent.setup();
			const { onstop } = renderComposer('streaming');

			await user.click(screen.getByRole('button', { name: 'Stop' }));

			expect(onstop).toHaveBeenCalledOnce();
		});

		it('shows that a request is in flight before any of the reply exists', () => {
			// Between pressing Enter and the first token there is nothing on screen.
			// Without this the app looks frozen for as long as the model takes to
			// start.
			const { container, unmount } = renderComposer('submitted');
			expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
			unmount();

			// Once text is arriving, the movement is redundant.
			const streaming = renderComposer('streaming');
			expect(streaming.container.querySelector('.animate-pulse')).not.toBeInTheDocument();
		});

		it('refuses to send a second message while the first is still streaming', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer('streaming');

			await user.type(textarea, 'impatient{Enter}');

			expect(onsend).not.toHaveBeenCalled();
		});
	});

	describe('send button', () => {
		it('is disabled until there is something to send', async () => {
			const user = userEvent.setup();
			const { textarea } = renderComposer();

			expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

			await user.type(textarea, 'hi');

			expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
		});

		it('sends on click, for anyone not using the keyboard', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer();

			await user.type(textarea, 'hello');
			await user.click(screen.getByRole('button', { name: 'Send' }));

			expect(onsend).toHaveBeenCalledExactlyOnceWith('hello');
		});

		it('can send a new message after the previous request failed', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer('error');

			await user.type(textarea, 'Never mind{Enter}');

			expect(onsend).toHaveBeenCalledExactlyOnceWith('Never mind');
		});
	});

	describe('model picker contract', () => {
		it('passes the catalog and selected id down, and passes selections back up', () => {
			const { onmodelselect } = renderComposer('ready', 'catalog/haiku', [
				{
					id: 'catalog/opus',
					label: 'Server Opus',
					family: 'opus',
					generation: 'catalog-a',
					thinking: 'optional'
				},
				{
					id: 'catalog/haiku',
					label: 'Server Haiku',
					family: 'haiku',
					generation: 'catalog-c',
					thinking: 'optional'
				}
			]);

			const { models, selectedModelId } = stubProps(modelPickerStub);
			expect(models).toStrictEqual([
				{
					id: 'catalog/opus',
					label: 'Server Opus',
					family: 'opus',
					generation: 'catalog-a',
					thinking: 'optional'
				},
				{
					id: 'catalog/haiku',
					label: 'Server Haiku',
					family: 'haiku',
					generation: 'catalog-c',
					thinking: 'optional'
				}
			]);
			expect(selectedModelId).toBe('catalog/haiku');

			stubCallback(modelPickerStub, 'onselect')('catalog/opus');

			expect(onmodelselect).toHaveBeenCalledExactlyOnceWith('catalog/opus');
		});
	});

	describe('footer click-to-focus', () => {
		it('focuses the textarea when the empty part of the footer is clicked', async () => {
			const { container, textarea } = renderComposer();
			const footer = container.querySelector('.justify-end');
			if (!footer) throw new Error('footer not found');

			await fireEvent.click(footer);

			expect(textarea).toHaveFocus();
		});

		it('leaves the model picker to handle its own click, without stealing focus', async () => {
			const { textarea } = renderComposer();

			await fireEvent.click(screen.getByTestId('model-picker'));

			expect(textarea).not.toHaveFocus();
		});

		it('leaves the send button to handle its own click, without stealing focus', async () => {
			const user = userEvent.setup();
			const { onsend, textarea } = renderComposer();

			await user.type(textarea, 'hello');
			textarea.blur();
			await user.click(screen.getByRole('button', { name: 'Send' }));

			expect(onsend).toHaveBeenCalledExactlyOnceWith('hello');
			expect(textarea).not.toHaveFocus();
		});
	});
});
