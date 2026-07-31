import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedTestConfig } from '../../vitest.shared.ts';

export default defineConfig(({ mode }) =>
	mergeConfig(sharedTestConfig, {
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }: { filename: string }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				// Kit resolves `$env/*` against `kit.env.dir`, which defaults to this
				// directory. That is deliberate: the web app is a thin proxy to the
				// Mastra server and must not hold the database URL or the provider key.
				// It gets its own `apps/web/.env` when it first needs a variable.

				// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
				// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
				// See https://svelte.dev/docs/kit/adapters for more information about adapters.
				adapter: adapter()
			})
		],

		resolve: {
			// Under test there is no SSR pass, so Svelte must resolve to its client
			// build — otherwise runes throw `rune_outside_svelte`. Outside test this must
			// stay empty so the real SSR build is used. Per the Svelte testing docs.
			conditions: mode === 'test' ? ['browser'] : []
		},

		test: {
			name: 'web',
			// `@testing-library/svelte` ships `.svelte.js` source that uses runes, so it
			// has to be compiled by the Svelte plugin rather than externalised.
			server: { deps: { inline: [/@testing-library\/svelte/] } },
			// The app is a browser app, so a DOM is the sensible default. A test that
			// genuinely needs plain Node can opt out with a `// @vitest-environment node`
			// docblock at the top of the file.
			environment: 'jsdom',
			include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
			setupFiles: ['./tests/setup/testing-library.ts', './tests/setup/app-state.ts'],

			coverage: {
				include: ['src/**/*.{ts,svelte}'],
				exclude: [
					// Re-export barrels: no logic, and covering them says nothing.
					'src/lib/index.ts',

					// Type-only declarations produce no runtime code.
					'src/app.d.ts',

					// Static placeholder pages with no logic. `+layout.svelte` is NOT
					// excluded — it owns the sidebar behaviour and is component-tested.
					'src/routes/**/+page.svelte'

					// A threshold for src/lib lands with the code it governs (M1 onward).
					// Vitest errors on a glob that matches nothing.
				]
			}
		}
	})
);
