import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppSidebar } from '../../../src/lib/components/shell/AppSidebar.tsx';
import { SidebarProvider, SidebarTrigger } from '../../../src/lib/components/ui/sidebar.tsx';
import { withRouter } from '../../helpers/router.tsx';

// `useIsMobile` is an in-repo module, so it is a legitimate seam for choosing which
// tree the sidebar renders. The media query itself is stubbed globally and never
// fires (tests/setup/testing-library.ts).
const { useIsMobile } = vi.hoisted(() => ({ useIsMobile: vi.fn(() => false) }));

vi.mock('../../../src/lib/hooks/use-mobile.ts', () => ({ useIsMobile }));

afterEach(() => {
	useIsMobile.mockReturnValue(false);
});

function renderSidebar(pathname: string) {
	return render(
		withRouter(
			// The trigger is what opens the mobile drawer, which does not render until it
			// is open. On desktop it changes nothing the assertions below look at.
			<SidebarProvider>
				<SidebarTrigger />
				<AppSidebar />
			</SidebarProvider>,
			pathname
		)
	);
}

describe('AppSidebar', () => {
	it('links each conversation to its own route', () => {
		renderSidebar('/');

		expect(screen.getByRole('link', { name: 'Placeholder conversation' })).toHaveAttribute(
			'href',
			'/c/1'
		);
		expect(screen.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
			'href',
			'/c/2'
		);
	});

	it('offers a link to start a new conversation', () => {
		renderSidebar('/');

		expect(screen.getByRole('link', { name: 'New chat' })).toHaveAttribute('href', '/c/new');
	});

	it('marks only the conversation matching the current path as current', () => {
		renderSidebar('/c/2');

		expect(screen.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByRole('link', { name: 'Placeholder conversation' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('marks nothing as current outside a conversation route', () => {
		renderSidebar('/');

		expect(screen.getByRole('link', { name: 'Placeholder conversation' })).not.toHaveAttribute(
			'aria-current'
		);
		expect(screen.getByRole('link', { name: 'Another placeholder' })).not.toHaveAttribute(
			'aria-current'
		);
		expect(screen.getByRole('link', { name: 'New chat' })).not.toHaveAttribute('aria-current');
	});

	it('closes the mobile drawer when a conversation is opened', async () => {
		const user = userEvent.setup();
		useIsMobile.mockReturnValue(true);
		renderSidebar('/');

		await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));
		expect(screen.getByRole('link', { name: 'Another placeholder' })).toBeInTheDocument();

		await user.click(screen.getByRole('link', { name: 'Another placeholder' }));

		// The drawer is a dialog that unmounts when closed, so its disappearance is the
		// observable outcome — upstream leaves it covering the page just navigated to.
		expect(screen.queryByRole('link', { name: 'Another placeholder' })).not.toBeInTheDocument();
	});
});
