import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { respondWith, stubCatalogEnv } from '../../../tests/helpers/openrouter-catalog.ts';

/**
 * The handler is called directly, with a real `Request` standing in for the one
 * Hono would hand it. Real matters twice over: a request body is a one-shot
 * stream, so reading it without cloning leaves nothing for the route behind us —
 * the bug that shipped once, past tests that faked the request too — and the
 * rewrite this middleware performs replaces `c.req.raw` outright.
 *
 * What gets rejected for a bad model, and with what wording, is `models.test.ts`'s
 * business; what thinking translates to is `thinking.test.ts`'s.
 */
type PrepareChatRequest = typeof import('./prepare-chat-request.ts').prepareChatRequest;

let prepareChatRequest: PrepareChatRequest;

function call(body: string, method = 'POST') {
	const context = {
		req: {
			method,
			raw: new Request('http://test/chat/general', {
				method,
				headers: { 'content-type': 'application/json' },
				body: method === 'GET' ? undefined : body
			})
		},
		json: (payload: unknown, status: number) => ({ payload, status })
	};
	const next = vi.fn(() => Promise.resolve());

	return {
		next,
		/** What the route behind the middleware would read. */
		delivered: async () => (await context.req.raw.json()) as Record<string, unknown>,
		settled: prepareChatRequest.handler(context as never, next)
	};
}

/** The status the handler chose, for the paths that stop the request here. */
async function statusOf(settled: unknown) {
	return ((await settled) as { status: number }).status;
}

const opus = 'anthropic/claude-opus-5';

beforeEach(async () => {
	stubCatalogEnv();
	vi.stubGlobal('fetch', respondWith());
	// The catalog caches at module scope and `env.ts` validates at import time,
	// so the module graph is built after the stubs rather than at file load.
	vi.resetModules();
	({ prepareChatRequest } = await import('./prepare-chat-request.ts'));
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('prepareChatRequest', () => {
	it('leaves a readable body for whatever runs next', async () => {
		const { next, delivered, settled } = call(JSON.stringify({ model: opus, messages: [] }));

		await settled;
		expect(next).toHaveBeenCalledOnce();
		// Without the clone this throws: the handler already drained the stream.
		await expect(delivered()).resolves.toMatchObject({ messages: [] });
	});

	it('addresses the model through OpenRouter rather than forwarding the catalog id', async () => {
		// Mastra's model router reaches OpenRouter under a provider of its own, so
		// the two-segment catalog id has to gain a third.
		const { delivered, settled } = call(JSON.stringify({ model: opus, messages: [] }));

		await settled;
		await expect(delivered()).resolves.toMatchObject({
			model: 'openrouter/anthropic/claude-opus-5'
		});
	});

	it('stops a model the catalog does not carry with a 400 instead of passing it on', async () => {
		const { next, settled } = call(JSON.stringify({ model: 'anthropic/claude-opus-4-1' }));

		expect(await statusOf(settled)).toBe(400);
		expect(next).not.toHaveBeenCalled();
		// That it is 400 and not 500 is the claim: an unusable model is the caller's
		// mistake, and `UnknownModelError` has to be caught rather than thrown on.
	});

	it('answers 503 when the catalog cannot say whether the model exists', async () => {
		// The alternative is billing an unvalidated id, and a retry is the right
		// response to a catalog that has simply never been fetched. Nothing has
		// fetched it in this case, so replacing the stub is enough.
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network is down')))
		);

		const { next, settled } = call(JSON.stringify({ model: opus }));

		expect(await statusOf(settled)).toBe(503);
		expect(next).not.toHaveBeenCalled();
	});

	it('stops a thinking request the model cannot serve with a 400', async () => {
		// `gpt-5.3-chat` takes no reasoning parameter, so the request is the
		// caller's mistake rather than something to send on and be billed for.
		const { next, settled } = call(
			JSON.stringify({ model: 'openai/gpt-5.3-chat', thinking: true })
		);

		expect(await statusOf(settled)).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('turns the client boolean into provider options it never named', async () => {
		const { delivered, settled } = call(JSON.stringify({ model: opus, thinking: true }));

		await settled;
		const body = await delivered();
		expect(body.providerOptions).toEqual({ openrouter: { reasoning: { enabled: true } } });
		// The boolean itself is not forwarded; `agent.stream()` has no such option.
		expect(body).not.toHaveProperty('thinking');
	});

	it('says thinking-off explicitly when the flag is absent', async () => {
		const { delivered, settled } = call(JSON.stringify({ model: opus }));

		await settled;
		await expect(delivered()).resolves.toMatchObject({
			providerOptions: { openrouter: { reasoning: { enabled: false } } }
		});
	});

	it('discards provider options the client tried to set itself', async () => {
		// Otherwise a browser could name its own effort level or token budget, on a
		// request that costs money.
		const { delivered, settled } = call(
			JSON.stringify({
				model: opus,
				thinking: false,
				providerOptions: { openrouter: { reasoning: { enabled: true, max_tokens: 60000 } } }
			})
		);

		await settled;
		// Whole-value, not a partial match: a leaked `max_tokens` alongside the
		// server's own field is exactly the failure this is about.
		expect((await delivered()).providerOptions).toEqual({
			openrouter: { reasoning: { enabled: false } }
		});
	});

	it('rejects a body that is not a JSON object', async () => {
		const { next, settled } = call('[]');

		expect(await statusOf(settled)).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects a body that is not JSON at all', async () => {
		const { next, settled } = call('not json');

		// Without the catch this rejects, and the caller gets a bare 500 for what is
		// plainly a bad request.
		expect(await statusOf(settled)).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('leaves a request that is not a POST alone', async () => {
		// The path glob also matches whatever else is mounted under /chat, and there
		// is no body to resolve a model from on those.
		const { next, settled } = call('', 'GET');

		await settled;
		expect(next).toHaveBeenCalledOnce();
	});
});
