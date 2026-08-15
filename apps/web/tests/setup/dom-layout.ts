/*
 * jsdom performs no layout: `offsetWidth` and `offsetHeight` are hardcoded to 0
 * for every element, forever. The model list is virtualized, and a virtualizer
 * measures both its scroller and its rows through those two properties
 * (`virtual-core`'s `getRect` and `measureElement`) — so a zero-height scroller
 * windows down to an empty range, the list renders no rows at all, and every
 * assertion about it is vacuous.
 *
 * One fixed size for every element is enough, and is deliberately blunt: the
 * tests assert which rows rendered and in what order, never a pixel. Stubbing
 * the layout rather than mocking `@tanstack/react-virtual` keeps the real
 * windowing — the code under test — in the test.
 */

const ELEMENT_HEIGHT = 40;
const ELEMENT_WIDTH = 320;

// Guarded on the global for the same reason `scrollIntoView` is in
// `testing-library.ts`: files with a `// @vitest-environment node` docblock
// share this setup and have no `HTMLElement`.
if (typeof HTMLElement !== 'undefined') {
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get: () => ELEMENT_HEIGHT
	});
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
		configurable: true,
		get: () => ELEMENT_WIDTH
	});
}
