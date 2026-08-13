import { useAISDKChat, useAISDKError } from '@assistant-ui/react-ai-sdk';

import { chatStatus } from '../../constants/chat-status.ts';
import { MessageTranscript } from './MessageTranscript.tsx';

/**
 * The conversation so far, read from the runtime `ChatView` provides.
 *
 * Transitional: `MessageTranscript` keeps the props it already had, which is
 * what made adopting the runtime additive. It goes when assistant-ui's own
 * `<Thread />` lands.
 */
export function ChatTranscript() {
	const chat = useAISDKChat();
	const error = useAISDKError();

	function retry() {
		void chat?.regenerate();
	}

	return (
		<MessageTranscript
			error={error}
			messages={chat?.messages ?? []}
			onRetry={retry}
			status={chat?.status ?? chatStatus.ready}
		/>
	);
}
