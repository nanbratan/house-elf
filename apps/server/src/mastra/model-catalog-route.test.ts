import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { respondWith, stubCatalogEnv } from '../../tests/helpers/openrouter-catalog.ts';

type RouteHandler = (
	context: { json: (payload: unknown, status?: number) => Response },
	next: () => Promise<void>
) => Response | Promise<Response>;

async function callRoute(): Promise<Response> {
	// The catalog caches at module scope, so the graph is built per case, after
	// the fetch stub is in place.
	vi.resetModules();
	const { modelCatalogRoute } = await import('./model-catalog-route.ts');

	// The installed `registerApiRoute` returns this handler unchanged. Narrow the
	// external framework type to the two inputs this direct unit call supplies.
	const handler = (modelCatalogRoute as unknown as { handler?: RouteHandler }).handler;
	if (!handler) throw new Error('The model catalog route has no handler');

	// Only Hono's response helper is replaced. The response itself is the real web
	// primitive a caller receives, so serialization remains part of the exercise.
	return handler(
		{ json: (payload: unknown, status?: number) => Response.json(payload, { status }) },
		() => Promise.resolve()
	);
}

beforeEach(() => {
	stubCatalogEnv();
	vi.stubGlobal('fetch', respondWith());
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('GET /models', () => {
	it('serves the catalog the chat boundary accepts, in the shape the browser parses', async () => {
		const { modelCatalogSchema } = await import('@house-elf/shared');

		const payload: unknown = await (await callRoute()).json();

		const catalog = modelCatalogSchema.parse(payload);
		expect(catalog.initialModelId).toBe('openrouter/auto');
		expect(catalog.models.map((model) => model.id)).toContain('anthropic/claude-opus-5');
	});

	it('answers 503 rather than 500 when the catalog has never been fetched', async () => {
		// Nothing here is broken, and this is the one state worth retrying.
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network is down')))
		);

		expect((await callRoute()).status).toBe(503);
	});
});
