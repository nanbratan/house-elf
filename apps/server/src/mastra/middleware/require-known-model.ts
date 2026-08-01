/**
 * Rejects a chat request that does not name a model the allowlist offers.
 *
 * This has to be middleware rather than agent configuration. `chatRoute`
 * destructures the JSON body and spreads whatever is left into `agent.stream()`,
 * where `model` is a documented request-scoped override — so a body field reaches
 * the provider without the agent's own `model` ever being consulted. Verified
 * against a running server: posting `model: "anthropic/claude-does-not-exist-9"`
 * came back as Anthropic's `not_found_error: model: claude-does-not-exist-9`.
 *
 * Middleware wins over both route options and the body (`middleware > route
 * options > body`), so this runs first and short-circuits before anything is
 * spent.
 */

import type { Middleware } from '@mastra/core/server';

import { UnknownModelError, resolveModel } from '../models';

export const requireKnownModel = {
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

		try {
			resolveModel((body as { model?: unknown } | null)?.model);
		} catch (error) {
			if (error instanceof UnknownModelError) return c.json({ error: error.message }, 400);
			throw error;
		}

		return next();
	}
} satisfies Middleware;
