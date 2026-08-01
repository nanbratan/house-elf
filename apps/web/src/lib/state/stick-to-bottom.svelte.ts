import type { Action } from 'svelte/action';

/**
 * How far from the bottom still counts as "following along". Generous, because
 * this is a question about intent, not arithmetic: a reader a line or two off the
 * end is still reading the end, and streaming text should keep coming to them.
 */
const NEAR_BOTTOM_PX = 200;

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
 * There is no "the user has taken over" flag, because distance from the bottom
 * already says so: scrolling up unpins, scrolling back within `NEAR_BOTTOM_PX`
 * re-pins. One rule, and it cannot disagree with what is on screen.
 */
export function createStickToBottom(): StickToBottom {
	let viewportElement: HTMLElement | undefined;
	let pinned = $state(true);

	function measure(): void {
		if (!viewportElement) return;

		const { scrollTop, scrollHeight, clientHeight } = viewportElement;

		pinned = scrollHeight - (scrollTop + clientHeight) <= NEAR_BOTTOM_PX;
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
			measure();

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
