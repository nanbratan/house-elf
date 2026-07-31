import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'**/node_modules/',
			'**/.svelte-kit/',
			'**/.mastra/',
			'**/build/',
			'**/dist/',
			'apps/web/static/',
			// Vendored agent skills — third-party scripts, not this project's code.
			'.agents/'
		]
	},

	js.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	svelte.configs.recommended,

	{
		languageOptions: {
			globals: { ...globals.node, ...globals.browser },
			parserOptions: {
				// Resolves each file against the nearest tsconfig.json, which is what
				// makes type-aware linting work across both workspaces at once.
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		}
	},

	{
		// Svelte files are parsed by svelte-eslint-parser, which delegates the
		// <script> blocks to the typescript-eslint parser for type information.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: { parser: tseslint.parser }
		}
	},

	{
		// Config files at the repo root are not part of any tsconfig, so the project
		// service cannot type them. Lint them syntactically only.
		files: ['**/*.js'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: {
			parserOptions: { projectService: false }
		}
	},

	// Must come last: turns off every rule Prettier owns.
	prettier,
	svelte.configs.prettier
);
