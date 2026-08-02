// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A single mutable object so individual tests can vary the environment. The
// module under test holds a reference to it, so mutation is visible there.
const env: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env }));

const { POST } = await import('../../src/routes/api/chat/[agentId]/+server');

/**
 * `POST` expects a full SvelteKit `RequestEvent`. It reads three fields, so the
 * tests supply those three rather than constructing a real event.
 */
function callPost(options: {
	agentId: string;
	request: Request;
	fetch: typeof globalThis.fetch;
}): Promise<Response> {
	const handler = POST as unknown as (event: {
		params: { agentId: string };
		request: Request;
		fetch: typeof globalThis.fetch;
	}) => Promise<Response>;

	return handler({
		params: { agentId: options.agentId },
		request: options.request,
		fetch: options.fetch
	});
}

function chatRequest(body = '{"messages":[]}'): Request {
	return new Request('http://localhost:5173/api/chat/general', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
}

/** A stream that never closes, standing in for a reply still being generated. */
function openStream(): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('data: {"type":"start"}\n\n'));
		}
	});
}

describe('POST /api/chat/[agentId]', () => {
	beforeEach(() => {
		env.MASTRA_URL = 'http://mastra.test:4111';
	});

	it('forwards the whole request body, including the selected model', async () => {
		const body = JSON.stringify({
			messages: [],
			model: 'anthropic/claude-haiku-4-5'
		});
		const fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));

		await callPost({ agentId: 'general', request: chatRequest(body), fetch: fetchSpy });

		expect(fetchSpy).toHaveBeenCalledOnce();
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

		// Not `/api/chat/...`: `/api` is Mastra's own built-in API, and the chat
		// route is mounted at the origin root.
		expect(url).toBe('http://mastra.test:4111/chat/general');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(body);
	});

	it('does not choose a model when the request omits one', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));

		await callPost({ agentId: 'general', request: chatRequest(), fetch: fetchSpy });

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.body).toBe('{"messages":[]}');
	});

	it('uses the agent id from the route, so new agents need no new route', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));

		await callPost({ agentId: 'cv', request: chatRequest(), fetch: fetchSpy });

		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toBe('http://mastra.test:4111/chat/cv');
	});

	it("passes the client's abort signal upstream so hanging up stops generation", async () => {
		const controller = new AbortController();
		const request = new Request('http://localhost:5173/api/chat/general', {
			method: 'POST',
			body: '{}',
			signal: controller.signal
		});
		const fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));

		await callPost({ agentId: 'general', request, fetch: fetchSpy });

		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.signal).toBeDefined();
		controller.abort();
		expect(init.signal?.aborted).toBe(true);
	});

	it('returns the upstream stream itself rather than a buffered copy', async () => {
		const body = openStream();
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));

		const response = await callPost({
			agentId: 'general',
			request: chatRequest(),
			fetch: fetchSpy
		});

		// Identity, not equality: the same stream object arriving back is the only
		// honest proof that nothing read it to completion on the way through.
		expect(response.body).toBe(body);
		expect(response.headers.get('content-type')).toBe('text/event-stream');
	});

	it('falls back to sensible content types when either side omits one', async () => {
		const request = chatRequest();
		request.headers.delete('content-type');
		// A `Response` built from a string with no explicit header carries none.
		const fetchSpy = vi.fn().mockResolvedValue(new Response(null));

		const response = await callPost({ agentId: 'general', request, fetch: fetchSpy });

		// Mastra needs to be told the body is JSON, and the browser needs to be told
		// the reply is a stream; neither should be left to guess.
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(new Headers(init.headers).get('content-type')).toBe('application/json');
		expect(response.headers.get('content-type')).toBe('text/event-stream');
	});

	it('passes an upstream failure status through without interpreting it', async () => {
		// Mastra reports most failures as error parts inside a 200 stream, so the
		// proxy must not attach meaning to the status either way.
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('{"error":"Internal Server Error"}', { status: 500 }));

		const response = await callPost({
			agentId: 'nope',
			request: chatRequest(),
			fetch: fetchSpy
		});

		expect(response.status).toBe(500);
	});

	it('fails loudly when MASTRA_URL is unset rather than assuming an origin', async () => {
		env.MASTRA_URL = undefined;
		const fetchSpy = vi.fn();

		await expect(
			callPost({ agentId: 'general', request: chatRequest(), fetch: fetchSpy })
		).rejects.toMatchObject({ status: 500 });

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
