import { AuiIf, MessagePrimitive, ThreadPrimitive, groupPartByType } from '@assistant-ui/react';
import { useAISDKChat, useAISDKError } from '@assistant-ui/react-ai-sdk';

import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton
} from '../vendor/ai-elements/conversation';
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger } from '../assistant-ui/tool-group.tsx';
import { ErrorNotice } from './ErrorNotice.tsx';
import { MessageResponse } from './MessageResponse.tsx';
import {
	ReasoningContent,
	ReasoningRoot,
	ReasoningText,
	ReasoningTrigger
} from '../assistant-ui/reasoning.tsx';
import { ToolFallback } from '../assistant-ui/tool-fallback.tsx';

const groupParts = groupPartByType({ 'tool-call': ['group-tool'], reasoning: ['group-reasoning'] });

function UserMessage() {
	return (
		<MessagePrimitive.Root
			className="group ml-auto flex w-full max-w-[95%] flex-col justify-end gap-2"
			data-role="user"
		>
			{/*
			 * A user turn hugs its own text, right-aligned — `w-fit` is what `ml-auto`
			 * needs to have anything to push. An assistant turn stretches full width
			 * instead, so a tool card's own `w-full` has the whole column to fill.
			 */}
			<div className="ml-auto flex w-fit min-w-0 flex-col gap-2 overflow-hidden rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
				<MessagePrimitive.Parts components={{ Text: UserText }} />
			</div>
		</MessagePrimitive.Root>
	);
}

function UserText({ text }: { text: string }) {
	return <div className="wrap-break-word whitespace-pre-wrap">{text}</div>;
}

function AssistantMessage() {
	return (
		<MessagePrimitive.Root
			className="group flex w-full max-w-[95%] flex-col gap-2 text-sm text-foreground"
			data-role="assistant"
		>
			<MessagePrimitive.GroupedParts groupBy={groupParts}>
				{({ part, children }) => {
					switch (part.type) {
						case 'group-reasoning': {
							const isReasoning = part.status.type === 'running';
							return (
								<ReasoningRoot streaming={isReasoning} variant="ghost">
									<ReasoningTrigger active={isReasoning} />
									<ReasoningContent aria-busy={isReasoning}>
										<ReasoningText>{children}</ReasoningText>
									</ReasoningContent>
								</ReasoningRoot>
							);
						}
						case 'group-tool':
							return (
								<ToolGroupRoot variant="ghost">
									<ToolGroupTrigger
										active={part.status.type === 'running'}
										count={part.indices.length}
									/>
									<ToolGroupContent>{children}</ToolGroupContent>
								</ToolGroupRoot>
							);
						case 'text':
							return (
								<MessageResponse isAnimating={part.status.type === 'running'}>
									{part.text}
								</MessageResponse>
							);
						case 'reasoning':
							return (
								<MessageResponse isAnimating={part.status.type === 'running'}>
									{part.text}
								</MessageResponse>
							);
						case 'tool-call':
							return part.toolUI ?? <ToolFallback {...part} />;
						case 'indicator':
							return (
								<p className="inline-block shimmer text-muted-foreground shimmer-color-background shimmer-angle-0 shimmer-duration-2000 shimmer-spread-40">
									Waiting for a reply…
								</p>
							);
						default:
							return null;
					}
				}}
			</MessagePrimitive.GroupedParts>
		</MessagePrimitive.Root>
	);
}

/**
 * The conversation so far, read from the runtime `ChatView` provides.
 *
 * The scroll container is still ai-elements' `Conversation`; `ThreadPrimitive.Viewport`
 * replaces it in house-elf-r9z.11.
 */
export function Thread() {
	const chat = useAISDKChat();
	const error = useAISDKError();

	function retry() {
		void chat?.regenerate();
	}

	return (
		<Conversation className="min-h-0">
			<ConversationContent
				className="mx-auto flex w-full max-w-3xl gap-6 px-6 py-6"
				scrollClassName="transcript-scroll"
			>
				<AuiIf condition={(state) => state.thread.isEmpty}>
					<ConversationEmptyState>
						<p className="py-16 text-center text-sm text-faint">Ask anything.</p>
					</ConversationEmptyState>
				</AuiIf>

				<ThreadPrimitive.Messages>
					{({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
				</ThreadPrimitive.Messages>

				{error ? <ErrorNotice error={error} onRetry={retry} /> : null}
			</ConversationContent>
			<ConversationScrollButton aria-label="Jump to latest" />
		</Conversation>
	);
}
