import tailwindcss from '@tailwindcss/vite';
import babel from '@rolldown/plugin-babel';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedTestConfig } from '../../vitest.shared.ts';

export default defineConfig(({ mode }) =>
	mergeConfig(sharedTestConfig, {
		plugins: [
			tailwindcss(),
			tanstackStart(),
			react(),
			// React Compiler owns memoisation in this app — `react.instructions.md`
			// states that as a rule, so it has to be genuinely on rather than merely
			// available.
			//
			// It is a SEPARATE plugin, not an option on `react()`. @vitejs/plugin-react
			// 6 moved to rolldown/oxc and dropped the `babel` option entirely; passing
			// `react({ babel: { plugins: [...] } })` type-errors but is otherwise
			// ignored at runtime, so the compiler silently does not run. This wiring is
			// the one from the plugin's own README.
			//
			// It compiles the CLIENT bundle only — the preset sets
			// `applyToEnvironmentHook: (env) => env.config.consumer === 'client'`. So
			// the SSR output is plain uncompiled JSX by design (a server render never
			// re-renders, so a memo cache there is pure overhead). Check dist/client,
			// not dist/server, when confirming it ran: look for the `c(n)` memo cache
			// and `Symbol.for('react.memo_cache_sentinel')` around a component.
			//
			// Not under test. The compiler rewrites every component to read through a
			// memo cache, `cache[0] === sentinel ? compute() : cache[0]`, and the cached
			// arm is unreachable on a component's first render — so v8 scores one
			// uncoverable branch per component forever. Measured on this scaffold: the
			// same suite reports 100% branches without the compiler and 50% with it.
			// This guard is load-bearing, not belt-and-braces: Vitest's environment is a
			// `client` consumer, so the preset's own environment hook does NOT exclude
			// it. Vitest 4's AST-aware v8 remapping does not help either — it is already
			// the default here, and the branch is real in the code under test.
			// Tests therefore run the source, and the compiled artefact is covered
			// where its behaviour actually matters, by the Playwright suite against a
			// real build (house-elf-shi.15).
			// `panicThreshold: 'critical_errors'` is a DELIBERATE departure from the
			// compiler's default of 'none', which react.dev calls the production
			// recommendation. That advice targets incremental adoption into an existing
			// codebase, where a build must not break over pre-existing violations. This
			// app is greenfield with a verified-clean baseline, and its only deployment
			// is personal — so a failed build costs a fix, not an outage.
			//
			// What 'none' costs is discovery: a component the compiler cannot handle is
			// SILENTLY SKIPPED, so it just quietly stops being memoised. The lint rules
			// above already reject the loud violation classes at error (verified: both
			// module-global mutation and ref-access-in-render are caught by lint AND by
			// this threshold, so on those it is pure redundancy). The value here is the
			// cases lint does NOT error on — unsupported syntax is only a warning, and
			// compiler bailouts are not lint violations at all.
			//
			// 'critical_errors' rather than 'all_errors'. The two differ by exactly one
			// predicate — handleError throws when the threshold is 'all_errors', OR it
			// is 'critical_errors' and isError(err):
			//
			//   isError = !(err instanceof CompilerError) || err.hasErrors()
			//   hasErrors = some detail has severity 'Error'   (of Error|Warning|Hint|Off)
			//
			// So 'critical_errors' already fails on everything that is genuinely wrong:
			// internal crashes (not a CompilerError at all) and any diagnostic the
			// compiler itself rates severity Error. The ONLY thing 'all_errors' adds is
			// failing when the compiler's complaints are Warning/Hint severity only —
			// which is it declining to optimise a construct it does not support, not a
			// bug in our code. Breaking a build over the compiler's own limitations is a
			// false positive, so we stop one notch short. (This is also why the two
			// looked identical when tested against real violations: those all carry
			// severity Error.)
			//
			// Not a complete net: prop mutation during render is caught by NEITHER lint
			// nor any threshold. Flip to 'none' if a compiler bug ever blocks a build.
			// The threshold above only fires on THROWN errors, and two outcomes never
			// throw at any threshold: `CompileSkip` logs and returns null, and
			// `CompileDiagnostic` calls the logger directly and continues. Those are the
			// quiet degradations — the compiler carrying on while optimising less — so
			// they need the logger to be visible at all.
			//
			// Split by severity rather than warning on everything, because these four
			// kinds are not equivalent:
			//   PipelineError     an internal crash. Never a CompilerError, so isError is
			//                     always true and it ALWAYS fails the build.
			//   CompileError      the compiler rejecting our code. Fails the build when a
			//                     detail is severity Error; logged only when the
			//                     complaints are Warning/Hint.
			//   CompileDiagnostic the compiler declining to optimise a construct.
			//   CompileSkip       a function opted out, e.g. a 'use no memo' directive.
			// The first two are failures and print as errors; the last two are
			// degradation and print as warnings. Neither warning fails the build — that
			// would punish us for the compiler's limitations.
			...(mode === 'test'
				? []
				: [
						babel({
							presets: [
								reactCompilerPreset({
									panicThreshold: 'critical_errors',
									logger: {
										logEvent(filename, event) {
											const where = `[react-compiler] ${event.kind} in ${filename ?? 'unknown file'}`;

											if (event.kind === 'PipelineError' || event.kind === 'CompileError') {
												console.error(where, event);
												return;
											}

											if (event.kind === 'CompileDiagnostic' || event.kind === 'CompileSkip') {
												console.warn(where, event);
											}
										}
									}
								})
							]
						})
					])
		],

		// Under test there is no SSR pass, so React must resolve to its browser build.
		//
		// Outside test the key must be absent, not empty: `conditions: []` replaces
		resolve: {
			// Vite's defaults rather than leaving them alone, which silently drops
			// `browser`. That made `@vercel/oidc` (pulled in by `ai`) resolve to its Node
			// build and crash the browser with `process is not defined` (house-elf-iwy).
			...(mode === 'test' ? { conditions: ['browser'] } : {})
		},

		server: {
			watch: {
				// The coverage reporter writes HTML into the project. Without this,
				// running the tests while `dev` is up makes Vite reload the page once
				// per generated file.
				ignored: ['**/coverage/**']
			}
		},

		test: {
			name: 'web',
			// The app is a browser app, so a DOM is the sensible default. A test that
			// genuinely needs plain Node can opt out with a `// @vitest-environment node`
			// docblock at the top of the file.
			environment: 'jsdom',
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'tests/**/*.test.tsx',
				'tests/**/*.test.ts'
			],
			setupFiles: ['./tests/setup/testing-library.ts'],

			// Stubs are `vi.fn`, and assertions read their call history. Without this
			// a stub's props leak into the next test in the file.
			clearMocks: true,

			coverage: {
				include: ['src/**/*.{ts,tsx}'],
				exclude: [
					// Generated by the router plugin from the files in src/routes.
					'src/routeTree.gen.ts'
				]
			}
		}
	})
);
