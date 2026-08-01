import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ErrorNotice from '$lib/components/chat/ErrorNotice.svelte';

function renderNotice(message = 'Failed to fetch') {
	const onretry = vi.fn();

	render(ErrorNotice, { props: { error: new Error(message), onretry } });

	return { onretry };
}

describe('error notice', () => {
	it('says what happened in words of its own', () => {
		renderNotice();

		expect(screen.getByRole('alert')).toHaveTextContent('That reply did not arrive.');
	});

	it('keeps the raw failure, which is what makes a bug report useful', () => {
		renderNotice('Upstream is down');

		expect(screen.getByRole('alert')).toHaveTextContent('Upstream is down');
	});

	it('announces itself, rather than waiting to be noticed', () => {
		renderNotice();

		// `alert` interrupts: a request that failed is exactly the case where a
		// screen reader should not wait for a convenient pause.
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('offers another attempt, and asks for it only when told to', async () => {
		const user = userEvent.setup();
		const { onretry } = renderNotice();

		expect(onretry).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Try again' }));

		expect(onretry).toHaveBeenCalledOnce();
	});
});
