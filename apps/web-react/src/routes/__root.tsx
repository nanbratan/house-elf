import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'house-elf' }
		],
		links: [{ rel: 'stylesheet', href: appCss }]
	}),
	shellComponent: RootDocument
});

interface RootDocumentProps {
	children: ReactNode;
}

/**
 * Owns the whole HTML document — Start has no `app.html`. `HeadContent` renders what
 * the `head` options above produce, and `Scripts` emits the client bundle, so a route
 * that forgets neither is a blank page.
 */
function RootDocument({ children }: RootDocumentProps) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
