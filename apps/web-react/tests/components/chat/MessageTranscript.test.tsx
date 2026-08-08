import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorNotice } from '../../../src/lib/components/chat/ErrorNotice.tsx';
import { Message } from '../../../src/lib/components/chat/Message.tsx';
import { MessagePart } from '../../../src/lib/components/chat/MessagePart.tsx';
import { MessageTranscript } from '../../../src/lib/components/chat/MessageTranscript.tsx';
import { Shimmer } from '../../../src/lib/components/chat/Shimmer.tsx';

// Every child is tested at its own boundary; here each is a stub whose call
// history records what the transcript passed it. A stub that receives children
// must render them, or the transcript's own markup disappears from the test.
vi.mock('../../../src/lib/components/vendor/ai-elements/conversation.tsx', () => ({
	Conversation: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ConversationContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ConversationEmptyState: vi.fn(({ children }: { children?: ReactNode }) => (
		<div data-testid="empty-state">{children}</div>
	)),
	ConversationScrollButton: vi.fn(() => null)
}));

vi.mock('../../../src/lib/components/chat/Message.tsx', () => ({
	Message: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/chat/MessageContent.tsx', () => ({
	MessageContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/chat/MessagePart.tsx', () => ({
	MessagePart: vi.fn(() => <span data-testid="message-part" />)
}));

vi.mock('../../../src/lib/components/chat/ErrorNotice.tsx', () => ({
	ErrorNotice: vi.fn(() => <div data-testid="error-notice" />)
}));

vi.mock('../../../src/lib/components/chat/Shimmer.tsx', () => ({
	Shimmer: vi.fn(({ children }: { children?: ReactNode }) => <span>{children}</span>)
}));

const messageParts = () => vi.mocked(MessagePart).mock.calls.map(([props]) => props.part);
const messageProps = () => vi.mocked(Message).mock.calls.map(([props]) => props);
const errorNoticeProps = () => vi.mocked(ErrorNotice).mock.lastCall?.[0];
const shimmerTexts = () => vi.mocked(Shimmer).mock.calls.map(([props]) => props.children);

function renderTranscript(overrides: Partial<Parameters<typeof MessageTranscript>[0]> = {}) {
	return render(
		<MessageTranscript
			error={undefined}
			messages={[]}
			onRetry={vi.fn()}
			status="ready"
			{...overrides}
		/>
	);
}

describe('MessageTranscript', () => {
	it('offers an empty state when there is nothing to show', () => {
		renderTranscript();

		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
	});

	it('suppresses the empty state while a reply is in flight', () => {
		renderTranscript({ status: 'submitted' });

		expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
	});

	it('renders each message with its parts in order', () => {
		renderTranscript({
			messages: [
				{
					id: 'message-1',
					role: 'user',
					parts: [{ type: 'text', text: 'Hello' }]
				},
				{
					id: 'message-2',
					role: 'assistant',
					parts: [
						{ type: 'reasoning', text: 'Thinking…', state: 'done' },
						{ type: 'text', text: 'A reply' }
					]
				}
			]
		});

		expect(messageProps().map((props) => props.from)).toEqual(['user', 'assistant']);
		expect(messageParts().map((part) => part.type)).toEqual(['text', 'reasoning', 'text']);
	});

	it('shows a waiting indicator from send until the first visible content', () => {
		renderTranscript({ status: 'submitted' });
		expect(shimmerTexts()).toContain('Waiting for a reply…');
	});

	it('keeps the waiting indicator while a stream has no rendered parts yet', () => {
		// The status flips to streaming on the response stream's first chunk, which
		// is bookkeeping (start/step-start), not visible text — the gap the user
		// sees as a frozen UI.
		renderTranscript({
			status: 'streaming',
			messages: [
				{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
				{ id: 'message-2', role: 'assistant', parts: [] }
			]
		});

		expect(shimmerTexts()).toContain('Waiting for a reply…');
	});

	it('drops the waiting indicator once the assistant message has a part', () => {
		renderTranscript({
			status: 'streaming',
			messages: [
				{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
				{ id: 'message-2', role: 'assistant', parts: [{ type: 'text', text: 'Hi' }] }
			]
		});

		expect(shimmerTexts()).not.toContain('Waiting for a reply…');
	});

	it('renders no per-message role labels in a two-party conversation', () => {
		renderTranscript({
			messages: [
				{ id: 'message-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
				{ id: 'message-2', role: 'assistant', parts: [{ type: 'text', text: 'Hi' }] }
			]
		});

		expect(screen.queryByText('You')).not.toBeInTheDocument();
		expect(screen.queryByText('house-elf')).not.toBeInTheDocument();
	});

	it('passes errors to the error notice with the retry callback', () => {
		const onRetry = vi.fn();
		renderTranscript({ status: 'error', error: new Error('Broken stream'), onRetry });

		expect(errorNoticeProps()?.error.message).toBe('Broken stream');

		errorNoticeProps()?.onRetry();

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
