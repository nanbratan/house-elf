import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MessagePart } from '../../../src/lib/components/chat/MessagePart.tsx';
import { MessageResponse } from '../../../src/lib/components/chat/MessageResponse.tsx';
import {
	Reasoning,
	ReasoningContent
} from '../../../src/lib/components/vendor/ai-elements/reasoning.tsx';
import {
	ToolHeader,
	ToolInput,
	ToolOutput
} from '../../../src/lib/components/vendor/ai-elements/tool.tsx';

// The renderer and the vendor Tool/Reasoning families are tested at their own
// boundaries; here they are stubs whose call history records what MessagePart
// handed them. Stubs that receive children must render them, or MessagePart's
// own composition (nesting ToolInput/ToolOutput inside ToolContent inside
// Tool) disappears from the test.
vi.mock('../../../src/lib/components/chat/MessageResponse.tsx', () => ({
	MessageResponse: vi.fn(({ children }: { children?: ReactNode }) => (
		<div data-testid="message-response">{children}</div>
	))
}));

vi.mock('../../../src/lib/components/vendor/ai-elements/reasoning.tsx', () => ({
	Reasoning: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ReasoningTrigger: vi.fn(() => <div data-testid="reasoning-trigger" />),
	ReasoningContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../src/lib/components/vendor/ai-elements/tool.tsx', () => ({
	Tool: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ToolHeader: vi.fn(() => <div data-testid="tool-header" />),
	ToolContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	ToolInput: vi.fn(() => <div data-testid="tool-input" />),
	ToolOutput: vi.fn(() => <div data-testid="tool-output" />)
}));

const responseProps = () => vi.mocked(MessageResponse).mock.lastCall?.[0];
const reasoningProps = () => vi.mocked(Reasoning).mock.lastCall?.[0];
const reasoningContentProps = () => vi.mocked(ReasoningContent).mock.lastCall?.[0];
const toolHeaderProps = () => vi.mocked(ToolHeader).mock.lastCall?.[0];
const toolInputProps = () => vi.mocked(ToolInput).mock.lastCall?.[0];
const toolOutputProps = () => vi.mocked(ToolOutput).mock.lastCall?.[0];

describe('MessagePart', () => {
	it('hands text parts to the markdown renderer', () => {
		render(<MessagePart part={{ type: 'text', text: 'Some **markdown**' }} />);

		expect(responseProps()?.children).toBe('Some **markdown**');
	});

	it('marks a still-streaming text part as animating', () => {
		render(<MessagePart part={{ type: 'text', text: 'partial', state: 'streaming' }} />);

		expect(responseProps()?.isAnimating).toBe(true);
	});

	it('tells vendor Reasoning when a reasoning part is still streaming', () => {
		render(<MessagePart part={{ type: 'reasoning', text: 'Thinking…', state: 'streaming' }} />);

		expect(reasoningProps()?.isStreaming).toBe(true);
		expect(reasoningContentProps()?.children).toBe('Thinking…');
		expect(screen.getByTestId('reasoning-trigger')).toBeInTheDocument();
	});

	it('tells vendor Reasoning when a reasoning part has finished', () => {
		render(<MessagePart part={{ type: 'reasoning', text: 'Done thinking', state: 'done' }} />);

		expect(reasoningProps()?.isStreaming).toBe(false);
	});

	it('renders a static tool part with its type and state', () => {
		render(
			<MessagePart
				part={{
					type: 'tool-searchDocs',
					toolCallId: 'call-1',
					input: { query: 'streaming' },
					state: 'input-available'
				}}
			/>
		);

		expect(toolHeaderProps()).toMatchObject({ type: 'tool-searchDocs', state: 'input-available' });
		expect(toolHeaderProps()?.toolName).toBeUndefined();
		expect(toolInputProps()?.input).toEqual({ query: 'streaming' });
	});

	it('passes the tool name for a dynamic tool part', () => {
		render(
			<MessagePart
				part={{
					type: 'dynamic-tool',
					toolName: 'searchDocs',
					toolCallId: 'call-1',
					input: { query: 'streaming' },
					state: 'input-available'
				}}
			/>
		);

		expect(toolHeaderProps()).toMatchObject({ type: 'dynamic-tool', toolName: 'searchDocs' });
	});

	it('does not render ToolInput while the first argument chunk has not arrived', () => {
		// The SDK's first input-streaming chunk carries input: undefined.
		// JSON.stringify(undefined) crashes vendor CodeBlock's tokenizer, so
		// ToolInput must not be rendered until there is something to show.
		render(
			<MessagePart
				part={{
					type: 'tool-searchDocs',
					toolCallId: 'call-1',
					input: undefined,
					state: 'input-streaming'
				}}
			/>
		);

		expect(screen.queryByTestId('tool-input')).not.toBeInTheDocument();
	});

	it('passes output and errorText through to ToolOutput', () => {
		render(
			<MessagePart
				part={{
					type: 'tool-searchDocs',
					toolCallId: 'call-1',
					input: { query: 'streaming' },
					output: { results: [] },
					state: 'output-available'
				}}
			/>
		);

		expect(toolOutputProps()).toMatchObject({ output: { results: [] }, errorText: undefined });
	});

	it('renders nothing for an unrecognised part', () => {
		const { container } = render(<MessagePart part={{ type: 'custom', kind: 'test.unknown' }} />);

		expect(container).toBeEmptyDOMElement();
	});
});
