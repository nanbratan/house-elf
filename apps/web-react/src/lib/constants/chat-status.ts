import type { ChatStatus } from 'ai';

/**
 * The SDK's chat status strings, named once.
 *
 * `satisfies` is what earns this its keep: if the SDK renames or drops a status,
 * the value below stops being assignable and this file fails to compile, rather
 * than the app quietly comparing against a string nothing will ever equal again.
 */
export const chatStatus = {
	submitted: 'submitted',
	streaming: 'streaming',
	ready: 'ready',
	error: 'error'
} as const satisfies Record<string, ChatStatus>;
