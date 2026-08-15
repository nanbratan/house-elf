import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from '../../src/lib/hooks/use-mobile.ts';

/*
 * The stub in `tests/setup/testing-library.ts` never fires, which is all the
 * components need. The hook itself is the one thing that has to react to the query,
 * so this file installs a matchMedia that hands back its listener.
 */
const removeEventListener = vi.fn();
let fireChange: (() => void) | undefined;

function setViewport(width: number) {
	vi.stubGlobal('innerWidth', width);
	vi.stubGlobal('matchMedia', (media: string) => ({
		media,
		matches: width < 768,
		onchange: null,
		addEventListener: (_event: string, listener: () => void) => {
			fireChange = listener;
		},
		removeEventListener,
		addListener: () => undefined,
		removeListener: () => undefined,
		dispatchEvent: () => false
	}));
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	fireChange = undefined;
});

describe('useIsMobile', () => {
	it('reports desktop for a viewport at the breakpoint', () => {
		setViewport(768);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	it('reports mobile for a viewport below the breakpoint', () => {
		setViewport(767);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it('follows the viewport when the media query changes', () => {
		setViewport(1024);
		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);

		setViewport(400);
		act(() => {
			fireChange?.();
		});

		expect(result.current).toBe(true);
	});

	it('unsubscribes when the component using it goes away', () => {
		setViewport(1024);
		const { unmount } = renderHook(() => useIsMobile());

		unmount();

		// The removal call is the only observable: a listener left attached to a
		// long-lived MediaQueryList has no other visible effect until it leaks.
		expect(removeEventListener).toHaveBeenCalledTimes(1);
	});
});
