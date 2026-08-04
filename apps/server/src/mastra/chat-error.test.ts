import { describe, expect, it } from 'vitest';

import { chatErrorMessage, describeChatError } from './chat-error';

/**
 * Two separate claims here.
 *
 * Which message: asserted by identity against `chatErrorMessage`, so the test
 * pins the routing and not the wording. A regex would let a mis-route pass the
 * moment two messages happened to share a word.
 *
 * What it must never contain: asserted against literal strings, deliberately.
 * Comparing the output to a constant it was built from would prove nothing
 * about a leak.
 */

const anthropicAuthFailure = {
	name: 'AI_APICallError',
	message: 'invalid x-api-key',
	stack:
		'AI_APICallError: invalid x-api-key\n    at file:///Users/someone/project/node_modules/x.js',
	url: 'https://api.anthropic.com/v1/messages',
	statusCode: 401,
	isRetryable: false
};

/**
 * Verbatim from the server log of a real mid-stream failure: OpenRouter puts the
 * status in `code`, and the connection already returned 200, so there is no
 * `statusCode` anywhere for the categoriser to read.
 */
const openRouterMidStreamRateLimit = {
	message: 'Provider returned error',
	name: 'Error',
	code: 429,
	metadata: { error_type: 'rate_limit', provider_code: 'rate_limit_exceeded' }
};

describe('describeChatError', () => {
	it('leaks nothing from the error it was given', () => {
		const described = describeChatError(anthropicAuthFailure);

		expect(described).not.toContain('x-api-key');
		expect(described).not.toContain('node_modules');
		expect(described).not.toContain('file:///');
		expect(described).not.toContain('api.anthropic.com');
		expect(described).not.toContain('AI_APICallError');
	});

	it('says the credentials were rejected, so the fix is obvious', () => {
		expect(describeChatError(anthropicAuthFailure)).toBe(chatErrorMessage.credentials);
		expect(describeChatError({ statusCode: 403 })).toBe(chatErrorMessage.credentials);
	});

	it('distinguishes a rate limit, which is waited out rather than fixed', () => {
		expect(describeChatError({ statusCode: 429 })).toBe(chatErrorMessage.rateLimit);
	});

	it('categorises an error that arrives mid-stream, where the status is in `code`', () => {
		expect(describeChatError(openRouterMidStreamRateLimit)).toBe(chatErrorMessage.rateLimit);
	});

	it('distinguishes trouble at the provider from trouble in our request', () => {
		expect(describeChatError({ statusCode: 503 })).toBe(chatErrorMessage.providerFault);
		expect(describeChatError({ statusCode: 400 })).toBe(chatErrorMessage.requestRefused);
	});

	it('recognises a timeout, whatever the status', () => {
		expect(describeChatError({ name: 'TimeoutError' })).toBe(chatErrorMessage.timeout);
		expect(describeChatError({ name: 'AbortError' })).toBe(chatErrorMessage.timeout);
	});

	it('still answers for the things it has never seen', () => {
		for (const odd of [undefined, null, 'a string', 42, new Error('boom'), {}]) {
			expect(describeChatError(odd)).toBe(chatErrorMessage.unknown);
		}
	});

	it('keeps the categories worth having, by keeping them distinct', () => {
		const messages = Object.values(chatErrorMessage);

		expect(new Set(messages).size).toBe(messages.length);
	});
});
