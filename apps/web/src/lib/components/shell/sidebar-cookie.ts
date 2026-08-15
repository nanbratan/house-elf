import { readCookie } from '../../utils/cookies.ts';
import { SIDEBAR_COOKIE_NAME } from '../ui/sidebar.tsx';

/**
 * The persisted sidebar state, read wherever the render is happening.
 *
 * Anything that is not an explicit `false` — absent, truncated, tampered with —
 * falls back to open rather than surprising the reader with a collapsed rail.
 */
export function readSidebarOpen(): boolean {
	return readCookie(SIDEBAR_COOKIE_NAME) !== 'false';
}
