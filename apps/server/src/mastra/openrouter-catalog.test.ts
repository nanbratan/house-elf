import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from './openrouter-catalog.fixture.json';

/**
 * The fixture is a verbatim slice of a real `GET /api/v1/models/user` response
 * recorded on 2026-08-04, not a hand-written shape — the whole reason earlier
 * drafts of this milestone were wrong is that its response was described from
 * memory. It will drift as OpenRouter's catalog moves; see the note in
 * PROGRESS.md.
 *
 * The module caches at module scope, so each case imports it afresh to start
 * cold, the same pattern `env.test.ts` uses.
 */
async function importCatalog() {
	vi.resetModules();
	return import('./openrouter-catalog.ts');
}

function respondWith(body: unknown, status = 200) {
	return vi.fn(() =>
		Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
	);
}

/** Before `z-ai/glm-4.5`'s real expiration_date of 2026-12-31. */
const beforeExpiry = new Date('2026-08-04T00:00:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(beforeExpiry);
	// `env.ts` validates at import time, and the catalog module reads the key from it.
	vi.stubEnv('DATABASE_URL', 'postgresql://user:pw@localhost:5432/db');
	vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test');
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('openRouterModels', () => {
	it('asks the account-scoped catalog with the key', async () => {
		// The public list would ignore this account's privacy settings, which is the
		// only thing filtering logged-prompt models out of the picker.
		const fetchStub = respondWith(fixture);
		vi.stubGlobal('fetch', fetchStub);
		const { openRouterModels } = await importCatalog();

		await openRouterModels();

		expect(fetchStub).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models/user', {
			headers: { Authorization: 'Bearer sk-or-test' }
		});
	});

	it('keeps the ~latest pointers alongside the versions they currently resolve to', async () => {
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const models = await openRouterModels();

		const ids = models.map((model) => model.id);
		expect(ids).toContain('~anthropic/claude-opus-latest');
		expect(ids).toContain('anthropic/claude-opus-5');
	});

	it('keeps the release date each entry publishes', async () => {
		// The picker groups by release month, so an unmapped `created` is unusable.
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const models = await openRouterModels();

		expect(models.find((model) => model.id === 'anthropic/claude-opus-5')?.created).toBe(
			1784912544
		);
	});

	it('drops bodybuilder but keeps the routers that do answer questions', async () => {
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const ids = (await openRouterModels()).map((model) => model.id);

		expect(ids).not.toContain('openrouter/bodybuilder');
		expect(ids).toContain('openrouter/auto');
	});

	it('keeps a model whose expiration date has not arrived', async () => {
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const ids = (await openRouterModels()).map((model) => model.id);

		expect(ids).toContain('z-ai/glm-4.5');
	});

	it('drops a model once its expiration date has passed', async () => {
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();
		vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));

		const ids = (await openRouterModels()).map((model) => model.id);

		expect(ids).not.toContain('z-ai/glm-4.5');
		expect(ids).toContain('z-ai/glm-5v-turbo');
	});

	it('keeps a reasoning object that carries nothing but mandatory', async () => {
		// 127 live models are exactly this. A schema demanding the other fields
		// would reject them outright.
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const models = await openRouterModels();

		expect(models.find((model) => model.id === 'google/gemini-3-pro-image')?.reasoning).toEqual({
			mandatory: true
		});
	});

	it('keeps the effort levels a model publishes', async () => {
		vi.stubGlobal('fetch', respondWith(fixture));
		const { openRouterModels } = await importCatalog();

		const models = await openRouterModels();

		expect(
			models.find((model) => model.id === 'anthropic/claude-opus-5')?.reasoning?.supported_efforts
		).toEqual(['max', 'xhigh', 'high', 'medium', 'low']);
	});

	it('answers from cache inside the TTL instead of going back to the network', async () => {
		const fetchStub = respondWith(fixture);
		vi.stubGlobal('fetch', fetchStub);
		const { openRouterModels } = await importCatalog();

		await openRouterModels();
		vi.setSystemTime(beforeExpiry.getTime() + 59 * 60 * 1000);
		await openRouterModels();

		expect(fetchStub).toHaveBeenCalledOnce();
	});

	it('refetches once the TTL has elapsed', async () => {
		const fetchStub = respondWith(fixture);
		vi.stubGlobal('fetch', fetchStub);
		const { openRouterModels } = await importCatalog();

		await openRouterModels();
		vi.setSystemTime(beforeExpiry.getTime() + 61 * 60 * 1000);
		await openRouterModels();

		expect(fetchStub).toHaveBeenCalledTimes(2);
	});

	it('serves the stale list when a refresh fails', async () => {
		const fetchStub = respondWith(fixture);
		vi.stubGlobal('fetch', fetchStub);
		const { openRouterModels } = await importCatalog();
		await openRouterModels();

		fetchStub.mockRejectedValueOnce(new Error('network is down'));
		vi.setSystemTime(beforeExpiry.getTime() + 61 * 60 * 1000);

		// Metadata going briefly stale must not stop a message being sent.
		await expect(openRouterModels()).resolves.not.toHaveLength(0);
	});

	it('fails loudly when nothing is cached and the fetch fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network is down')))
		);
		const { CatalogUnavailableError, openRouterModels } = await importCatalog();

		await expect(openRouterModels()).rejects.toBeInstanceOf(CatalogUnavailableError);
	});

	it('fails loudly when OpenRouter rejects the key', async () => {
		// The body is a perfectly valid catalog, so only the status check can catch
		// this: an error response that happens to parse must not be served as truth.
		vi.stubGlobal('fetch', respondWith(fixture, 401));
		const { CatalogUnavailableError, openRouterModels } = await importCatalog();

		await expect(openRouterModels()).rejects.toBeInstanceOf(CatalogUnavailableError);
	});

	it('names the status OpenRouter answered with', async () => {
		vi.stubGlobal('fetch', respondWith(fixture, 401));
		const { openRouterModels } = await importCatalog();

		await expect(openRouterModels()).rejects.toHaveProperty(
			'cause.message',
			expect.stringContaining('401')
		);
	});

	it('fails loudly when the response is not the shape the app was built against', async () => {
		vi.stubGlobal('fetch', respondWith({ data: [{ id: 'a/b' }] }));
		const { CatalogUnavailableError, openRouterModels } = await importCatalog();

		await expect(openRouterModels()).rejects.toBeInstanceOf(CatalogUnavailableError);
	});
});
