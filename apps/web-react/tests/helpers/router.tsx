import { RouterContextProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { routeTree } from '../../src/routeTree.gen.ts';

/**
 * Router context for a component that renders `<Link>` or reads the location.
 *
 * There is no module to mock here: a component reads live router context rather
 * than importing a value, so the context itself is the seam. It is built on the
 * app's real route tree, so `<Link to="/c/$id">` resolves against real, typed
 * routes and a path that stops existing becomes a compile error.
 *
 * `RouterContextProvider`, not `RouterProvider` — the latter also renders the
 * matched route, which would put the whole app under test instead of the one
 * component. `pathname` seeds the in-memory history and is what active-link state
 * matches against.
 */
export function withRouter(ui: ReactElement, pathname = '/'): ReactElement {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [pathname] })
	});

	return <RouterContextProvider router={router}>{ui}</RouterContextProvider>;
}
