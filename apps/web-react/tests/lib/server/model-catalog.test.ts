// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { selectableModel } from '../../helpers/models';
import { loadModelCatalog } from '../../../src/lib/server/model-catalog';

const catalog = {
	initialModelId: 'anthropic/claude-haiku-4-5',
	models: [selectableModel({ id: 'anthropic/claude-haiku-4-5', label: 'Haiku 4.5' })]
};

describe('the new-chat model catalog', () => {
	beforeEach(() => {
		vi.stubEnv('MASTRA_URL', 'http://mastra.test:4111');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('loads picker choices from Mastra rather than owning another list', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(catalog));
		vi.stubGlobal('fetch', fetch);

		const loaded = await loadModelCatalog();

		expect(fetch).toHaveBeenCalledExactlyOnceWith('http://mastra.test:4111/models');
		expect(loaded).toEqual(catalog);
	});

	it('validates the response instead of trusting Mastra', async () => {
		// Pre-selects a model the catalog does not list.
		vi.stubGlobal(
			'fetch',
			vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(Response.json({ ...catalog, initialModelId: 'anthropic/claude-opus-5' }))
		);

		await expect(loadModelCatalog()).rejects.toThrow(
			'The initial model must be present in the catalog'
		);
	});
});
