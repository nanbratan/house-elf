import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChatStatus } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import { Composer } from '../../../src/lib/components/chat/Composer.tsx';
import type { ModelPickerProps } from '../../../src/lib/components/chat/ModelPicker.tsx';
import { selectableModel } from '../../helpers/models.ts';

/*
 * Tested at its own boundary: ModelPicker is replaced by a stub that records
 * its props and renders a bare marker. ModelPicker's own behaviour has its
 * own test; here only the contract between Composer and ModelPicker is
 * asserted — the props it's handed, and that its callbacks reach Composer's
 * own props. To drive a callback, the recorded props are read back and
 * invoked directly.
 */
let modelPickerProps: ModelPickerProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelPicker.tsx', () => ({
	ModelPicker: (props: ModelPickerProps) => {
		modelPickerProps = props;
		return <div data-testid="model-picker" />;
	}
}));

const models = [selectableModel({ id: 'test/model', label: 'Test Model' })];

function renderComposer(status: ChatStatus = 'ready') {
	const onSend = vi.fn();
	const onStop = vi.fn();
	const onModelSelect = vi.fn();
	const onThinkingChange = vi.fn();

	render(
		<Composer
			canChooseThinking
			models={models}
			onModelSelect={onModelSelect}
			onSend={onSend}
			onStop={onStop}
			onThinkingChange={onThinkingChange}
			selectedModelId="test/model"
			status={status}
			thinking={false}
		/>
	);

	return {
		onModelSelect,
		onSend,
		onStop,
		onThinkingChange,
		textarea: screen.getByRole('textbox', { name: 'Message' })
	};
}

describe('Composer', () => {
	describe('key handling', () => {
		it('sends on Enter and clears the box, ready for the next message', async () => {
			const user = userEvent.setup();
			const { onSend, textarea } = renderComposer();

			await user.type(textarea, 'hello{Enter}');

			expect(onSend).toHaveBeenCalledExactlyOnceWith('hello');
			expect(textarea).toHaveValue('');
		});

		it('inserts a newline on Shift+Enter instead of sending', async () => {
			const user = userEvent.setup();
			const { onSend, textarea } = renderComposer();

			await user.type(textarea, 'first{Shift>}{Enter}{/Shift}second');

			expect(onSend).not.toHaveBeenCalled();
			expect(textarea).toHaveValue('first\nsecond');
		});

		it('ignores Enter on whitespace, so a stray keypress sends nothing', async () => {
			const user = userEvent.setup();
			const { onSend, textarea } = renderComposer();

			await user.type(textarea, '   {Enter}');

			expect(onSend).not.toHaveBeenCalled();
		});

		describe('typing a language that needs an input method editor', () => {
			// Japanese, Chinese and Korean are typed phonetically, and the IME offers
			// a list of candidate characters. Enter picks the highlighted candidate —
			// it means "yes, that word", not "send". Treating it as send fires the
			// message on the first word of every sentence.
			it('does not send the Enter that accepts a candidate', async () => {
				const user = userEvent.setup();
				const { onSend, textarea } = renderComposer();

				await user.type(textarea, 'にほんご');
				fireEvent.compositionStart(textarea);
				// Deliberately the unhelpful case: the browser omits `isComposing`.
				fireEvent.keyDown(textarea, { key: 'Enter' });

				expect(onSend).not.toHaveBeenCalled();
			});

			it('sends once composition has ended', async () => {
				const user = userEvent.setup();
				const { onSend, textarea } = renderComposer();

				await user.type(textarea, 'にほんご');
				fireEvent.compositionStart(textarea);
				fireEvent.compositionEnd(textarea);
				fireEvent.keyDown(textarea, { key: 'Enter' });
				// jsdom dispatches the "submit" triggered by requestSubmit() on a
				// microtask, after this Enter keydown returns — give it a turn.
				await Promise.resolve();

				expect(onSend).toHaveBeenCalledExactlyOnceWith('にほんご');
			});
		});
	});

	describe('while a reply is arriving', () => {
		it.each(['submitted', 'streaming'] as const)(
			'offers Stop rather than Submit when status is %s',
			(status) => {
				renderComposer(status);

				expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
				expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
			}
		);

		it('aborts when Stop is clicked', async () => {
			const user = userEvent.setup();
			const { onStop } = renderComposer('streaming');

			await user.click(screen.getByRole('button', { name: 'Stop' }));

			expect(onStop).toHaveBeenCalledOnce();
		});

		it.each(['submitted', 'streaming'] as const)(
			'refuses to send a second message on Enter while status is %s, without clearing the box',
			async (status) => {
				const user = userEvent.setup();
				const { onSend, textarea } = renderComposer(status);

				await user.type(textarea, 'impatient{Enter}');

				expect(onSend).not.toHaveBeenCalled();
				expect(textarea).toHaveValue('impatient');
			}
		);
	});

	describe('submit button', () => {
		it('is disabled until there is something to send', async () => {
			const user = userEvent.setup();
			const { textarea } = renderComposer();

			expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

			await user.type(textarea, 'hi');

			expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
		});

		it('sends on click, for anyone not using the keyboard', async () => {
			const user = userEvent.setup();
			const { onSend, textarea } = renderComposer();

			await user.type(textarea, 'hello');
			await user.click(screen.getByRole('button', { name: 'Submit' }));

			expect(onSend).toHaveBeenCalledExactlyOnceWith('hello');
		});

		it('can send a new message after the previous request failed', async () => {
			const user = userEvent.setup();
			const { onSend, textarea } = renderComposer('error');

			await user.type(textarea, 'Never mind{Enter}');

			expect(onSend).toHaveBeenCalledExactlyOnceWith('Never mind');
		});
	});

	describe('model picker contract', () => {
		it('passes the catalog and selected id down, and passes selections back up', () => {
			const { onModelSelect } = renderComposer();

			expect(modelPickerProps?.models).toBe(models);
			expect(modelPickerProps?.selectedModelId).toBe('test/model');

			modelPickerProps?.onSelect('other/model');

			expect(onModelSelect).toHaveBeenCalledExactlyOnceWith('other/model');
		});

		it('passes the thinking choice down, and passes a new one back up', () => {
			const { onThinkingChange } = renderComposer();

			expect(modelPickerProps?.thinking).toBe(false);
			expect(modelPickerProps?.canChooseThinking).toBe(true);

			modelPickerProps?.onThinkingChange(true);

			expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(true);
		});
	});
});
