import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	SIDEBAR_COOKIE_NAME,
	Sidebar,
	SidebarProvider,
	SidebarTrigger,
	useSidebar
} from '../../../src/lib/components/ui/sidebar.tsx';

const { useIsMobile } = vi.hoisted(() => ({ useIsMobile: vi.fn(() => false) }));

vi.mock('../../../src/lib/hooks/use-mobile.ts', () => ({ useIsMobile }));

afterEach(() => {
	useIsMobile.mockReturnValue(false);
});

function renderSidebar(defaultOpen: boolean) {
	return render(
		<SidebarProvider defaultOpen={defaultOpen}>
			<SidebarTrigger />
			<Sidebar>rail content</Sidebar>
		</SidebarProvider>
	);
}

describe('SidebarProvider', () => {
	it('refuses to give context outside a provider', () => {
		function Consumer() {
			useSidebar();

			return null;
		}

		// React logs the thrown render error as well as rethrowing it; silenced so the
		// suite's output stays readable.
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		expect(() => render(<Consumer />)).toThrow('useSidebar must be used within a SidebarProvider.');

		vi.restoreAllMocks();
	});

	it('persists the collapsed state to a cookie so the next render can seed it', async () => {
		const user = userEvent.setup();
		renderSidebar(true);

		await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));

		expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=false`);
	});
});

describe('Sidebar', () => {
	it('takes its links out of reach while collapsed', () => {
		renderSidebar(false);

		expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('inert');
	});

	it('is reachable while expanded', () => {
		renderSidebar(true);

		expect(screen.getByRole('complementary')).not.toHaveAttribute('inert');
	});

	it('renders a dialog rather than the desktop rail on a narrow viewport', async () => {
		const user = userEvent.setup();
		useIsMobile.mockReturnValue(true);
		renderSidebar(true);

		expect(screen.queryByRole('complementary', { hidden: true })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));

		expect(screen.getByRole('dialog', { name: 'Sidebar' })).toHaveTextContent('rail content');
	});
});
