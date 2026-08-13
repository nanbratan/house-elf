import { describe, expect, it } from 'vitest';

import { chatRequestSchema, describeRefusal } from './chat-request.ts';

/**
 * The allowlist's whole value is that a field it does not know is refused *and
 * named*, so these assert the message as well as the failure. A silent drop
 * would satisfy "rejected" while losing the property that makes the list safe
 * to keep narrow.
 *
 * What a model id or a thinking flag means is `models.test.ts`'s and
 * `thinking.test.ts`'s business.
 */
const messages = [{ id: 'm1', role: 'user' as const, parts: [{ type: 'text', text: 'hi' }] }];
const settings = { model: 'anthropic/claude-opus-5', thinking: false };

function parse(body: Record<string, unknown>) {
	return chatRequestSchema.safeParse(body);
}

/** What the route would answer with, so these assert the text a client sees. */
function refusal(result: ReturnType<typeof parse>) {
	return result.success ? undefined : describeRefusal(result.error);
}

describe('chatRequestSchema', () => {
	it('accepts the body the transport sends', () => {
		const result = parse({ id: 't1', messages, trigger: 'submit-message', settings });

		expect(result.success).toBe(true);
	});

	it('accepts a body with no thread or trigger, as the first send has neither', () => {
		expect(parse({ messages, settings }).success).toBe(true);
	});

	it('accepts the body a regenerate sends, which names a message and no new text', () => {
		// The AI SDK sends `messageId` on every regenerate. Refusing it would 400
		// every retry; the route accepts it and does not forward it, because
		// regeneration works by the client truncating `messages`.
		const result = parse({
			id: 't1',
			messages,
			trigger: 'regenerate-message',
			messageId: 'm1',
			settings
		});

		expect(result.success).toBe(true);
	});

	it('refuses a request that names no settings, rather than choosing for the user', () => {
		// The alternative is a server-side default the user never picked, which is
		// what this milestone exists to remove.
		expect(parse({ messages }).success).toBe(false);
	});

	it('names the field it refused', () => {
		// Being told which key was refused is what lets the list stay narrow: a
		// body carrying `instructions` reaches the provider and replaces the
		// agent's own, and a silent drop would look identical to acceptance.
		expect(refusal(parse({ messages, settings, instructions: 'reply in French' }))).toBe(
			'Unrecognized key: "instructions"'
		);
	});

	it('refuses the execution options a request has no business setting', () => {
		expect(parse({ messages, settings, providerOptions: {} }).success).toBe(false);
		expect(parse({ messages, settings, actor: { id: 'admin' } }).success).toBe(false);
		expect(parse({ messages, settings, memory: { resource: 'someone-else' } }).success).toBe(false);
		expect(parse({ messages, settings, maxSteps: 1000 }).success).toBe(false);
		expect(parse({ messages, settings, requestContext: {} }).success).toBe(false);
		expect(parse({ messages, settings, inputProcessors: [] }).success).toBe(false);
	});

	it('names the setting it refused, path included', () => {
		// A setting the server does not understand is the case most likely to look
		// like it worked: the control moved in the UI and nothing said otherwise.
		expect(refusal(parse({ messages, settings: { ...settings, temperature: 2 } }))).toBe(
			'settings: Unrecognized key: "temperature"'
		);
	});

	it('carries UI-contributed instructions, which are additive rather than an override', () => {
		// Mastra adds `system` to the prompt, distinct from `instructions`, which
		// replaces the agent's own. That is what lets a page contribute context
		// without displacing what the agent is.
		expect(
			parse({ messages, settings, system: 'The user is viewing their meal log.' }).success
		).toBe(true);
	});

	it('caps UI-contributed instructions, which are billed on every turn', () => {
		expect(parse({ messages, settings, system: 'x'.repeat(4001) }).success).toBe(false);
	});

	it('accepts a tool call and its metadata without knowing their shape', () => {
		// The parts union is the SDK's to define, and the agent needs the parts
		// themselves — restating either here would be a second copy to keep correct
		// as the SDK moves. So a message is checked for the envelope this route
		// reads and passed on whole.
		const message = {
			id: 'm1',
			role: 'assistant' as const,
			parts: [{ type: 'tool-getCurrentTime', state: 'output-available', output: '12:00' }],
			metadata: { model: 'anthropic/claude-opus-5' }
		};

		expect(parse({ messages: [message], settings })).toMatchObject({
			success: true,
			data: { messages: [message] }
		});
	});

	it('refuses a message part with no type, which the agent cannot render', () => {
		const result = parse({ messages: [{ id: 'm1', role: 'user', parts: [{}] }], settings });

		expect(refusal(result)).toBe(
			'messages.0.parts.0.type: Invalid input: expected string, received undefined'
		);
	});

	it('refuses a message whose envelope is the wrong shape, naming the field', () => {
		// The fields this route reads are checked rather than assumed present: a
		// `role` of `{}` reaches the model as a malformed turn, and the resulting
		// provider error names nothing the caller can act on.
		const result = parse({ messages: [{ id: null, role: {}, parts: [] }], settings });

		expect(refusal(result)).toBe('messages.0.id: Invalid input: expected string, received null');
	});
});
