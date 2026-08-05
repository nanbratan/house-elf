/**
 * jsdom implements no layout, and therefore no `ResizeObserver`,
 * `scrollIntoView` or pointer capture. Components that measure, reveal content
 * or track a pointer have every right to use them and should not know they are
 * under test.
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
if (typeof Element !== 'undefined') {
	Element.prototype.hasPointerCapture = () => false;
	Element.prototype.setPointerCapture = () => undefined;
	Element.prototype.releasePointerCapture = () => undefined;
	// Without layout every element claims no client rects, which is how a browser
	// says "not rendered". Popovers take that at face value and refuse to appear.
	Element.prototype.getClientRects = function (this: Element) {
		return [this.getBoundingClientRect()] as unknown as DOMRectList;
	};
}
