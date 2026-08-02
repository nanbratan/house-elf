import { mastraUrl } from '$lib/server/mastra';

import type { RequestHandler } from './$types';

/**
 * Proxies a chat request to the Mastra server and streams the reply back
 * untouched.
 *
 * This route exists for two reasons and no others: it keeps the Mastra server
 * off the public internet, and it is where auth lands in M6. It must never grow
 * business logic — that belongs in the agent.
 *
 * Notably it does not inspect the response. Mastra reports failures as `error`
 * parts inside a 200 stream, so a status check here would be both useless and
 * misleading; the UI reads the parts.
 */
export const POST: RequestHandler = async ({ params, request, fetch }) => {
	const upstream = await fetch(`${mastraUrl()}/chat/${params.agentId}`, {
		method: 'POST',
		headers: { 'content-type': request.headers.get('content-type') ?? 'application/json' },
		// The request body is a complete JSON message list, so reading it in full
		// costs nothing. The *response* is the one that must not be buffered.
		body: await request.text(),
		// Forwarded so that a client hanging up aborts generation upstream rather
		// than leaving the model to finish a reply nobody will read.
		signal: request.signal
	});

	// `upstream.body` is passed through as a stream, unread.
	return new Response(upstream.body, {
		status: upstream.status,
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'text/event-stream'
		}
	});
};
