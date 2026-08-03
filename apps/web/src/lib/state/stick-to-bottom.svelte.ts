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
	// A smooth scroll to the end passes through every position on the way, each
	// firing a scroll event. Those are ours, not the reader's, and without this
	// the first one would unpin and undo the journey it is part of.
	let chasingEnd = false;

	function measure(): void {
		if (!viewportElement) return;

		const { scrollTop, scrollHeight, clientHeight } = viewportElement;
		const atEnd = scrollHeight - (scrollTop + clientHeight) <= BOTTOM_EPSILON_PX;

		if (chasingEnd && !atEnd) return;

		chasingEnd = false;
		pinned = atEnd;
	}

	/**
	 * The reader reaching for the page outranks any journey we are in the middle
	 * of — browsers cancel a smooth scroll on these too, so the alternative is a
	 * chase that never arrives and a pin that never lets go.
	 */
	function readerTookOver(): void {
		chasingEnd = false;
	}

	function scrollToEnd(behavior: ScrollBehavior): void {
		if (!viewportElement) return;

		pinned = true;
		chasingEnd = behavior === 'smooth';
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

			// Passive throughout: these only read scroll position, so the browser need
			// not wait to find out whether we cancel the scroll.
			node.addEventListener('scroll', measure, { passive: true });
			node.addEventListener('wheel', readerTookOver, { passive: true });
			node.addEventListener('touchstart', readerTookOver, { passive: true });
			measure();

			return {
				destroy() {
					node.removeEventListener('scroll', measure);
					node.removeEventListener('wheel', readerTookOver);
					node.removeEventListener('touchstart', readerTookOver);
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
