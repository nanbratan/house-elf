import { vi } from 'vitest';

/**
 * `$app/state` is provided by SvelteKit's runtime router, which is not running in a
 * component test — the real module's `page` would have no URL. This replaces it with
 * the smallest thing that holds a URL and hands it back.
 *
 * Only `page.url` is provided, because that is all any component reads today. Add to
 * it when a component needs more.
 *
 * Note this is a stand-in for *state*, not for behaviour: `$app/paths` and `$lib` are
 * NOT mocked, because they have logic, and a test double of logic can be wrong in the
 * same direction as the code it stands in for.
 */

let url = new URL('http://localhost/');

/** Set the pathname the component under test should see. Call before rendering. */
export function setPathname(pathname: string): void {
	url = new URL(pathname, 'http://localhost');
}

vi.mock('$app/state', () => ({
	page: {
		get url(): URL {
			return url;
		}
	}
}));
