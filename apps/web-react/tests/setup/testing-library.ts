import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// jsdom does not implement ResizeObserver — cmdk's Command measures its list to
// animate height changes, and throws `ReferenceError: ResizeObserver is not
// defined` without this. A no-op is enough: nothing under test asserts on the
// measurement, only on what cmdk renders.
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

// jsdom does not implement scrollIntoView either — cmdk calls it on the
// selected item to keep it in view as the reader arrows through the list.
// Assigned outright rather than guarded on the property: TypeScript's DOM lib
// insists it already exists, so a truthiness check on it is unreachable by the
// types even though jsdom genuinely lacks it at runtime. Guard on the global
// instead, for parity with apps/web's tests/setup/dom-layout.ts and for
// node-environment test files that share this setup but have no `Element`.
if (typeof Element !== 'undefined') {
	Element.prototype.scrollIntoView = () => undefined;
}
