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

	it('counts a reader just short of the end as still reading it', () => {
		const { stick, scrollTo } = attach();

		scrollTo(BOTTOM - 200);

		expect(stick.isPinned).toBe(true);
	});

	it('lets go once the reader has gone further than that', () => {
		const { stick, scrollTo } = attach();

		scrollTo(BOTTOM - 201);

		expect(stick.isPinned).toBe(false);
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

	describe('once the elements go away', () => {
		it('stops listening to the scroller it no longer owns', () => {
			const { stick, scrollTo, detach } = attach();

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
