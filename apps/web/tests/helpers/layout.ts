/**
 * jsdom implements no layout, so every number a scroller reasons about is zero.
 * These say what the browser would have said.
 */
export interface Layout {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
}

/** Gives an element the measurements it would have had on screen. */
export function place(element: HTMLElement, layout: Layout): HTMLElement {
	for (const [name, value] of Object.entries(layout)) {
		Object.defineProperty(element, name, { value, configurable: true });
	}

	return element;
}
