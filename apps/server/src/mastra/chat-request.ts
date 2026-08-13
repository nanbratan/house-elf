/**
 * What a chat request may contain.
 *
 * An allowlist, not a denylist: `agent.stream()` accepts around two dozen
 * options a request has no business setting — `instructions`, `memory`,
 * `requestContext`, `providerOptions`, `toolsets` among them — and Mastra adds
 * to that set in minor releases. A denylist silently opens as the dependency
 * moves; this 400s and names the field.
 *
 * Adding a field here is how a capability becomes browser-driven: it is
 * validated, then mapped server-side, exactly as `thinking` becomes
 * `providerOptions.openrouter.reasoning.enabled`.
 *
 * `system` is allowed because Mastra treats it as additive — a page contributes
 * context through `useAssistantInstructions` without displacing what the agent
 * is. `instructions` overrides, which is why it is not here.
 */

import { chatSettingsSchema } from '@house-elf/shared';
import type { ChatStreamHandlerParams } from '@mastra/ai-sdk';
import { z } from 'zod';

/**
 * The message type Mastra's own stream params declare, reached through the
 * exported generic. @mastra/ai-sdk bundles private copies of the AI SDK's types
 * and exports none of them by name, and ai@7's `UIMessage` is not assignable to
 * either copy — they disagree down at `providerMetadata`. Naming it from the
 * params keeps this in step with the installed version by construction.
 */
type ChatMessage = ChatStreamHandlerParams['messages'][number];

/**
 * The envelope this route depends on, checked field by field.
 *
 * Loose because a message is content, not a request option: whatever the SDK
 * adds to a message next is for the model, and restating its part union would
 * be a second copy to keep correct. `agent.stream()` needs the parts
 * themselves — tool calls, files, reasoning — not a summary of them.
 */
const messageEnvelopeSchema = z.looseObject({
	id: z.string(),
	role: z.enum(['system', 'user', 'assistant']),
	parts: z.array(z.looseObject({ type: z.string() })),
	metadata: z.unknown().optional()
});

/**
 * The same envelope, carrying the type Mastra's params want.
 *
 * An intersection rather than a `.pipe`: `z.custom<T>` accepts `T` as its input
 * as well as its output, so it can only be a peer of the check, never
 * downstream of it. The schema above does the validating and reports its own
 * issue paths; `z.custom` only supplies the type, which is out of a schema's
 * reach because of the SDK's part union.
 */
const uiMessageSchema = z.intersection(messageEnvelopeSchema, z.custom<ChatMessage>());

export const chatRequestSchema = z.strictObject({
	/** Thread id. Named `id` because that is what the AI SDK transport sends. */
	id: z.string().optional(),
	messages: z.array(uiMessageSchema),
	trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
	/**
	 * Accepted but not forwarded: `ChatStreamHandlerParams` has no such
	 * parameter, and regeneration works because the client truncates `messages`.
	 * Refusing it would 400 every regenerate the AI SDK sends.
	 */
	messageId: z.string().optional(),
	/**
	 * UI-contributed context from `useAssistantInstructions`. Capped because it
	 * is the one free-text field the browser can grow without bound, and an
	 * unbounded system prompt is billed on every turn of the conversation.
	 */
	system: z.string().max(4000).optional(),
	settings: chatSettingsSchema
});

export type ChatRequest = Readonly<z.infer<typeof chatRequestSchema>>;

/**
 * The first issue, prefixed by its path when it has one. An allowlist is only
 * honest if what it turned away is visible the moment it does.
 */
export function describeRefusal(error: z.ZodError): string {
	const issue = error.issues[0];
	if (!issue) return 'Invalid request body.';

	const path = issue.path.join('.');
	return path ? `${path}: ${issue.message}` : issue.message;
}
