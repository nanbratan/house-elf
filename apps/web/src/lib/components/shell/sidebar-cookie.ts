import { createIsomorphicFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';

import { SIDEBAR_COOKIE_NAME } from '../ui/sidebar.tsx';

function parse(value: string | undefined): boolean {
	// Anything that is not an explicit `false` — absent, truncated, tampered with —
	// falls back to the open default rather than surprising the user with a
	// collapsed rail.
	return value !== 'false';
}

/**
 * The persisted sidebar state, read wherever the render is happening.
 *
 * `createIsomorphicFn` rather than `createServerFn`: the value has to be present in
 * the very first server render or the sidebar flashes open before the client
 * corrects it, and an RPC round-trip cannot deliver it that early. The Start plugin
 * drops the branch that does not belong to the bundle it is building, which is what
 * keeps `@tanstack/react-start/server` out of the client.
 */
export const readSidebarOpen = createIsomorphicFn()
	.server((): boolean => parse(getCookie(SIDEBAR_COOKIE_NAME)))
	.client((): boolean => {
		const match = new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`).exec(document.cookie);

		return parse(match?.[1]);
	});
