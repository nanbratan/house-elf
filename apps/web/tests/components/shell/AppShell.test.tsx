import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '../../../src/lib/components/shell/AppShell.tsx';
import { AppSidebar } from '../../../src/lib/components/shell/AppSidebar.tsx';

// The sidebar is tested at its own boundary, so here it is a stub: a `vi.fn`
// whose call history is the record of what the shell passed it. `vi.mocked`
// types those props as `AppSidebarProps`, so a renamed prop fails typecheck
// rather than silently passing `undefined`.
vi.mock('../../../src/lib/components/shell/AppSidebar.tsx', () => ({
	AppSidebar: vi.fn(() => <aside data-testid="app-sidebar" />)
}));

const sidebarProps = () => vi.mocked(AppSidebar).mock.lastCall?.[0];

describe('AppShell', () => {
	describe('sidebar toggle', () => {
		it('starts expanded, with the accessible name offering to collapse', () => {
			render(<AppShell>page content</AppShell>);

			expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
				'aria-expanded',
				'true'
			);
		});

		it('collapses on click, and the accessible name and aria-expanded follow', async () => {
			const user = userEvent.setup();
			render(<AppShell>page content</AppShell>);

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

			expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
				'aria-expanded',
				'false'
			);
			expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
		});

		it('expands again on a second click', async () => {
			const user = userEvent.setup();
			render(<AppShell>page content</AppShell>);

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
			await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

			expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
				'aria-expanded',
				'true'
			);
		});
	});

	describe('the open state it hands the sidebar', () => {
		it('starts open', () => {
			render(<AppShell>page content</AppShell>);

			expect(sidebarProps()).toEqual({ open: true });
		});

		it('closes when the toggle is clicked', async () => {
			const user = userEvent.setup();
			render(<AppShell>page content</AppShell>);

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

			expect(sidebarProps()).toEqual({ open: false });
		});
	});

	it('renders the sidebar alongside the page content in the main region', () => {
		render(<AppShell>page content</AppShell>);

		expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
		expect(screen.getByRole('main')).toHaveTextContent('page content');
	});
});
