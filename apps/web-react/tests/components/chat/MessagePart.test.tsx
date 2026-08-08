import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MessagePart } from '../../../src/lib/components/chat/MessagePart.tsx';
import { MessageResponse } from '../../../src/lib/components/chat/MessageResponse.tsx';
import { Shimmer } from '../../../src/lib/components/vendor/ai-elements/shimmer.tsx';

// The renderer and the shimmer are tested at their own boundaries; here they
// are stubs whose call history records what MessagePart handed them.
vi.mock('../../../src/lib/components/chat/MessageResponse.tsx', () => ({
	MessageResponse: vi.fn(({ children }: { children?: ReactNode }) => (
		<div data-testid="message-response">{children}</div>
	))
}));

vi.mock('../../../src/lib/components/vendor/ai-elements/shimmer.tsx', () => ({
	Shimmer: vi.fn(({ children }: { children?: ReactNode }) => <span>{children}</span>)
}));

const responseProps = () => vi.mocked(MessageResponse).mock.lastCall?.[0];
const shimmerTexts = () => vi.mocked(Shimmer).mock.calls.map(([props]) => props.children);

describe('MessagePart', () => {
	it('hands text parts to the markdown renderer', () => {
		render(<MessagePart part={{ type: 'text', text: 'Some **markdown**' }} />);

		expect(responseProps()?.children).toBe('Some **markdown**');
	});

	it('marks a still-streaming text part as animating', () => {
		render(<MessagePart part={{ type: 'text', text: 'partial', state: 'streaming' }} />);

		expect(responseProps()?.isAnimating).toBe(true);
	});

	it('renders reasoning parts with a shimmering label while streaming', () => {
		render(<MessagePart part={{ type: 'reasoning', text: 'Thinking…', state: 'streaming' }} />);

		expect(shimmerTexts()).toContain('Reasoning');
		expect(responseProps()?.children).toBe('Thinking…');
	});

	it('renders a finished reasoning part with a static label', () => {
		render(<MessagePart part={{ type: 'reasoning', text: 'Done thinking', state: 'done' }} />);

		expect(shimmerTexts()).not.toContain('Reasoning');
		expect(screen.getByText('Reasoning')).toBeInTheDocument();
	});

	it('renders tool parts with their tool name', () => {
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

		expect(screen.getByText('searchDocs')).toBeInTheDocument();
		expect(screen.getByText('input available')).toBeInTheDocument();
	});

	it('renders nothing for an unrecognised part', () => {
		const { container } = render(<MessagePart part={{ type: 'custom', kind: 'test.unknown' }} />);

		expect(container).toBeEmptyDOMElement();
	});
});
