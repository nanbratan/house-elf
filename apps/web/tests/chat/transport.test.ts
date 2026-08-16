import type { ChatSettings } from '@house-elf/shared';
import { AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChatTransport } from '../../src/lib/chat/transport.ts';

// The transport is the boundary under test: what matters is where it sends and
// what it prepares, so it is stubbed to record the options it was built with
// rather than to have behaviour of its own.
vi.mock('@assistant-ui/react-ai-sdk', () => ({ AssistantChatTransport: vi.fn() }));

const mockedTransport = vi.mocked(AssistantChatTransport);

const settings: ChatSettings = { model: 'openrouter/auto', reasoning: { mode: 'off' } };

/**
 * The request the transport would send, given what it was last built with.
 *
 * `prepareSendMessagesRequest` is our own callback, so what it returns is the
 * production code running. Its absence is an error rather than an empty result:
 * a body assertion against a missing preparer would pass by reading nothing.
 */
async function prepare(payload: Record<string, unknown> = {}) {
	const preparer = mockedTransport.mock.lastCall?.[0]?.prepareSendMessagesRequest;
	if (!preparer) throw new Error('The transport was built without a request preparer.');

	return await preparer({
		id: 'thread-1',
		messages: [],
		trigger: 'submit-message',
		messageId: undefined,
		...payload
	} as never);
}

/** What a send would carry, as sent: a field set to `undefined` never leaves. */
async function wireBody(payload: Record<string, unknown> = {}) {
	return JSON.parse(JSON.stringify((await prepare(payload)).body)) as Record<string, unknown>;
}

beforeEach(() => {
	mockedTransport.mockReset();
});

describe('createChatTransport', () => {
	it("sends to the agent's own endpoint", () => {
		createChatTransport({ agentId: 'general', settings });

		expect(mockedTransport.mock.lastCall?.[0]?.api).toBe('/api/chat/general');
	});

	it('sends only the fields the server allows, dropping what assistant-ui adds', async () => {
		createChatTransport({ agentId: 'general', settings });

		// assistant-ui's own body carries `callSettings`, `config` and `tools` from
		// the runtime's model context. The server refuses a field it does not know,
		// so any of these reaching it is a 400 on every send.
		const body = await wireBody({
			messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
			body: { callSettings: { temperature: 2 }, config: {}, tools: {} }
		});

		expect(body).toEqual({
			id: 'thread-1',
			messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
			trigger: 'submit-message',
			settings: { model: 'openrouter/auto', reasoning: { mode: 'off' } }
		});
	});

	it("sends the reader's current model and reasoning choice", async () => {
		createChatTransport({
			agentId: 'general',
			settings: { model: 'anthropic/claude-sonnet-4-6', reasoning: { mode: 'on' } }
		});

		expect((await wireBody()).settings).toEqual({
			model: 'anthropic/claude-sonnet-4-6',
			reasoning: { mode: 'on' }
		});
	});

	it('sends them on a regenerate too, which carries no message of its own', async () => {
		createChatTransport({ agentId: 'general', settings });

		// Settings that travelled with a new message left a regenerate with no
		// model named, and the server refused it.
		const body = await wireBody({ trigger: 'regenerate-message', messageId: 'message-1' });

		expect(body).toMatchObject({
			trigger: 'regenerate-message',
			messageId: 'message-1',
			settings: { model: 'openrouter/auto', reasoning: { mode: 'off' } }
		});
	});

	it('forwards the page context useAssistantInstructions contributed', async () => {
		createChatTransport({ agentId: 'general', settings });

		// `system` arrives inside assistant-ui's body from the runtime's model
		// context. Mastra adds it to the prompt rather than replacing the agent's
		// own instructions, which is why this one is kept where its neighbours are
		// dropped.
		const body = await wireBody({ body: { system: 'The user is viewing their meal log.' } });

		expect(body.system).toBe('The user is viewing their meal log.');
	});

	it('sends no system message when the page contributed none', async () => {
		createChatTransport({ agentId: 'general', settings });

		expect(await wireBody()).not.toHaveProperty('system');
	});
});
