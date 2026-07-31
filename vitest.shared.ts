import type { ViteUserConfig } from 'vitest/config';

/**
 * Vitest defaults shared by every workspace.
 *
 * Each workspace owns its own config rather than being a project in a root one,
 * because SvelteKit's Vite plugin resolves `root`, `$lib` and `$app` against
 * `process.cwd()` — so `apps/web` can only be tested by a process running in
 * `apps/web`. Making the server the same shape keeps one rule instead of two.
 *
 * What belongs here: policy that should be identical everywhere. What does not:
 * anything naming a specific directory — those live with the workspace they describe.
 */
export const sharedTestConfig = {
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				// Tests and test scaffolding are not the subject of coverage.
				'**/*.test.ts',
				'tests/**'
			],
			thresholds: {
				lines: 80,
				branches: 75
			}
		}
	}
} satisfies ViteUserConfig;
