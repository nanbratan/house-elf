/**
 * What the browser is told when generation fails.
 *
 * The default serializer streams the provider's error object to the client,
 * stack trace and all — absolute file paths, internal module names, the upstream
 * URL. That is unreadable for the person waiting for an answer and, once this is
 * on the internet in M6, it is information they should not have.
 *
 * So the client gets a sentence and nothing else. Everything useful for
 * debugging stays in the server log.
 */

/**
 * Every sentence the client can be shown.
 *
 * Named so tests can assert which one was chosen rather than pattern-match the
 * wording — two messages could easily share a word and hide a mis-route.
 */
export const chatErrorMessage = {
	timeout: 'The model took too long to respond. Try again.',
	credentials:
		'The model provider rejected our credentials. Check the API key in the server environment.',
	rateLimit: 'The model provider is rate limiting us. Wait a moment and try again.',
	providerFault: 'The model provider is having trouble. Try again shortly.',
	requestRefused: 'The model provider refused the request. The server log has the details.',
	unknown: 'Something went wrong while generating the reply. The server log has the details.'
} as const;

/**
 * Shape we can read off a provider error without depending on its class.
 *
 * An error raised mid-stream carries its status as `code`: the HTTP response
 * already returned 200, so `statusCode` is not there to read. Reading both here
 * means every category below applies to mid-stream failures too.
 */
function statusOf(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const { statusCode, code } = error as { statusCode?: unknown; code?: unknown };
	if (typeof statusCode === 'number') return statusCode;
	return typeof code === 'number' ? code : undefined;
}

function nameOf(error: unknown): string {
	if (typeof error !== 'object' || error === null) return '';
	const name = (error as { name?: unknown }).name;
	return typeof name === 'string' ? name : '';
}

/**
 * A short, safe explanation of why a reply did not arrive.
 *
 * Categorised rather than generic: waiting out a rate limit and fixing a
 * rejected key are different actions, and a single "something went wrong"
 * cannot tell you which one you are in.
 */
export function describeChatError(error: unknown): string {
	const name = nameOf(error);

	if (name === 'AbortError' || name === 'TimeoutError') {
		return chatErrorMessage.timeout;
	}

	const status = statusOf(error);

	if (status === 401 || status === 403) {
		return chatErrorMessage.credentials;
	}
	if (status === 429) {
		return chatErrorMessage.rateLimit;
	}
	if (status !== undefined && status >= 500) {
		return chatErrorMessage.providerFault;
	}
	if (status !== undefined && status >= 400) {
		return chatErrorMessage.requestRefused;
	}

	return chatErrorMessage.unknown;
}
