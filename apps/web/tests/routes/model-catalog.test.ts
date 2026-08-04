// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env }));

import { selectableModel } from '../helpers/models.ts';

const { load } = await import('../../src/routes/c/new/+page.server');

const catalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [selectableModel({ id: 'anthropic/claude-haiku-4-5', label: 'Haiku 4.5' })]
};

/** `load` reads only SvelteKit's injected fetch, so no full RequestEvent is needed. */
function callLoad(fetch: typeof globalThis.fetch): ReturnType<Exclude<typeof load, undefined>> {
	return load({ fetch } as never);
}

describe('the new-chat model catalog', () => {
	beforeEach(() => {
		env.MASTRA_URL = 'http://mastra.test:4111';
	});

	it('loads picker choices from Mastra rather than owning another list', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(Response.json(catalog));

		const loaded = await callLoad(fetchSpy);

		expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('http://mastra.test:4111/models');
		expect(loaded).toEqual({ modelCatalog: catalog });
	});

	it('refuses a catalog that pre-selects a model it does not list', async () => {
		// The page would open with a picker whose current choice it cannot display.
		const fetchSpy = vi.fn().mockResolvedValue(
			Response.json({
				...catalog,
				initialModelId: 'anthropic/claude-opus-5'
			})
		);

		// The message, not a bare `toThrow()`: that also passes when the test's own
		// fetch stub is what broke.
		await expect(callLoad(fetchSpy)).rejects.toThrow(
			'The initial model must be present in the catalog'
		);
	});
});
