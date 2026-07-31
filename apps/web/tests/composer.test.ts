import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Composer from '../src/lib/components/chat/Composer.svelte';

function renderComposer(status: 'ready' | 'submitted' | 'streaming' | 'error' = 'ready') {
	const onsend = vi.fn();
	const onstop = vi.fn();
	render(Composer, { props: { status, onsend, onstop } });

	return { onsend, onstop, textarea: screen.getByRole('textbox', { name: 'Message' }) };
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
	});
});
