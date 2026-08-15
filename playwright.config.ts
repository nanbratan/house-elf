import { defineConfig, devices } from '@playwright/test';

/**
 * E2E is deliberately small (see .github/instructions/testing.instructions.md):
 * genuine user journeys, plus the handful of assertions jsdom cannot make because
 * it has no layout engine.
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI === undefined ? 0 : 2,
	reporter: process.env.CI === undefined ? 'list' : 'html',

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},

	// The app is mobile-first, and the sidebar's drawer path only exists below the
	// 768px breakpoint, so it needs a viewport a desktop project can never produce.
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: /.*\.mobile\.spec\.ts/
		},
		{
			name: 'mobile-chrome',
			use: { ...devices['Pixel 7'] },
			testMatch: /.*\.mobile\.spec\.ts/
		}
	],

	webServer: {
		command: 'bun run dev',
		cwd: 'apps/web',
		url: 'http://localhost:5173',
		reuseExistingServer: process.env.CI === undefined,
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
