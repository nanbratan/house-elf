import type { ViteUserConfig } from 'vitest/config';

/**
 * Vitest defaults shared by every workspace.
 *
 * Each workspace owns its own config rather than being a project in a root one,
 * because each app's Vite plugins and path aliases are workspace-specific, and a
 * single root project would have to reconcile all of them. Making the server the
 * same shape keeps one rule instead of two.
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
