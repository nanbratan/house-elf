import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedTestConfig } from '../../vitest.shared.ts';

export default mergeConfig(
	sharedTestConfig,
	defineConfig({
		test: {
			projects: [
				{
					// Pure logic, no I/O, no containers. Must stay fast — this is the
					// subset the pre-commit hook runs.
					test: {
						name: 'unit',
						environment: 'node',
						include: ['src/**/*.test.ts']
					}
				},

				{
					// Real Postgres on :5433. Needs `bun run db:up`.
					test: {
						name: 'integration',
						environment: 'node',
						include: ['tests/**/*.integration.test.ts'],
						setupFiles: ['./tests/setup/load-env.ts'],
						// Postgres connections are slower to establish than the default allows.
						testTimeout: 20_000,
						hookTimeout: 20_000
					}
				}
			],

			coverage: {
				include: ['src/**/*.ts'],
				exclude: [
					// Pure wiring — constructs Mastra from config, contains no branches.
					'src/mastra/index.ts',

					// Agent definitions are prompts and configuration. Their behaviour is
					// tested through mocked-model integration tests (M1 onward), not by
					// executing the module.
					'src/mastra/agents/**'

					// Per-directory thresholds for src/mastra/{tools,workflows} land with
					// the code they govern (M1 onward). Vitest errors on a glob that matches
					// nothing, so they cannot be declared before those directories exist.
				],

				thresholds: {
					// Tools are real logic with real side effects
					// (.github/instructions/testing.instructions.md).
					'src/mastra/tools/**': {
						lines: 90,
						branches: 85
					}
				}
			}
		}
	})
);
