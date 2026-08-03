/**
 * Settles what a chat request is allowed to ask for, before anything is spent.
 *
 * This has to be middleware rather than agent configuration. `chatRoute`
 * destructures the JSON body and spreads whatever is left into `agent.stream()`,
 * where `model` is a documented request-scoped override — so a body field
 * reaches the provider without the agent's own `model` ever being consulted.
 * Verified against a running server: posting
 * `model: "anthropic/claude-does-not-exist-9"` came back as Anthropic's
 * `not_found_error: model: claude-does-not-exist-9`. `providerOptions` reaches
 * it the same way, which is why the body is rewritten here rather than merely
 * inspected: the browser sends a boolean, and the server alone decides what that
 * boolean means to the provider.
 *
 * Middleware wins over both route options and the body (`middleware > route
 * options > body`), so this runs first and short-circuits before anything is
 * spent.
 */

import type { Middleware } from '@mastra/core/server';

import { routerModelId } from '../model-router';
import { UnknownModelError, resolveModel } from '../models';
import { ThinkingNotSupportedError, thinkingProviderOptions, wantsThinking } from '../thinking';

export const prepareChatRequest = {
	path: '/chat/*',
	handler: async (c, next) => {
		if (c.req.method !== 'POST') return next();

		let body: unknown;
		try {
			// Clone before reading. The route handler parses the body itself, and a
			// request body is a one-shot stream — consuming it here leaves the
			// handler with nothing and produces a bare 500.
			body = await c.req.raw.clone().json();
		} catch {
			return c.json({ error: 'Request body must be JSON.' }, 400);
		}

		if (typeof body !== 'object' || body === null || Array.isArray(body)) {
			return c.json({ error: 'Request body must be a JSON object.' }, 400);
		}

		const { thinking, ...rest } = body as Record<string, unknown>;
		// `providerOptions` is dropped rather than merged with. It is the field that
		// would let a browser set a thinking budget, a cache policy or an effort
		// level directly, and nothing upstream of here has any business naming one.
		delete rest.providerOptions;

		let rewritten: Record<string, unknown>;
		try {
			const model = resolveModel(rest.model);
			// The client names a catalog id; the provider is addressed by the router
			// id, so the field is replaced rather than passed through.
			const routed = { ...rest, model: routerModelId(model) };
			const options = thinkingProviderOptions(model, wantsThinking(thinking));
			rewritten = options === undefined ? routed : { ...routed, providerOptions: options };
		} catch (error) {
			if (error instanceof UnknownModelError || error instanceof ThinkingNotSupportedError) {
				return c.json({ error: error.message }, 400);
			}
			throw error;
		}

		// Hono reads the body from `c.req.raw` and caches it on first read. Nothing
		// has read it yet — the check above went through a clone — so replacing the
		// raw request is what the route behind us will see.
		c.req.raw = new Request(c.req.raw, { body: JSON.stringify(rewritten) });

		return next();
	}
} satisfies Middleware;
