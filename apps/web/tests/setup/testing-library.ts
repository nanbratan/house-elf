import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// Preferences persisted as cookies outlive a render, so without this a test that
// changes one leaves it set for every test after it in the file — the tests stop
// being order-independent. `localStorage` needed no equivalent because the suites
// that use it clear it themselves; a cookie jar is shared by everything.
// Guarded on the global for the same reason `scrollIntoView` below is: files with a
// `// @vitest-environment node` docblock share this setup and have no `document`.
afterEach(() => {
	if (typeof document === 'undefined') return;

	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();

		if (name !== undefined && name !== '') {
			document.cookie = `${name}=; path=/; max-age=0`;
		}
	}
});

// jsdom does not implement ResizeObserver — the model list's virtualizer
// observes its scroller with one, and base-ui's popups observe their anchors.
// A no-op is enough: it never fires, so the sizes come from the initial reads
// `dom-layout.ts` stubs, which is all the tests assert against.
class ResizeObserverStub {
	observe() {
		return;
	}
	unobserve() {
		return;
	}
	disconnect() {
		return;
	}
}

globalThis.ResizeObserver = ResizeObserverStub;

// jsdom does not implement matchMedia either — `useIsMobile` subscribes to one to
// pick the sidebar's desktop or mobile tree. A never-firing stub is enough: the hook
// reads `window.innerWidth` (1024 here, so desktop) for the value, and the tests that
// need the mobile tree mock the hook's module rather than the media query.
function matchMediaStub(media: string): MediaQueryList {
	return {
		media,
		matches: false,
		onchange: null,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		addListener: () => undefined,
		removeListener: () => undefined,
		dispatchEvent: () => false
	};
}

if (typeof window !== 'undefined') {
	window.matchMedia = matchMediaStub;
}

// jsdom does not implement scrollIntoView either — base-ui calls it on the
// highlighted item to keep it in view as the reader arrows through the list.
// Assigned outright rather than guarded on the property: TypeScript's DOM lib
// insists it already exists, so a truthiness check on it is unreachable by the
// types even though jsdom genuinely lacks it at runtime. Guard on the global
// instead, for parity with apps/web's tests/setup/dom-layout.ts and for
// node-environment test files that share this setup but have no `Element`.
if (typeof Element !== 'undefined') {
	Element.prototype.scrollIntoView = () => undefined;
}
