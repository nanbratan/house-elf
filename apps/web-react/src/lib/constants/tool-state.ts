import type { DynamicToolUIPart, ToolUIPart } from 'ai';

/** Every state the AI SDK can put a tool call in. */
export type ToolState = (ToolUIPart | DynamicToolUIPart)['state'];

/**
 * The SDK's state strings, named once.
 *
 * `satisfies` is what earns this its keep: if the SDK renames or drops a state,
 * the value below stops being assignable and this file fails to compile, rather
 * than the app quietly comparing against a string nothing will ever equal again.
 * The reverse direction — a state the SDK *adds* — is caught by any exhaustive
 * `Record<ToolState, …>` built from it.
 */
export const toolState = {
	preparing: 'input-streaming',
	running: 'input-available',
	approvalRequested: 'approval-requested',
	approvalResponded: 'approval-responded',
	done: 'output-available',
	denied: 'output-denied',
	failed: 'output-error'
} as const satisfies Record<string, ToolState>;
