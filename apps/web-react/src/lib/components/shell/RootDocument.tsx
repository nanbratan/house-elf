import { HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export interface RootDocumentProps {
	children: ReactNode;
}

/**
 * The whole HTML document — Start has no `app.html`. `HeadContent` renders what the
 * root route's `head` options produce and `Scripts` emits the client bundle, so a
 * document missing either is a blank page.
 */
export function RootDocument({ children }: RootDocumentProps) {
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
