import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorNotice } from '../../../src/lib/components/chat/ErrorNotice.tsx';

describe('ErrorNotice', () => {
	it('renders the failure copy and retries on demand', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();

		render(<ErrorNotice error={new Error('Failed to fetch')} onRetry={onRetry} />);

		expect(screen.getByRole('alert')).toHaveTextContent('That reply did not arrive.');
		expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');

		await user.click(screen.getByRole('button', { name: 'Try again' }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
