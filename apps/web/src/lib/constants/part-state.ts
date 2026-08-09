import type { ReasoningUIPart, TextUIPart } from 'ai';

/** The streaming lifecycle shared by the SDK's text and reasoning parts. */
export type PartStreamState = NonNullable<(TextUIPart | ReasoningUIPart)['state']>;

/**
 * The SDK's part state strings, named once.
 *
 * `satisfies` is what earns this its keep: if the SDK renames or drops a state,
 * the value below stops being assignable and this file fails to compile, rather
 * than the app quietly comparing against a string nothing will ever equal again.
 */
export const partState = {
	streaming: 'streaming',
	done: 'done'
} as const satisfies Record<string, PartStreamState>;
