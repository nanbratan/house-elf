import { describe, expect, it, vi } from 'vitest';

import { prepareChatRequest } from './prepare-chat-request.ts';

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

const haiku = 'anthropic/claude-haiku-4-5';

describe('prepareChatRequest', () => {
	it('leaves a readable body for whatever runs next', async () => {
		const { next, delivered, settled } = call(JSON.stringify({ model: haiku, messages: [] }));

		await settled;
		expect(next).toHaveBeenCalledOnce();
		// Without the clone this throws: the handler already drained the stream.
		await expect(delivered()).resolves.toMatchObject({ messages: [] });
	});

	it('addresses the model through OpenRouter rather than forwarding the catalog id', async () => {
		// The client names `anthropic/…`; sending that on would reach Anthropic
		// directly, on a key the app no longer has.
		const { delivered, settled } = call(JSON.stringify({ model: haiku, messages: [] }));

		await settled;
		await expect(delivered()).resolves.toMatchObject({
			model: 'openrouter/anthropic/claude-haiku-4-5'
		});
	});

	it('stops a disallowed model with a 400 instead of passing it on', async () => {
		const { next, settled } = call(JSON.stringify({ model: 'anthropic/claude-opus-4-1' }));

		expect(await statusOf(settled)).toBe(400);
		expect(next).not.toHaveBeenCalled();
		// That it is 400 and not 500 is the claim: an unusable model is the caller's
		// mistake, and `UnknownModelError` has to be caught rather than thrown on.
		// The wording of the message is models.test.ts's business.
	});

	it('turns the client boolean into provider options it never named', async () => {
		const { delivered, settled } = call(JSON.stringify({ model: haiku, thinking: true }));

		await settled;
		const body = await delivered();
		expect(body.providerOptions).toEqual({
			anthropic: { thinking: { type: 'enabled', budgetTokens: 4096 } }
		});
		// The boolean itself is not forwarded; `agent.stream()` has no such option.
		expect(body).not.toHaveProperty('thinking');
	});

	it('says thinking-off explicitly when the flag is absent', async () => {
		const { delivered, settled } = call(JSON.stringify({ model: haiku }));

		await settled;
		await expect(delivered()).resolves.toMatchObject({
			providerOptions: { anthropic: { thinking: { type: 'disabled' } } }
		});
	});

	it('discards provider options the client tried to set itself', async () => {
		// Otherwise a browser could name its own token budget, on a request that
		// costs money.
		const { delivered, settled } = call(
			JSON.stringify({
				model: haiku,
				thinking: false,
				providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 60000 } } }
			})
		);

		await settled;
		await expect(delivered()).resolves.toMatchObject({
			providerOptions: { anthropic: { thinking: { type: 'disabled' } } }
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
