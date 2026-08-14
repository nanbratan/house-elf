import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from '../../../src/lib/components/elements/error-state.tsx';

describe('ErrorState', () => {
	it('renders the failure copy and retries on demand', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();

		render(
			<ErrorState detail="Failed to fetch" onRetry={onRetry} title="That reply did not arrive." />
		);

		expect(screen.getByRole('alert')).toHaveTextContent('That reply did not arrive.');
		expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');

		await user.click(screen.getByRole('button', { name: 'Retry' }));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
