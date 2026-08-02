/**
 * jsdom implements no layout, and therefore no `ResizeObserver` or
 * `scrollIntoView`. Components that measure or reveal content have every right
 * to use both and should not know they are under test.
 */
class InertResizeObserver implements ResizeObserver {
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

// Assigned outright rather than guarded: TypeScript's DOM lib insists these
// APIs already exist. Under jsdom they do not, and no component test has layout
// for either implementation to observe.
globalThis.ResizeObserver = InertResizeObserver;
if (typeof HTMLElement !== 'undefined') {
	HTMLElement.prototype.scrollIntoView = () => undefined;
}
