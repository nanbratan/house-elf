import { describe, expect, it } from 'vitest';

import { routerModelId } from './model-router.ts';

describe('routerModelId', () => {
	it('keeps the whole catalog id, slash included, behind the openrouter provider', () => {
		expect(routerModelId({ id: 'anthropic/claude-opus-5' })).toBe(
			'openrouter/anthropic/claude-opus-5'
		);
	});

	it('gives a router the same treatment, rather than reading its prefix as one', () => {
		// `openrouter/auto` is a model id that happens to start with the provider
		// name. Stripping or skipping the prefix here would address nothing.
		expect(routerModelId({ id: 'openrouter/auto' })).toBe('openrouter/openrouter/auto');
	});
});
