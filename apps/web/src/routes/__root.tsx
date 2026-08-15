import { Outlet, createRootRoute } from '@tanstack/react-router';

import { AppShell } from '../lib/components/shell/AppShell.tsx';
import { RootDocument } from '../lib/components/shell/RootDocument.tsx';
import { readSidebarOpen } from '../lib/components/shell/sidebar-cookie.ts';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Mr. Meeseeks' }
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'icon', href: '/favicon.svg' }
		]
	}),
	// Read on the server so the first HTML already has the persisted state — a client
	// read would render the sidebar open and then snap it shut.
	loader: () => ({ sidebarOpen: readSidebarOpen() }),
	component: RootShell,
	shellComponent: RootDocument
});

function RootShell() {
	const { sidebarOpen } = Route.useLoaderData();

	return (
		<AppShell defaultSidebarOpen={sidebarOpen}>
			<Outlet />
		</AppShell>
	);
}
