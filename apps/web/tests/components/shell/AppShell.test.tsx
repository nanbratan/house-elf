import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '../../../src/lib/components/shell/AppShell.tsx';

// The sidebar is tested at its own boundary, so here it is a stub. `SidebarProvider`
// is not stubbed: it is a `ui/` primitive, and the shell's toggle has no behaviour
// without the context it supplies.
vi.mock('../../../src/lib/components/shell/AppSidebar.tsx', () => ({
	AppSidebar: vi.fn(() => <div data-testid="app-sidebar" />)
}));

describe('AppShell', () => {
	describe('sidebar toggle', () => {
		it('starts expanded, with the accessible name offering to collapse', () => {
			render(<AppShell defaultSidebarOpen>page content</AppShell>);

			expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
				'aria-expanded',
				'true'
			);
		});

		it('starts collapsed when the persisted state says so', () => {
			render(<AppShell defaultSidebarOpen={false}>page content</AppShell>);

			expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
				'aria-expanded',
				'false'
			);
		});

		it('collapses on click, and the accessible name and aria-expanded follow', async () => {
			const user = userEvent.setup();
			render(<AppShell defaultSidebarOpen>page content</AppShell>);

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

			expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
				'aria-expanded',
				'false'
			);
			expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
		});

		it('expands again on a second click', async () => {
			const user = userEvent.setup();
			render(<AppShell defaultSidebarOpen>page content</AppShell>);

			await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
			await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

			expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
				'aria-expanded',
				'true'
			);
		});
	});

	it('renders the sidebar alongside the page content in the main region', () => {
		render(<AppShell defaultSidebarOpen>page content</AppShell>);

		expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
		expect(screen.getByRole('main')).toHaveTextContent('page content');
	});
});
