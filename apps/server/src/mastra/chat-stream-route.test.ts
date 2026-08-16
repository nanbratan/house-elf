import { RequestContext } from '@mastra/core/request-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { respondWith, stubCatalogEnv } from '../../tests/helpers/openrouter-catalog.ts';

/**
 * The handler is called with a real `Request` and answers with a real
 * `Response`, so every status asserted below is the one the handler chose
 * rather than a value this file invented.
 *
 * Two kinds of test live here. The refusals stop before the agent is reached,
 * and assert the status and the text a client sees. The rest assert what the
 * agent is asked for, captured through a fake agent — because between the body
 * and the provider this route resolves a model, maps the reader's settings and
 * wires an abort signal, and none of that shows in a status code.
 *
 * What makes a model unknown is `models.test.ts`'s business, what a setting
 * translates to is `chat-settings.test.ts`'s, and what the body may contain is
 * `chat-request.test.ts`'s.
 */
type HandleChatRequest = typeof import('./chat-stream-route.ts').handleChatRequest;

let handleChatRequest: HandleChatRequest;

const settings = { model: 'anthropic/claude-opus-5', reasoning: { mode: 'off' } };
const messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];

function request(body: string) {
	return new Request('http://test/chat/general', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
}

function post(body: string) {
	return handleChatRequest({
		request: request(body),
		// Every case using this one is refused before the agent is reached, so an
		// agent that throws proves the refusal happened rather than masking it.
		mastra: {
			getAgentById: () => ({
				stream: () => {
					throw new Error('reached the agent');
				}
			})
		} as never,
		agentId: 'general',
		requestContext: new RequestContext()
	});
}

/** Everything `agent.stream()` is asked for, which is the route's whole output. */
interface AgentParams {
	model?: unknown;
	system?: unknown;
	providerOptions?: unknown;
	abortSignal?: unknown;
}

interface AgentAsk {
	/** `handleChatStream` consumes the messages itself and passes them first. */
	messages: unknown;
	params: AgentParams;
}

/**
 * The params the route builds, captured at the agent.
 *
 * The fake agent throws so that Mastra's own streaming never runs — the params
 * are the subject, and starting a stream would drag `handleChatStream` into
 * every test here. Reaching `agent.stream()` at all is the proof the request was
 * accepted, so the throw is rethrown if the params never arrive.
 *
 * Depends on Mastra passing the params as `stream()`'s second argument, which is
 * `@mastra/ai-sdk` internals — but it is the only place the built params are
 * observable, and a change there is exactly what this should catch.
 */
async function sentToAgent(body: Record<string, unknown>): Promise<AgentAsk> {
	let captured: AgentAsk | undefined;

	const response = handleChatRequest({
		request: request(JSON.stringify(body)),
		mastra: {
			getAgentById: () => ({
				stream: (messages: unknown, params: AgentParams) => {
					captured = { messages, params };
					throw new Error('captured the params');
				}
			})
		} as never,
		agentId: 'general',
		requestContext: new RequestContext()
	});

	await expect(response).rejects.toThrow('captured the params');
	if (!captured) throw new Error('The agent was never asked to stream.');
	return captured;
}

/** The params alone, for the cases that do not care about the conversation. */
async function paramsSentToAgent(body: Record<string, unknown>): Promise<AgentParams> {
	return (await sentToAgent(body)).params;
}

beforeEach(async () => {
	stubCatalogEnv();
	vi.stubGlobal('fetch', respondWith());
	// The catalog caches at module scope and `env.ts` validates at import time,
	// so the module graph is built after the stubs rather than at file load.
	vi.resetModules();
	({ handleChatRequest } = await import('./chat-stream-route.ts'));
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('handleChatRequest', () => {
	it('answers 400 for a body that is not JSON at all', async () => {
		// Without the catch this rejects and the caller gets a bare 500 for what is
		// plainly a bad request.
		expect((await post('not json')).status).toBe(400);
	});

	it('answers 400 for a body the allowlist refuses', async () => {
		const response = await post(JSON.stringify({ messages, settings, actor: { id: 'admin' } }));

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: 'Unrecognized key: "actor"'
		});
	});

	it('stops a model the catalog does not carry with a 400 instead of billing for it', async () => {
		const response = await post(
			JSON.stringify({
				messages,
				settings: { model: 'anthropic/claude-opus-4-1', reasoning: { mode: 'off' } }
			})
		);

		// 400 and not 500: an unusable model is the caller's mistake, so
		// `UnknownModelError` has to be caught rather than thrown on.
		expect(response.status).toBe(400);
	});

	it('stops a thinking request the model cannot serve with a 400', async () => {
		// `gpt-5.3-chat` takes no reasoning parameter, so the request is the
		// caller's mistake rather than something to send on and be billed for.
		const response = await post(
			JSON.stringify({
				messages,
				settings: { model: 'openai/gpt-5.3-chat', reasoning: { mode: 'on' } }
			})
		);

		expect(response.status).toBe(400);
	});

	it('names the setting a model will not take, rather than dropping it', async () => {
		// The whole point of refusing rather than dropping: a control that moved in
		// the picker and changed nothing is indistinguishable from one that worked.
		const response = await post(
			JSON.stringify({
				messages,
				settings: { ...settings, temperature: 0.5 }
			})
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error:
				'Model anthropic/claude-opus-5 will not take a temperature: it ignores sampling parameters.'
		});
	});

	it('answers 503 when the catalog cannot say whether the model exists', async () => {
		// The alternative is billing an unvalidated id, and a retry is the right
		// response to a catalog that has simply never been fetched.
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network is down')))
		);

		expect((await post(JSON.stringify({ messages, settings }))).status).toBe(503);
	});

	it('addresses the model through the router rather than forwarding the catalog id', async () => {
		// The agent carries a fallback model, so a request whose choice is dropped
		// is answered by that one instead — a difference no status code shows. The
		// prefix is the router's, and a browser string must not reach a provider by
		// being given one here.
		const params = await paramsSentToAgent({ messages, settings });

		expect(params.model).toBe('openrouter/anthropic/claude-opus-5');
	});

	it('asks about the conversation the request carried', async () => {
		const { messages: asked } = await sentToAgent({ messages, settings });

		expect(asked).toEqual(messages);
	});

	it('turns the reasoning choice into provider options the client never named', async () => {
		// The client names intent; what it costs at the provider is decided here.
		// Thinking-off is stated out loud because several models think unless told
		// not to.
		const thinkingOn = await paramsSentToAgent({
			messages,
			settings: { model: 'anthropic/claude-opus-5', reasoning: { mode: 'on' } }
		});
		const thinkingOff = await paramsSentToAgent({ messages, settings });

		expect(thinkingOn.providerOptions).toEqual({ openrouter: { reasoning: { enabled: true } } });
		expect(thinkingOff.providerOptions).toEqual({ openrouter: { reasoning: { enabled: false } } });
	});

	it('carries every setting the reader chose to the provider', async () => {
		// `openrouter/auto` is the one catalog entry that accepts all of these at
		// once, cost tier included — which is the point, since it is also where a
		// first visit starts.
		const params = await paramsSentToAgent({
			messages,
			settings: {
				model: 'openrouter/auto',
				reasoning: { mode: 'on', effort: 'high' },
				temperature: 0.5,
				seed: 7,
				costTier: 'low'
			}
		});

		expect(params.providerOptions).toEqual({
			openrouter: {
				reasoning: { enabled: true, effort: 'high' },
				temperature: 0.5,
				seed: 7,
				plugins: [{ id: 'auto-router', cost_tier: 'low' }]
			}
		});
	});

	it('passes on the page context the request contributed', async () => {
		// Accepting `system` and then dropping it would leave
		// `useAssistantInstructions` silently inert.
		const params = await paramsSentToAgent({
			messages,
			settings,
			system: 'The user is viewing their meal log.'
		});

		expect(params.system).toBe('The user is viewing their meal log.');
	});

	it('lets a client hangup stop the generation it is being billed for', async () => {
		// `chatRoute` wires this itself; `handleChatStream` does not. Without it the
		// provider keeps generating after the reader presses Stop.
		const params = await paramsSentToAgent({ messages, settings });

		expect(params.abortSignal).toBeInstanceOf(AbortSignal);
	});
});
