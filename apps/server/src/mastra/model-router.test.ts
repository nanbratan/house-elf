import { describe, expect, it } from 'vitest';

import { routerModelId } from './model-router.ts';
import { resolveModel } from './models.ts';

/**
 * The catalog ids used here come from the allowlist, never from memory, and each
 * was confirmed live against OpenRouter before this file was written.
 */
describe('routerModelId', () => {
	it('keeps the whole catalog id, slash included, behind the openrouter provider', () => {
		expect(routerModelId(resolveModel('anthropic/claude-opus-5'))).toBe(
			'openrouter/anthropic/claude-opus-5'
		);
	});

	it('composes the same way for a dash-versioned id', () => {
		expect(routerModelId(resolveModel('anthropic/claude-haiku-4-5'))).toBe(
			'openrouter/anthropic/claude-haiku-4-5'
		);
	});
});
