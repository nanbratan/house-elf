import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStickToBottom } from '$lib/state/stick-to-bottom.svelte';

import { place } from '../helpers/layout';

/**
 * The rules live here, so the tests do too: no component, no rendering, just an
 * element told what size it is and a scroller asked what it makes of that.
 */
const VIEWPORT_HEIGHT = 500;
const CONTENT_HEIGHT = 2000;

/** The furthest down the reader can go. */
const BOTTOM = CONTENT_HEIGHT - VIEWPORT_HEIGHT;

/**
 * jsdom has no `ResizeObserver`. This one records what it was asked to watch, so
 * the tests can check the observation is real: a stub that only replays callbacks
 * would go green even if nothing were ever observed.
 */
const observers: FakeResizeObserver[] = [];

class FakeResizeObserver implements ResizeObserver {
	readonly observed: Element[] = [];
	disconnected = false;

	constructor(private readonly callback: ResizeObserverCallback) {
		observers.push(this);
	}

	observe(target: Element) {
		this.observed.push(target);
	}

	unobserve(target: Element) {
		this.observed.splice(this.observed.indexOf(target), 1);
	}

	disconnect() {
		this.disconnected = true;
		this.observed.length = 0;
	}

	/** What the browser does when a box it is watching changes size. */
	fire() {
		this.callback([], this);
	}
}

beforeEach(() => {
	observers.length = 0;
	vi.stubGlobal('ResizeObserver', FakeResizeObserver);

	return () => {
		vi.unstubAllGlobals();
	};
});

/**
 * Builds the two elements the scroller needs and attaches to them — optionally
 * with the reader already partway up the page, which is the state of affairs on a
 * reloaded thread and makes the very first measurement matter.
 */
function attach({ startAt = BOTTOM } = {}) {
	const stick = createStickToBottom();

	const viewport = document.createElement('div');
	const content = document.createElement('div');
	viewport.append(content);

	place(viewport, {
		scrollTop: startAt,
		scrollHeight: CONTENT_HEIGHT,
		clientHeight: VIEWPORT_HEIGHT
	});

	const scrolled = vi.fn();
	viewport.scrollTo = scrolled;

	const attachedViewport = stick.viewport(viewport);
	const attachedContent = stick.content(content);

	/** Moves the scroll position and tells the listener, as a browser would. */
	function scrollTo(scrollTop: number) {
		Object.defineProperty(viewport, 'scrollTop', { value: scrollTop, configurable: true });
		viewport.dispatchEvent(new Event('scroll'));
	}

	/** The content box changed size — a token arrived, or the window narrowed. */
	function contentGrew() {
		for (const observer of observers) observer.fire();
	}

	function detach() {
		attachedViewport?.destroy?.();
		attachedContent?.destroy?.();
	}

	return { stick, viewport, content, scrolled, scrollTo, contentGrew, detach };
}

describe('sticking to the bottom', () => {
	it('watches the content box, since only the content knows it grew', () => {
		const { content } = attach();

		expect(observers).toHaveLength(1);
		expect(observers[0]?.observed).toEqual([content]);
	});

	it('follows a reader who starts at the end', () => {
		const { stick } = attach();

		expect(stick.isPinned).toBe(true);
	});

	it('does not drag along a reader who starts partway up', () => {
		const { stick } = attach({ startAt: 0 });

		expect(stick.isPinned).toBe(false);
	});

	it('chases the bottom as content arrives', () => {
		const { scrolled, contentGrew } = attach();

		contentGrew();

		// Instant, not smooth: a smooth scroll would still be animating when the
		// next token arrives, and the two would fight.
		expect(scrolled).toHaveBeenCalledWith({ top: CONTENT_HEIGHT, behavior: 'auto' });
	});

	it('lets go as soon as the reader scrolls up at all', () => {
		const { stick, scrollTo } = attach();

		// A few lines up, not a few screens. Anything that counts this as still
		// following costs the reader the page the moment something grows.
		scrollTo(BOTTOM - 20);

		expect(stick.isPinned).toBe(false);
	});

	it('does not treat a fraction of a pixel as scrolling away', () => {
		const { stick, scrollTo } = attach();

		scrollTo(BOTTOM - 1);

		expect(stick.isPinned).toBe(true);
	});

	it('leaves a reader who scrolled up a little where they are when content grows', () => {
		const { scrolled, scrollTo, contentGrew } = attach();

		scrollTo(BOTTOM - 20);
		contentGrew();

		expect(scrolled).not.toHaveBeenCalled();
	});

	it('stops chasing once it has let go, so reading is not interrupted', () => {
		const { scrolled, scrollTo, contentGrew } = attach();

		scrollTo(0);
		contentGrew();

		expect(scrolled).not.toHaveBeenCalled();
	});

	it('follows again when the reader scrolls back to the end', () => {
		const { stick, scrollTo } = attach();

		scrollTo(0);
		expect(stick.isPinned).toBe(false);

		scrollTo(BOTTOM);
		expect(stick.isPinned).toBe(true);
	});

	it('goes to the end, and resumes following, when asked', () => {
		const { stick, scrolled, scrollTo } = attach();

		scrollTo(0);
		stick.scrollToEnd();

		// Smooth, because this one is a deliberate journey rather than a nudge: the
		// reader should see where they are being taken.
		expect(scrolled).toHaveBeenCalledWith({ top: CONTENT_HEIGHT, behavior: 'smooth' });
		expect(stick.isPinned).toBe(true);
	});

	/**
	 * A real smooth scroll fires a `scroll` event at every position it passes
	 * through on its way to the end. jsdom does not animate `Element.scrollTo`, so
	 * this fires one by hand to stand in for a mid-journey position.
	 */
	it('ignores its own mid-journey scroll events', () => {
		const { stick, scrollTo } = attach();
		const midJourney = () => {
			scrollTo(BOTTOM - 800);
		};

		scrollTo(0);
		stick.scrollToEnd();

		midJourney();
		expect(stick.isPinned).toBe(true);

		scrollTo(BOTTOM);
		expect(stick.isPinned).toBe(true);
	});

	it('stops ignoring them once the reader scrolls back up the page', () => {
		const { stick, scrollTo } = attach();

		scrollTo(0);
		stick.scrollToEnd();
		// Part-way down the journey, and then further up than the journey has got:
		// the reader has taken the page back, and a browser cancels the smooth scroll.
		scrollTo(BOTTOM - 800);
		scrollTo(BOTTOM - 900);

		expect(stick.isPinned).toBe(false);
	});

	describe('while tokens stream in', () => {
		/**
		 * The harness above stands the scroller still; a stream does not. This one
		 * runs whole frames in the order a browser runs them — the DOM grows and is
		 * laid out, then scroll events queued by earlier programmatic scrolls are
		 * dispatched, then ResizeObserver callbacks run — because the bug this
		 * covers only appears when a scroll event lands after the next token has
		 * already made the page taller.
		 */
		function stream() {
			const stick = createStickToBottom();
			const viewport = document.createElement('div');
			const content = document.createElement('div');
			viewport.append(content);

			let scrollHeight = CONTENT_HEIGHT;
			let scrollTop = BOTTOM;
			let scrollEventPending = false;

			Object.defineProperty(viewport, 'clientHeight', {
				value: VIEWPORT_HEIGHT,
				configurable: true
			});
			Object.defineProperty(viewport, 'scrollHeight', {
				get: () => scrollHeight,
				configurable: true
			});
			Object.defineProperty(viewport, 'scrollTop', {
				get: () => scrollTop,
				configurable: true
			});

			// The browser clamps to what there is to scroll, and reports the move on
			// a later turn rather than from inside the call.
			viewport.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
				const top = typeof options === 'object' ? (options.top ?? 0) : (y ?? 0);
				scrollTop = Math.min(top, scrollHeight - VIEWPORT_HEIGHT);
				scrollEventPending = true;
			};

			stick.viewport(viewport);
			stick.content(content);

			function frame({ grewBy = 0 } = {}) {
				scrollHeight += grewBy;

				if (scrollEventPending) {
					scrollEventPending = false;
					viewport.dispatchEvent(new Event('scroll'));
				}

				if (grewBy > 0) for (const observer of observers) observer.fire();
			}

			/** How far the end of the content is below the bottom of the viewport. */
			function distanceFromEnd() {
				return scrollHeight - scrollTop - VIEWPORT_HEIGHT;
			}

			function scrollBy(delta: number) {
				scrollTop += delta;
				viewport.dispatchEvent(new Event('scroll'));
			}

			return { stick, frame, distanceFromEnd, scrollBy };
		}

		it('keeps following when a token arrives before the scroll it caused is reported', () => {
			const { stick, frame, distanceFromEnd } = stream();

			frame({ grewBy: 200 });
			frame({ grewBy: 200 });
			frame({ grewBy: 200 });

			expect(stick.isPinned).toBe(true);
			expect(distanceFromEnd()).toBeLessThanOrEqual(2);
		});

		it('still lets go of a reader who scrolls up mid-stream', () => {
			const { stick, frame, scrollBy } = stream();

			frame({ grewBy: 200 });
			scrollBy(-300);

			expect(stick.isPinned).toBe(false);

			frame({ grewBy: 200 });

			expect(stick.isPinned).toBe(false);
		});
	});

	describe('once the elements go away', () => {
		it('stops listening to the scroller it no longer owns', () => {
			const { stick, scrollTo, detach } = attach();

			detach();
			scrollTo(0);

			expect(stick.isPinned).toBe(true);
		});

		it('does not act on a scroll after being told to let go', () => {
			const { stick, scrollTo, detach } = attach();

			stick.scrollToEnd();
			detach();
			scrollTo(0);

			expect(stick.isPinned).toBe(true);
		});

		it('stops watching the content', () => {
			const { detach } = attach();

			detach();

			expect(observers[0]?.disconnected).toBe(true);
		});
	});
});
