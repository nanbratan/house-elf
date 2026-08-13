import type { ChatSettings } from '@house-elf/shared';
import { AssistantChatTransport } from '@assistant-ui/react-ai-sdk';

export interface ChatTransportOptions {
	agentId: string;
	settings: ChatSettings;
}

/**
 * Where a conversation sends, and what it sends with it.
 *
 * Returning a body from `prepareSendMessagesRequest` replaces the transport's
 * own, which would otherwise carry assistant-ui's `callSettings`, `config` and
 * `tools`. The server refuses fields it does not know, so this is the client
 * half of that agreement rather than a second, weaker guard.
 *
 * It runs on a regenerate as much as on a first ask, which is what fixes
 * settings that only ever rode along with a new message.
 *
 * `settings` is forwarded whole and never read field by field: it is the one
 * object meant to widen as the composer gains controls.
 */
export function createChatTransport({ agentId, settings }: ChatTransportOptions) {
	return new AssistantChatTransport({
		api: `/api/chat/${agentId}`,
		prepareSendMessagesRequest: ({ id, messages, trigger, messageId, body }) => ({
			body: {
				id,
				messages,
				trigger,
				messageId,
				// What `useAssistantInstructions` contributed, if anything. Mastra
				// adds this to the prompt rather than replacing the agent's own.
				...(typeof body?.system === 'string' && { system: body.system }),
				settings
			}
		})
	});
}
