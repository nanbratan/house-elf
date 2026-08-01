/**
 * jsdom implements no layout, and therefore no `ResizeObserver` — but a
 * component that scrolls has every right to construct one, and should not have
 * to know it is under test.
 *
 * This is the inert version: it satisfies `new ResizeObserver(...)` and never
 * fires. A test that needs to say "the content grew" replaces this with one it
 * controls, via `vi.stubGlobal`.
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

// Assigned outright rather than guarded: TypeScript's DOM lib insists the global
// already exists, so a `??=` here is an "unnecessary condition" it will not let
// through. Under jsdom it is genuinely absent, and no test wants the real one.
globalThis.ResizeObserver = InertResizeObserver;
