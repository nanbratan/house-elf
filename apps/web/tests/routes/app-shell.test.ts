import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';

import Layout from '../../src/routes/+layout.svelte';
import { setPathname } from '../setup/app-state.ts';

/** `+layout.svelte` requires a children snippet; its content is irrelevant here. */
const children = createRawSnippet(() => ({
	render: () => '<p>page content</p>'
}));

function renderShell(pathname: string) {
	setPathname(pathname);
	return render(Layout, { props: { children } });
}

describe('app shell', () => {
	beforeEach(() => {
		setPathname('/');
	});

	describe('sidebar toggle', () => {
		it('starts expanded, with the accessible name offering to collapse', () => {
			renderShell('/');

			const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
			expect(toggle).toHaveAttribute('aria-expanded', 'true');
		});

		it('collapses on click, and the accessible name and aria-expanded follow', async () => {
			const user = userEvent.setup();
			renderShell('/');

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

			const toggle = screen.getByRole('button', { name: 'Expand sidebar' });
			expect(toggle).toHaveAttribute('aria-expanded', 'false');
			expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
		});

		it('expands again on a second click', async () => {
			const user = userEvent.setup();
			renderShell('/');

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
			await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

			const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
			expect(toggle).toHaveAttribute('aria-expanded', 'true');
		});

		// The collapsed sidebar is also `inert`, which is what removes its links from
		// the tab order and the accessibility tree. jsdom does not implement `inert`,
		// so that guarantee is asserted in tests/e2e/shell.spec.ts instead.
	});

	describe('conversation list', () => {
		it('links each conversation to its own route', () => {
			renderShell('/');

			expect(screen.getByRole('link', { name: 'Placeholder conversation' })).toHaveAttribute(
				'href',
				'/c/1'
			);
			expect(screen.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
				'href',
				'/c/2'
			);
		});

		it('marks only the conversation matching the current path as current', () => {
			renderShell('/c/2');

			const active = screen.getByRole('link', { name: 'Another placeholder' });
			const inactive = screen.getByRole('link', { name: 'Placeholder conversation' });

			expect(active).toHaveAttribute('aria-current', 'page');
			expect(inactive).not.toHaveAttribute('aria-current');
		});

		it('gives the current conversation the active styling and the others the muted styling', () => {
			renderShell('/c/2');

			const active = screen.getByRole('link', { name: 'Another placeholder' });
			const inactive = screen.getByRole('link', { name: 'Placeholder conversation' });

			expect(active).toHaveClass('bg-accent-soft', 'text-accent');
			expect(active).not.toHaveClass('text-muted');

			expect(inactive).toHaveClass('text-muted');
			expect(inactive).not.toHaveClass('bg-accent-soft', 'text-accent');
		});

		it('marks nothing as current outside a conversation route', () => {
			renderShell('/');

			for (const link of screen.getAllByRole('link')) {
				expect(link).not.toHaveAttribute('aria-current');
			}
		});
	});

	it('renders the page content into the main region', () => {
		renderShell('/');

		expect(screen.getByRole('main')).toHaveTextContent('page content');
	});
});
