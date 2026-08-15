import { createIsomorphicFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';

/**
 * As long as a cookie is allowed to live.
 *
 * A preference should not evaporate because its owner was away — but "never
 * expires" is not on offer: RFC 6265bis caps cookie lifetime at 400 days, and
 * Chrome and Safari clamp anything longer, so asking for more just gets silently
 * trimmed. Every write restarts the window, so the only way to reach the cap is to
 * not change a setting for 400 days.
 */
export const PREFERENCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

/**
 * Reads a cookie wherever the render is happening.
 *
 * This is what `localStorage` cannot do: it does not exist on the server, so a
 * preference kept there can only be applied after hydration — the server renders a
 * default and the client corrects it, which the reader sees as a flash. A cookie
 * arrives with the request, so the first HTML can already be right.
 *
 * The Start plugin drops whichever branch does not belong to the bundle it is
 * building, which is what keeps `@tanstack/react-start/server` out of the client.
 */
export const readCookie = createIsomorphicFn()
	.server((name: string): string | undefined => getCookie(name))
	.client((name: string): string | undefined => {
		const match = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie);

		return match?.[1];
	});

/**
 * Client-only: the server writes cookies through its response, not through this.
 *
 * `maxAgeSeconds` is here for the caller that wants something short-lived. Nothing
 * does yet — preferences are the only thing written as cookies, and they keep the
 * cap.
 */
export function writeCookie(
	name: string,
	value: string,
	maxAgeSeconds: number = PREFERENCE_MAX_AGE_SECONDS
): void {
	document.cookie = `${name}=${value}; path=/; max-age=${String(maxAgeSeconds)}`;
}
