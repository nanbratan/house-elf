import { describe, expect, it } from 'vitest';

import { modelCatalogRoute } from './model-catalog-route.ts';
import { MODEL_CATALOG } from './models.ts';

type RouteHandler = (
	context: { json: (payload: unknown) => Response },
	next: () => Promise<void>
) => Response | Promise<Response>;

async function callRoute(): Promise<unknown> {
	// The installed `registerApiRoute` returns this handler unchanged. Narrow the
	// external framework type to the two inputs this direct unit call supplies.
	const handler = (modelCatalogRoute as unknown as { handler?: RouteHandler }).handler;
	if (!handler) throw new Error('The model catalog route has no handler');

	// Only Hono's response helper is replaced. The response itself is the real web
	// primitive a caller receives, so serialization remains part of the exercise.
	const response = await handler({ json: (payload: unknown) => Response.json(payload) }, () =>
		Promise.resolve()
	);
	return response.json();
}

describe('GET /models', () => {
	it('exposes the same catalog the chat boundary accepts', async () => {
		await expect(callRoute()).resolves.toEqual(MODEL_CATALOG);
	});
});
