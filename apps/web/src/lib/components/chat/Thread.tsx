import type { ReactNode } from 'react';
import {
	MessagePrimitive,
	ThreadPrimitive,
	groupPartByType,
	useThreadViewport
} from '@assistant-ui/react';
import { useAISDKChat, useAISDKError } from '@assistant-ui/react-ai-sdk';
import { ArrowDownIcon } from 'lucide-react';

import { buttonVariants } from '../ui/button.tsx';
import { cn } from '../../utils/cn.ts';
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger } from '../assistant-ui/tool-group.tsx';
import { ErrorNotice } from './ErrorNotice.tsx';
import { MarkdownText } from './MarkdownText.tsx';
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
			// `data-aui-top-anchor-user` marks the turn the viewport pins to its top edge,
			// which would otherwise sit flush under the header. The gap has to be padding
			// rather than margin or `scroll-mt`: the anchor scrolls to a computed
			// `scrollTop` of the element's border-box top, so only padding inside that box
			// is still on screen afterwards. Matches the list's own `pt-4`, so an anchored
			// turn sits exactly where the first message of a thread does — assistant-ui
			// withholds the attribute from that first message, which the list already spaces.
			className="group ml-auto flex w-full max-w-[95%] flex-col justify-end gap-2 data-[aui-top-anchor-user]:pt-4"
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
						// Reasoning is markdown from the same model as the reply, so it renders
						// through the same component; the disclosure around it is the group's job.
						case 'text':
						case 'reasoning':
							return <MarkdownText isStreaming={part.status.type === 'running'} />;
						case 'tool-call':
							return part.toolUI ?? <ToolFallback {...part} />;
						case 'indicator':
							return (
								<p className="inline-block shimmer text-muted-foreground">Waiting for a reply…</p>
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
 * `ThreadPrimitive.ScrollToBottom` is built by `createActionButton`, which always
 * renders a `<button>` and merely disables it once there is nowhere to scroll. The
 * affordance has to leave the DOM instead, so this reads the viewport itself.
 */
function ScrollToBottom() {
	const isAtBottom = useThreadViewport((viewport) => viewport.isAtBottom);

	return isAtBottom ? null : (
		<ThreadPrimitive.ScrollToBottom
			aria-label="Jump to latest"
			className={cn(
				buttonVariants({ size: 'icon', variant: 'outline' }),
				// Positioned against the sticky footer rather than the scrolled content,
				// so it sits just above the composer and travels with it.
				'absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full shadow-sm',
				// `outline` is `bg-input/30` in dark mode — the transcript reads straight
				// through it, and this button's whole job is to sit on top of the transcript.
				'bg-background dark:bg-background dark:hover:bg-muted'
			)}
		>
			<ArrowDownIcon className="size-4" />
		</ThreadPrimitive.ScrollToBottom>
	);
}

export interface ThreadProps {
	/**
	 * The composer, built by `ChatView` because the model choice it needs also feeds
	 * the transport. It renders inside the viewport, which is where `ViewportFooter`
	 * has to live for autoscroll to account for its height.
	 */
	composer: ReactNode;
}

/**
 * The conversation so far, read from the runtime `ChatView` provides.
 */
export function Thread({ composer }: ThreadProps) {
	const chat = useAISDKChat();
	const error = useAISDKError();

	function retry() {
		void chat?.regenerate();
	}

	return (
		<ThreadPrimitive.Viewport
			// `transcript-scroll` matches no CSS rule: it is how tests/e2e/chat-stream.spec.ts
			// gets hold of the scrolling element, which is this div.
			//
			// Emptiness is read off the rendered turns rather than `thread.isEmpty`,
			// which is false for the first ~130ms after mount and only then flips. Driving
			// the layout from it made the composer paint at the bottom and visibly jump to
			// the middle; `:has()` is evaluated at every paint, so the first one is right.
			// While empty, `pb-header` shortens the box being centred within by exactly the
			// header above it, which puts the composer on the middle of the screen rather
			// than the middle of the scroller — the two differ by half the header.
			className="transcript-scroll flex h-full min-h-0 flex-col overflow-y-auto not-has-[[data-role]]:justify-center not-has-[[data-role]]:pb-header"
			role="log"
			// `autoScroll` is explicit because `turnAnchor="top"` defaults it off. With
			// both, the reserve element assistant-ui sizes below the reply supplies the
			// scroll slack, so the user's turn stays pinned to the top of the viewport
			// AND the end of the growing reply stays in view. Measured, not assumed:
			// without `autoScroll` two of the chat-stream autoscroll specs fail.
			autoScroll
			turnAnchor="top"
		>
			{/*
			 * While empty this collapses to nothing and stops growing: an empty list still
			 * has height if it keeps its padding, and it sits above the composer, so it
			 * would push the composer below the centre it is supposed to be on.
			 */}
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-4 pb-6 not-has-[[data-role]]:py-0 has-[[data-role]]:flex-1">
				<ThreadPrimitive.Messages>
					{({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
				</ThreadPrimitive.Messages>

				{error ? <ErrorNotice error={error} onRetry={retry} /> : null}
			</div>

			{/*
			 * Inside the viewport, because that is the only place `ViewportFooter` can
			 * measure its height and register it as a content inset — which is what stops
			 * autoscroll leaving the last line behind the composer. Opaque, so the
			 * transcript scrolling underneath is hidden rather than showing through.
			 */}
			<ThreadPrimitive.ViewportFooter className="sticky bottom-0 bg-background pt-2">
				<div className="relative">
					<ScrollToBottom />
					{composer}
				</div>
			</ThreadPrimitive.ViewportFooter>
		</ThreadPrimitive.Viewport>
	);
}
