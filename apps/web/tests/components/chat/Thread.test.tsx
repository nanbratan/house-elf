import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorState } from '../../../src/lib/components/elements/error-state.tsx';
import {
	ReasoningRoot,
	ReasoningTrigger
} from '../../../src/lib/components/assistant-ui/reasoning.tsx';
import { Thread } from '../../../src/lib/components/chat/Thread.tsx';
import { ToolFallback } from '../../../src/lib/components/assistant-ui/tool-fallback.tsx';
import { ThinkingIndicator } from '../../../src/lib/components/elements/thinking-indicator.tsx';
import { ToolGroupTrigger } from '../../../src/lib/components/assistant-ui/tool-group.tsx';

// Thread's only prop is the composer element; the conversation itself comes from the
// runtime. These are what the stubbed primitives and hooks replay, so a test states
// the runtime's contents by assigning to them.
let threadMessages: { role: string }[] = [];
let messageParts: Record<string, unknown>[] = [];
/*
 * The jump button reads the viewport's scroll geometry off the element itself,
 * which jsdom never lays out — so the numbers are stubbed here and the tests
 * dispatch the scroll events a reader or autoscroll would.
 */
let viewportElement: HTMLDivElement | null = null;

function scrollViewportTo({ from, height }: { from: number; height: number }) {
	const element = viewportElement;
	if (!element) throw new Error('no viewport element registered');
	Object.defineProperty(element, 'scrollHeight', { value: height, configurable: true });
	Object.defineProperty(element, 'clientHeight', { value: 500, configurable: true });
	Object.defineProperty(element, 'scrollTop', { value: height - 500 - from, configurable: true });
	return element;
}
const userPartText = 'What the user typed';

vi.mock('@assistant-ui/react', () => ({
	useThreadViewport: vi.fn(
		(select: (state: { element: { viewport: HTMLDivElement | null } }) => unknown) =>
			select({ element: { viewport: viewportElement } })
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
		),
		// The real ones render a single div each and carry the props through; the
		// scrolling and height-measuring they add is the package's own business.
		Viewport: vi.fn(({ children, ...props }: { children?: ReactNode }) => (
			<div {...props}>{children}</div>
		)),
		ViewportFooter: vi.fn(({ children, ...props }: { children?: ReactNode }) => (
			<div data-testid="viewport-footer" {...props}>
				{children}
			</div>
		)),
		ScrollToBottom: vi.fn(({ children, ...props }: { children?: ReactNode }) => (
			<button type="button" {...props}>
				{children}
			</button>
		))
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
vi.mock('../../../src/lib/components/assistant-ui/tool-group.tsx', () => ({
	ToolGroupRoot: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ToolGroupTrigger: vi.fn(() => <span data-testid="tool-group-trigger" />),
	ToolGroupContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/assistant-ui/tool-fallback.tsx', () => ({
	ToolFallback: vi.fn(() => <span data-testid="tool-fallback" />)
}));

vi.mock('../../../src/lib/components/chat/MarkdownText.tsx', () => ({
	MarkdownText: vi.fn(() => <span data-testid="markdown-text" />)
}));

vi.mock('../../../src/lib/components/assistant-ui/reasoning.tsx', () => ({
	ReasoningRoot: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ReasoningTrigger: vi.fn(() => <span data-testid="reasoning-trigger" />),
	ReasoningContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ReasoningText: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/elements/error-state.tsx', () => ({
	ErrorState: vi.fn(() => <div data-testid="error-state" />)
}));

vi.mock('../../../src/lib/components/elements/thinking-indicator.tsx', () => ({
	ThinkingIndicator: vi.fn(() => <span data-testid="thinking-indicator" />)
}));

const reasoningRootProps = () => vi.mocked(ReasoningRoot).mock.lastCall?.[0];
const reasoningTriggerProps = () => vi.mocked(ReasoningTrigger).mock.lastCall?.[0];
const toolGroupProps = () => vi.mocked(ToolGroupTrigger).mock.lastCall?.[0];
const errorStateProps = () => vi.mocked(ErrorState).mock.lastCall?.[0];
const thinkingIndicatorProps = () => vi.mocked(ThinkingIndicator).mock.lastCall?.[0];

const composer = <div data-testid="composer" />;

describe('Thread', () => {
	beforeEach(() => {
		threadMessages = [];
		messageParts = [];
		viewportElement = document.createElement('div');
		error.mockReturnValue(undefined);
	});

	// The composer has to be a descendant of the viewport: `ViewportFooter` throws
	// outside one, and the footer's measured height is what keeps autoscroll from
	// hiding the last message behind the composer.
	it('renders the composer it was given inside the viewport footer', () => {
		render(<Thread composer={composer} />);

		expect(
			within(screen.getByTestId('viewport-footer')).getByTestId('composer')
		).toBeInTheDocument();
	});

	// The e2e suite reads the scroll position off this class, and assistant-ui puts
	// the scroll listener on the viewport div itself — so the class has to be there
	// and not on some wrapper.
	it('announces the transcript as a log and marks it with the class e2e scrolls by', () => {
		render(<Thread composer={composer} />);

		expect(screen.getByRole('log')).toHaveClass('transcript-scroll');
	});

	// `ThreadPrimitive.ScrollToBottom` only disables itself at the bottom; the e2e
	// suite asserts the button is absent, so Thread has to unmount it.
	it('withholds the jump button while the transcript is already at its end', () => {
		render(<Thread composer={composer} />);

		fireEvent.scroll(scrollViewportTo({ from: 0, height: 2000 }));

		expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
	});

	it('offers a jump button once the reader has scrolled away from the end', () => {
		render(<Thread composer={composer} />);

		fireEvent.scroll(scrollViewportTo({ from: 400, height: 2000 }));

		expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
	});

	it('takes the jump button back once the reader returns to the end', () => {
		render(<Thread composer={composer} />);
		fireEvent.scroll(scrollViewportTo({ from: 400, height: 2000 }));

		fireEvent.scroll(scrollViewportTo({ from: 0, height: 2000 }));

		expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
	});

	it('does not offer it because a reply grew under a reader who is at the end', () => {
		// The transcript getting taller is not the reader going anywhere. It raises
		// `scrollHeight` a frame before autoscroll raises `scrollTop`, and reading
		// that gap is what made the button blink once per streamed chunk. Growing
		// fires no scroll event, so nothing here should notice it.
		const { rerender } = render(<Thread composer={composer} />);
		fireEvent.scroll(scrollViewportTo({ from: 0, height: 2000 }));

		// Re-rendered as well as taller, which is what a chunk of a reply does.
		scrollViewportTo({ from: 120, height: 2120 });
		rerender(<Thread composer={composer} />);

		expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
	});

	// Presence alone would not pin this down: both components hardcode their own
	// data-role, so swapping the two branches still yields one node of each. Only the
	// order proves each message reached the component for ITS role.
	it('marks each turn with its role, which the e2e suite locates turns by', () => {
		threadMessages = [{ role: 'user' }, { role: 'assistant' }];

		const { container } = render(<Thread composer={composer} />);

		const roles = [...container.querySelectorAll('[data-role]')].map((turn) =>
			turn.getAttribute('data-role')
		);

		expect(roles).toEqual(['user', 'assistant']);
	});

	it('renders the user’s own text in the user turn', () => {
		threadMessages = [{ role: 'user' }];

		render(<Thread composer={composer} />);

		expect(screen.getByText(userPartText)).toBeInTheDocument();
	});

	it('collapses a run of tool calls under one group, counted and marked running', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'group-tool', status: { type: 'running' }, indices: [0, 1, 2] }];

		render(<Thread composer={composer} />);

		expect(toolGroupProps()?.count).toBe(3);
		expect(toolGroupProps()?.active).toBe(true);
		expect(screen.getByTestId('group-children')).toBeInTheDocument();
	});

	// The renderer takes the text and its streaming status from the runtime's part
	// context, not from Thread — so all Thread decides is that a text part is markdown.
	it('renders a text part as markdown', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'text', text: 'A reply', status: { type: 'running' } }];

		render(<Thread composer={composer} />);

		expect(screen.getByTestId('markdown-text')).toBeInTheDocument();
	});

	it('collapses a run of reasoning parts under one disclosure, marked streaming', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'group-reasoning', status: { type: 'running' }, indices: [0, 1] }];

		render(<Thread composer={composer} />);

		expect(reasoningRootProps()?.streaming).toBe(true);
		expect(reasoningTriggerProps()?.active).toBe(true);
		expect(screen.getByTestId('group-children')).toBeInTheDocument();
	});

	it('settles the reasoning disclosure once the group is no longer running', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'group-reasoning', status: { type: 'complete' }, indices: [0] }];

		render(<Thread composer={composer} />);

		expect(reasoningRootProps()?.streaming).toBe(false);
		expect(reasoningTriggerProps()?.active).toBe(false);
	});

	// Reasoning text is markdown from the same model as the reply, so it goes through the
	// same renderer; the disclosure around it is the group's job, not the part's.
	it('renders a reasoning part as markdown inside the group', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'reasoning', text: 'Weighing it up', status: { type: 'running' } }];

		render(<Thread composer={composer} />);

		expect(screen.getByTestId('markdown-text')).toBeInTheDocument();
	});

	it('falls back to the generic tool card when a tool ships no UI of its own', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'tool-call', toolUI: undefined }];

		render(<Thread composer={composer} />);

		expect(screen.getByTestId('tool-fallback')).toBeInTheDocument();
	});

	it("prefers a tool's own UI over the fallback", () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'tool-call', toolUI: <span data-testid="tool-ui" /> }];

		render(<Thread composer={composer} />);

		expect(screen.getByTestId('tool-ui')).toBeInTheDocument();
		expect(screen.queryByTestId('tool-fallback')).not.toBeInTheDocument();
		expect(vi.mocked(ToolFallback)).not.toHaveBeenCalled();
	});

	// The runtime holds this slot open from send until the first visible content,
	// which is the gap the user would otherwise see as a frozen UI.
	it('shows a waiting indicator in the runtime’s indicator slot', () => {
		threadMessages = [{ role: 'assistant' }];
		messageParts = [{ type: 'indicator' }];

		render(<Thread composer={composer} />);

		expect(thinkingIndicatorProps()?.label).toBe('Waiting for a reply…');
	});

	it('passes a failed turn to the error state with a retry that regenerates it', () => {
		error.mockReturnValue(new Error('Broken stream'));

		render(<Thread composer={composer} />);

		expect(errorStateProps()?.title).toBe('That reply did not arrive.');
		expect(errorStateProps()?.detail).toBe('Broken stream');

		errorStateProps()?.onRetry();

		expect(regenerate).toHaveBeenCalledOnce();
	});
});
