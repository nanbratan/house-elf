import { describe, expect, it } from 'vitest';

import { getRouter } from '../src/router.tsx';

describe('getRouter', () => {
	it('builds a router that resolves the home route', () => {
		const matches = getRouter().matchRoutes('/', {});

		expect(matches.at(-1)?.routeId).toBe('/');
	});

	// Start calls this once per request on the server. A shared instance would carry
	// one request's loader data into the next, so the freshness is the contract.
	it('builds a separate router on every call', () => {
		expect(getRouter()).not.toBe(getRouter());
	});
});
