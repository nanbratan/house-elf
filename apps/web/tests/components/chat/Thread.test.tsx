import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorNotice } from '../../../src/lib/components/chat/ErrorNotice.tsx';
import { MessageResponse } from '../../../src/lib/components/chat/MessageResponse.tsx';
import { Reasoning } from '../../../src/lib/components/vendor/ai-elements/reasoning.tsx';
import { Thread } from '../../../src/lib/components/chat/Thread.tsx';
import { ToolFallback } from '../../../src/lib/components/assistant-ui/tool-fallback.tsx';
import { ToolGroupTrigger } from '../../../src/lib/components/assistant-ui/tool-group.tsx';

// Thread takes no props — it reads the thread from the runtime. These two arrays are
// what the stubbed primitives replay, so a test states the runtime's contents by
// assigning to them.
let threadMessages: { role: string }[] = [];
let messageParts: Record<string, unknown>[] = [];
let threadIsEmpty = false;
const userPartText = 'What the user typed';

vi.mock('@assistant-ui/react', () => ({
	AuiIf: vi.fn(
		({
			condition,
			children
		}: {
			condition: (state: { thread: { isEmpty: boolean } }) => boolean;
			children?: ReactNode;
		}) => (condition({ thread: { isEmpty: threadIsEmpty } }) ? <div>{children}</div> : null)
	),
	groupPartByType: vi.fn(() => vi.fn()),
	MessagePrimitive: {
		Root: vi.fn(({ children, ...props }: { children?: ReactNode }) => (
			<div {...props}>{children}</div>
		)),
		// `components.Text` is a render-prop contract, not a plain child, so the stub
		// calls it. Stubbing it away instead would leave the user turn's only rendering
		// path — Thread's own `UserText` — unexecuted by any test.
		Parts: vi.fn(
			({ components }: { components?: { Text?: (p: { text: string }) => ReactNode } }) =>
				components?.Text ? components.Text({ text: userPartText }) : null
		),
		// The real primitive walks the message's parts and calls `children` once per
		// group node, leaf part and indicator slot. The stub replays `messageParts`
		// through that same channel so the switch under test sees each shape.
		GroupedParts: vi.fn(
			({ children }: { children: (info: { part: unknown; children: ReactNode }) => ReactNode }) =>
				messageParts.map((part, index) => (
					<Fragment key={index}>
						{children({ part, children: <span data-testid="group-children" /> })}
					</Fragment>
				))
		)
	},
	ThreadPrimitive: {
		Messages: vi.fn(({ children }: { children: (value: { message: unknown }) => ReactNode }) =>
			threadMessages.map((message, index) => (
				<Fragment key={index}>{children({ message })}</Fragment>
			))
		)
	}
}));

const regenerate = vi.fn();
const error = vi.fn(() => undefined as Error | undefined);

vi.mock('@assistant-ui/react-ai-sdk', () => ({
	useAISDKChat: vi.fn(() => ({ regenerate })),
	useAISDKError: vi.fn(() => error())
}));

// Every child is tested at its own boundary; here each is a stub whose call history
// records what Thread passed it. A stub receiving children must render them, or
// Thread's own markup disappears from the test.
vi.mock('../../../src/lib/components/vendor/ai-elements/conversation.tsx', () => ({
	Conversation: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ConversationContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ConversationEmptyState: vi.fn(({ children }: { children?: ReactNode }) => (
		<div data-testid="empty-state">{children}</div>
	)),
	ConversationScrollButton: vi.fn(() => null)
}));

vi.mock('../../../src/lib/components/assistant-ui/tool-group.tsx', () => ({
	ToolGroupRoot: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ToolGroupTrigger: vi.fn(() => <span data-testid="tool-group-trigger" />),
	ToolGroupContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/assistant-ui/tool-fallback.tsx', () => ({
	ToolFallback: vi.fn(() => <span data-testid="tool-fallback" />)
}));

vi.mock('../../../src/lib/components/chat/MessageResponse.tsx', () => ({
	MessageResponse: vi.fn(() => <span data-testid="message-response" />)
}));

vi.mock('../../../src/lib/components/vendor/ai-elements/reasoning.tsx', () => ({
	Reasoning: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ReasoningTrigger: vi.fn(() => null),
	ReasoningContent: vi.fn(({ children }: { children?: ReactNode }) => <span>{children}</span>)
}));

vi.mock('../../../src/lib/components/chat/ErrorNotice.tsx', () => ({
	ErrorNotice: vi.fn(() => <div data-testid="error-notice" />)
}));

const responseProps = () => vi.mocked(MessageResponse).mock.lastCall?.[0];
const reasoningProps = () => vi.mocked(Reasoning).mock.lastCall?.[0];
const toolGroupProps = () => vi.mocked(ToolGroupTrigger).mock.lastCall?.[0];
const errorNoticeProps = () => vi.mocked(ErrorNotice).mock.lastCall?.[0];

describe('Thread', () => {
	beforeEach(() => {
		threadMessages = [];
		messageParts = [];
		threadIsEmpty = false;
		error.mockReturnValue(undefined);
	});

	it('offers an empty state when the thread has nothing in it', () => {
		threadIsEmpty = true;

		render(<Thread />);

		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
	});

	it('withholds the empty state once the thread has a message', () => {
		threadIsEmpty = false;
		threadMessages = [{ role: 'user' }];

		render(<Thread />);

		expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
	});

	// Presence alone would not pin this down: both components hardcode their own
	// data-role, so swapping the two branches still yields one node of each. Only the
	// order proves each message reached the component for ITS role.
	it('marks each turn with its role, which the e2e suite locates turns by', () => {
		threadMessages = [{ role: 'user' }, { role: 'assistant' }];

		const { container } = render(<Thread />);

		const roles = [...container.querySelectorAll('[data-role]')].map((turn) =>
			turn.getAttribute('data-role')
		);

		expect(roles).toEqual(['user', 'assistant']);
	});

	it('renders the user’s own text in the user turn', () => {
		threadMessages = [{ role: 'user' }];

		render(<Thread />);

		expect(screen.getByText(userPartText)).toBeInTheDocument();
	});

	it('collapses a run of tool calls under one group, counted and marked running', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'group-tool', status: { type: 'running' }, indices: [0, 1, 2] }];

		render(<Thread />);

		expect(toolGroupProps()?.count).toBe(3);
		expect(toolGroupProps()?.active).toBe(true);
		expect(screen.getByTestId('group-children')).toBeInTheDocument();
	});

	it('renders a streaming text part as an animating response', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'text', text: 'A reply', status: { type: 'running' } }];

		render(<Thread />);

		expect(responseProps()?.children).toBe('A reply');
		expect(responseProps()?.isAnimating).toBe(true);
	});

	it('stops animating a text part once it is complete', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'text', text: 'A reply', status: { type: 'complete' } }];

		render(<Thread />);

		expect(responseProps()?.isAnimating).toBe(false);
	});

	it('renders a reasoning part through the reasoning disclosure', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'reasoning', text: 'Thinking…', status: { type: 'running' } }];

		render(<Thread />);

		expect(reasoningProps()?.isStreaming).toBe(true);
		expect(screen.getByText('Thinking…')).toBeInTheDocument();
	});

	it('falls back to the generic tool card when a tool ships no UI of its own', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'tool-call', toolUI: undefined }];

		render(<Thread />);

		expect(screen.getByTestId('tool-fallback')).toBeInTheDocument();
	});

	it("prefers a tool's own UI over the fallback", () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'tool-call', toolUI: <span data-testid="tool-ui" /> }];

		render(<Thread />);

		expect(screen.getByTestId('tool-ui')).toBeInTheDocument();
		expect(screen.queryByTestId('tool-fallback')).not.toBeInTheDocument();
		expect(vi.mocked(ToolFallback)).not.toHaveBeenCalled();
	});

	// The runtime holds this slot open from send until the first visible content,
	// which is the gap the user would otherwise see as a frozen UI.
	it('shows a waiting indicator in the runtime’s indicator slot', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'indicator' }];

		render(<Thread />);

		expect(screen.getByText('Waiting for a reply…')).toBeInTheDocument();
	});

	it('passes a failed turn to the error notice with a retry that regenerates it', () => {
		error.mockReturnValue(new Error('Broken stream'));

		render(<Thread />);

		expect(errorNoticeProps()?.error.message).toBe('Broken stream');

		errorNoticeProps()?.onRetry();

		expect(regenerate).toHaveBeenCalledOnce();
	});
});
