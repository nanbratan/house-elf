import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThinkingRow } from '../../../src/lib/components/chat/ThinkingRow.tsx';

describe('ThinkingRow', () => {
	it('reports the thinking state as a pressed switch, named for what it does', () => {
		render(<ThinkingRow thinking={true} onThinkingChange={vi.fn()} />);

		expect(screen.getByRole('switch', { name: 'Thinking' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});

	it('asks for the opposite of the current state when toggled', async () => {
		const user = userEvent.setup();
		const onThinkingChange = vi.fn();
		render(<ThinkingRow thinking={false} onThinkingChange={onThinkingChange} />);

		await user.click(screen.getByRole('switch', { name: 'Thinking' }));

		expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(true);
	});
});
