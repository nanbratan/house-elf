import { describe, expect, it, vi } from 'vitest';

import { requireKnownModel } from './require-known-model.ts';

/**
 * The handler is called directly, with a real `Request` standing in for the one
 * Hono would hand it. Real matters: a request body is a one-shot stream, so
 * reading it without cloning leaves nothing for the route behind us — the bug
 * that shipped once, past tests that faked the request too.
 *
 * What gets rejected, and with what wording, is `models.test.ts`'s business.
 */
function call(body: string) {
	const request = new Request('http://test/chat/general', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
	const next = vi.fn(() => Promise.resolve());
	const context = {
		req: { method: 'POST', raw: request },
		json: (payload: unknown, status: number) => ({ payload, status })
	};

	return {
		next,
		request,
		rejection: requireKnownModel.handler(context as never, next)
	};
}

describe('requireKnownModel', () => {
	it('leaves the body readable for whatever runs next', async () => {
		const { next, request, rejection } = call(
			JSON.stringify({ model: 'anthropic/claude-haiku-4-5', n: 1 })
		);

		await rejection;
		expect(next).toHaveBeenCalledOnce();
		// Without the clone, this throws: the handler already drained the stream.
		await expect(request.json()).resolves.toEqual({
			model: 'anthropic/claude-haiku-4-5',
			n: 1
		});
	});

	it('stops a disallowed model instead of passing it on', async () => {
		const { next, rejection } = call(JSON.stringify({ model: 'anthropic/claude-opus-4-1' }));

		await rejection;
		// Only that the request stopped here. Asserting the status would just be
		// reading back the `json` stub above, and the message is models.test.ts's.
		expect(next).not.toHaveBeenCalled();
	});
});
