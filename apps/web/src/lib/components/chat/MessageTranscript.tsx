import type { ChatStatus, UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai';

import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton
} from '../vendor/ai-elements/conversation';
import { chatStatus } from '../../constants/chat-status.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { Message } from './Message.tsx';
import { MessageContent } from './MessageContent.tsx';
import { MessagePart } from './MessagePart.tsx';
import { Shimmer } from '../vendor/ai-elements/shimmer.tsx';

export interface MessageTranscriptProps {
	messages: UIMessage[];
	status: ChatStatus;
	error: Error | undefined;
	onRetry: () => void;
}

function messagePartKey(
	messageId: string,
	part: UIMessagePart<UIDataTypes, UITools>,
	occurrence: number
): string {
	if ('toolCallId' in part) {
		return `${messageId}:${part.type}:${part.toolCallId}`;
	}

	if (part.type === 'text' || part.type === 'reasoning') {
		return `${messageId}:${part.type}`;
	}

	return `${messageId}:${part.type}:${String(occurrence)}`;
}

export function MessageTranscript({ messages, status, error, onRetry }: MessageTranscriptProps) {
	const busy = status === chatStatus.submitted || status === chatStatus.streaming;
	const lastMessage = messages.at(-1);
	// The status leaves 'submitted' on the response stream's first chunk, which is
	// bookkeeping, not visible content — without this the indicator unmounts into a
	// dead gap between send and the first rendered part.
	const waiting = busy && (lastMessage === undefined || lastMessage.parts.length === 0);

	return (
		<Conversation className="min-h-0">
			<ConversationContent
				className="mx-auto flex w-full max-w-3xl gap-6 px-6 py-6"
				scrollClassName="transcript-scroll"
			>
				{messages.length === 0 && !busy && !error ? (
					<ConversationEmptyState>
						<p className="py-16 text-center text-sm text-faint">Ask anything.</p>
					</ConversationEmptyState>
				) : null}

				{messages.map((message) =>
					message.parts.length === 0 ? null : (
						<Message from={message.role} key={message.id}>
							<MessageContent>
								{message.parts.map((part, occurrence) => (
									<MessagePart key={messagePartKey(message.id, part, occurrence)} part={part} />
								))}
							</MessageContent>
						</Message>
					)
				)}

				{waiting ? (
					<Message from="assistant">
						<MessageContent className="text-muted-foreground">
							<Shimmer>Waiting for a reply…</Shimmer>
						</MessageContent>
					</Message>
				) : null}

				{error ? <ErrorNotice error={error} onRetry={onRetry} /> : null}
			</ConversationContent>
			<ConversationScrollButton aria-label="Jump to latest" />
		</Conversation>
	);
}
