import { describe, expect, it } from 'vitest';

import { readSidebarOpen } from '../../../src/lib/components/shell/sidebar-cookie.ts';
import { SIDEBAR_COOKIE_NAME } from '../../../src/lib/components/ui/sidebar.tsx';

/*
 * These exercise the client half of the isomorphic function — under jsdom there is a
 * `window`, so that is the branch that runs. The server half is the same `parse`
 * against `getCookie`, and the round-trip through a real SSR render is pinned by
 * `tests/e2e/shell.spec.ts`.
 */
function setCookie(value: string) {
	document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/`;
}

describe('readSidebarOpen', () => {
	it('starts the sidebar open when nothing has been persisted', () => {
		expect(readSidebarOpen()).toBe(true);
	});

	it('collapses the sidebar only for an explicit false', () => {
		setCookie('false');

		expect(readSidebarOpen()).toBe(false);
	});

	it('keeps the sidebar open when the persisted value is true', () => {
		setCookie('true');

		expect(readSidebarOpen()).toBe(true);
	});

	it('falls back to open when the persisted value is not a boolean', () => {
		setCookie('maybe');

		expect(readSidebarOpen()).toBe(true);
	});

	it('ignores a different cookie whose name ends with the same text', () => {
		document.cookie = `not_${SIDEBAR_COOKIE_NAME}=false; path=/`;

		expect(readSidebarOpen()).toBe(true);
	});
});
