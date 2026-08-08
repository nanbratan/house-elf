// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { proxyChatRequest } from '../../../src/lib/server/chat-proxy';

function chatRequest(body = '{"messages":[]}'): Request {
	return new Request('http://localhost:3000/api/chat/general', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
}

function stubFetch(response = new Response('ok')) {
	const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
	vi.stubGlobal('fetch', fetch);
	return fetch;
}

/** A stream that never closes, standing in for a reply still being generated. */
function openStream(): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('data: {"type":"start"}\n\n'));
		}
	});
}

beforeEach(() => {
	vi.stubEnv('MASTRA_URL', 'http://mastra.test:4111');
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('the chat proxy', () => {
	it('forwards the whole request body, model and thinking flag included', async () => {
		const body = JSON.stringify({
			messages: [],
			model: 'anthropic/claude-haiku-4-5',
			thinking: true
		});
		const fetch = stubFetch();

		await proxyChatRequest('general', chatRequest(body));

		expect(fetch).toHaveBeenCalledOnce();
		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];

		// Not `/api/chat/...`: `/api` is Mastra's own built-in API, and the chat
		// route is mounted at the origin root.
		expect(url).toBe('http://mastra.test:4111/chat/general');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(body);
	});

	it('does not choose a model when the request omits one', async () => {
		const fetch = stubFetch();

		await proxyChatRequest('general', chatRequest());

		const [, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(init.body).toBe('{"messages":[]}');
	});

	it('uses the agent id it is given, so new agents need no new route', async () => {
		const fetch = stubFetch();

		await proxyChatRequest('cv', chatRequest());

		const [url] = fetch.mock.calls[0] as [string];
		expect(url).toBe('http://mastra.test:4111/chat/cv');
	});

	it("passes the client's abort signal upstream so hanging up stops generation", async () => {
		const controller = new AbortController();
		const request = new Request('http://localhost:3000/api/chat/general', {
			method: 'POST',
			body: '{}',
			signal: controller.signal
		});
		const fetch = stubFetch();

		await proxyChatRequest('general', request);

		const [, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(init.signal).toBeDefined();
		controller.abort();
		expect(init.signal?.aborted).toBe(true);
	});

	it('returns the upstream stream itself rather than a buffered copy', async () => {
		const body = openStream();
		stubFetch(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));

		const response = await proxyChatRequest('general', chatRequest());

		// Identity, not equality: the same object proves nothing read the stream.
		expect(response.body).toBe(body);
		expect(response.headers.get('content-type')).toBe('text/event-stream');
	});

	it('falls back to sensible content types when either side omits one', async () => {
		const request = chatRequest();
		request.headers.delete('content-type');
		// A `Response` built from `null` with no explicit header carries none.
		const fetch = stubFetch(new Response(null));

		const response = await proxyChatRequest('general', request);

		const [, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(new Headers(init.headers).get('content-type')).toBe('application/json');
		expect(response.headers.get('content-type')).toBe('text/event-stream');
	});

	it('passes an upstream failure status through without interpreting it', async () => {
		stubFetch(new Response('{"error":"Internal Server Error"}', { status: 500 }));

		const response = await proxyChatRequest('nope', chatRequest());

		expect(response.status).toBe(500);
	});

	it('fails loudly when MASTRA_URL is unset rather than assuming an origin', async () => {
		vi.stubEnv('MASTRA_URL', undefined);
		const fetch = stubFetch();

		await expect(proxyChatRequest('general', chatRequest())).rejects.toThrow(
			'MASTRA_URL is not set'
		);

		expect(fetch).not.toHaveBeenCalled();
	});
});
