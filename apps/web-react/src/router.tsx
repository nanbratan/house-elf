import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen.ts';

/**
 * TanStack Start resolves `src/router` by convention and calls `getRouter` once per
 * request on the server and once on hydration in the browser. It must therefore build
 * a fresh router every call — a module-level singleton would leak one request's loader
 * data into the next.
 */
export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true
	});
}
