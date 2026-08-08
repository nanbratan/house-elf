import { mastraUrl } from './mastra';

/**
 * Streams a chat reply back from Mastra untouched.
 *
 * The proxy exists to keep Mastra off the public internet, and to be where auth
 * lands in M6 (house-elf-q47). It must never grow business logic — that belongs
 * in the agent.
 *
 * Separate from the route file so tests call it directly, not through a faked
 * handler context.
 */
export async function proxyChatRequest(agentId: string, request: Request): Promise<Response> {
	const upstream = await fetch(`${mastraUrl()}/chat/${agentId}`, {
		method: 'POST',
		headers: { 'content-type': request.headers.get('content-type') ?? 'application/json' },
		// Safe to buffer: a complete message list. Only the reply must stay a stream.
		body: await request.text(),
		// Lets a client hangup abort generation upstream.
		signal: request.signal
	});

	// Mastra reports failures as `error` parts inside a 200 stream, so the UI
	// needs the stream itself, not a verdict formed here.
	return new Response(upstream.body, {
		status: upstream.status,
		headers: { 'content-type': upstream.headers.get('content-type') ?? 'text/event-stream' }
	});
}
