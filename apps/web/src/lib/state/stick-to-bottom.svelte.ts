import type { Action } from 'svelte/action';

/**
 * Rounding slack, and nothing more. Sub-pixel layout means a scroller sitting
 * at its own end often reports a fraction of a pixel short of it, and that must
 * not read as the reader having scrolled away.
 *
 * This is deliberately not a "close enough to count as following" allowance. A
 * generous one costs the reader control: scrolled up a little to re-read a
 * paragraph, they are still counted as pinned, and the next thing that grows —
 * a token, or a reasoning section being opened — hauls them back down.
 */
const BOTTOM_EPSILON_PX = 2;

export interface StickToBottom {
	/** Whether new content is currently being followed down the page. */
	readonly isPinned: boolean;
	/** Follow again, and scroll to the end to prove it. */
	scrollToEnd(): void;
	/** The scrolling element. */
	viewport: Action;
	/** The element inside it that grows as messages arrive. */
	content: Action;
}

/**
 * Keeps a scroller pinned to its own bottom while content grows, and lets go the
 * moment the reader scrolls away from it.
 *
 * There is no "the user has taken over" flag, because position already says so:
 * scrolling up at all unpins, returning to the end re-pins. One rule, and it
 * cannot disagree with what is on screen.
 */
export function createStickToBottom(): StickToBottom {
	let viewportElement: HTMLElement | undefined;
	let pinned = $state(true);
	// Where the scroller was at the last event, so the next one says which way the
	// reader went. Position alone cannot: content arriving moves the end away from
	// a reader who has not moved at all.
	let lastScrollTop = 0;

	function isAtEnd(element: HTMLElement): boolean {
		const { scrollTop, scrollHeight, clientHeight } = element;
		return scrollHeight - (scrollTop + clientHeight) <= BOTTOM_EPSILON_PX;
	}

	/**
	 * A scroll event says nothing about who caused it, and during a stream most of
	 * them are ours — a chase to the end, reported a frame later, by which time the
	 * next token has already made the page taller. Reading that as "not at the end"
	 * lets go of a reader who never touched anything, and the stream runs away.
	 *
	 * So only moving up lets go. Content growing never moves the reader up, and a
	 * chase towards the end never does either.
	 */
	function measure(): void {
		if (!viewportElement) return;

		const { scrollTop } = viewportElement;
		const movedUp = scrollTop < lastScrollTop - BOTTOM_EPSILON_PX;
		lastScrollTop = scrollTop;

		if (isAtEnd(viewportElement)) pinned = true;
		else if (movedUp) pinned = false;
	}

	function scrollToEnd(behavior: ScrollBehavior): void {
		if (!viewportElement) return;

		pinned = true;
		viewportElement.scrollTo({ top: viewportElement.scrollHeight, behavior });
	}

	return {
		get isPinned() {
			return pinned;
		},

		scrollToEnd() {
			scrollToEnd('smooth');
		},

		viewport(node) {
			viewportElement = node;

			// Passive: this only reads scroll position, so the browser need not wait
			// to find out whether we cancel the scroll.
			node.addEventListener('scroll', measure, { passive: true });
			// Whether to follow at all is decided by where the thread opens — at the
			// end for a new one, partway up for a restored one.
			lastScrollTop = node.scrollTop;
			pinned = isAtEnd(node);

			return {
				destroy() {
					node.removeEventListener('scroll', measure);
					viewportElement = undefined;
				}
			};
		},

		content(node) {
			// The content growing is the only reason to chase the bottom, and its
			// height is the one signal that covers every cause — a token, a whole
			// message, an image loading, the window narrowing and text reflowing.
			const observer = new ResizeObserver(() => {
				if (pinned) scrollToEnd('auto');
			});

			observer.observe(node);

			return {
				destroy() {
					observer.disconnect();
				}
			};
		}
	};
}
