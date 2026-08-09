import { Outlet, createRootRoute } from '@tanstack/react-router';

import { AppShell } from '../lib/components/shell/AppShell.tsx';
import { RootDocument } from '../lib/components/shell/RootDocument.tsx';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'house-elf' }
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'icon', href: '/favicon.svg' }
		]
	}),
	component: RootShell,
	shellComponent: RootDocument
});

function RootShell() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
