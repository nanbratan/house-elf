import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`;

/**
 * Whether the viewport is narrower than the sidebar's mobile breakpoint.
 *
 * Returns `false` on the server and on the first client render, so the desktop
 * tree is what hydrates. That is invisible — the desktop tree is `hidden md:block`
 * — but it does mean the very first interaction after hydration, before the effect
 * commits, toggles desktop state.
 */
export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	// A media query subscription cannot happen during render or in a handler: it is
	// an external store that has to be attached to (and detached from) `window`.
	useEffect(() => {
		const query = window.matchMedia(MOBILE_QUERY);

		function onChange() {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		}

		query.addEventListener('change', onChange);
		onChange();

		return () => {
			query.removeEventListener('change', onChange);
		};
	}, []);

	return isMobile;
}
