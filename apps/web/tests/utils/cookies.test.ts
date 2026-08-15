import { describe, expect, it } from 'vitest';

import { readCookie, writeCookie } from '../../src/lib/utils/cookies.ts';

/*
 * Under jsdom there is a `window`, so these exercise the client branch of the
 * isomorphic read. That the server branch reaches the request's cookies is a
 * question only a real SSR round-trip can answer — `tests/e2e/shell.spec.ts` is
 * what asserts it.
 */
describe('readCookie', () => {
	it('is undefined when the cookie was never set', () => {
		expect(readCookie('probe')).toBeUndefined();
	});

	it('reads back what was written', () => {
		writeCookie('probe', 'a-value');

		expect(readCookie('probe')).toBe('a-value');
	});

	it('does not match a longer cookie name ending with the one asked for', () => {
		writeCookie('other_probe', 'wrong');

		expect(readCookie('probe')).toBeUndefined();
	});

	it('reads a cookie that is not the first in the jar', () => {
		writeCookie('other_probe', 'first');
		writeCookie('probe', 'second');

		expect(readCookie('probe')).toBe('second');
	});
});
