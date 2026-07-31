import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

/**
 * Proves the rune compiler is active under Vitest. If `$state` is not compiled, these
 * read as plain variables and the reactive assertions fail — which is exactly the
 * wiring this test exists to catch.
 *
 * Runes live on a class here rather than in local variables: reading a local
 * `$derived` outside a reactive context triggers Svelte's `state_referenced_locally`
 * warning, whereas a property access does not.
 */
class Counter {
	count = $state(0);
	doubled = $derived(this.count * 2);
}

describe('runes under Vitest', () => {
	it('$state and $derived react to assignment', () => {
		const counter = new Counter();

		expect(counter.doubled).toBe(0);

		counter.count = 21;
		expect(counter.doubled).toBe(42);
	});

	it('$effect runs inside $effect.root and stops after cleanup', () => {
		const counter = new Counter();
		const seen: number[] = [];

		const cleanup = $effect.root(() => {
			$effect(() => {
				seen.push(counter.count);
			});
		});

		flushSync();
		expect(seen).toEqual([0]);

		counter.count = 1;
		flushSync();
		expect(seen).toEqual([0, 1]);

		cleanup();

		counter.count = 2;
		flushSync();
		expect(seen).toEqual([0, 1]);
	});
});
