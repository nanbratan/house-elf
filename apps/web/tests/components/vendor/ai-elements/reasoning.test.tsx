import { Collapsible } from '@/registry/default/ui/collapsible';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger
} from '../../../../src/lib/components/vendor/ai-elements/reasoning.tsx';

// Collapsible is the boundary this component drives: every open/closed decision
// Reasoning makes leaves as the `open` prop handed down here. The stubs record
// that and render their children so the trigger's message stays queryable.
vi.mock('@/registry/default/ui/collapsible', () => ({
	Collapsible: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	CollapsibleTrigger: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>),
	CollapsibleContent: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('../../../../src/lib/components/ui/shimmer.tsx', () => ({
	Shimmer: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('streamdown', () => ({
	Streamdown: vi.fn(({ children }: { children?: ReactNode }) => <div>{children}</div>)
}));

vi.mock('@streamdown/cjk', () => ({ cjk: {} }));
vi.mock('@streamdown/code', () => ({ code: {} }));
vi.mock('@streamdown/math', () => ({ math: {} }));
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }));

const openState = () => vi.mocked(Collapsible).mock.lastCall?.[0].open;

const body = (
	<>
		<ReasoningTrigger />
		<ReasoningContent>thinking out loud</ReasoningContent>
	</>
);

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('Reasoning', () => {
	it('opens itself while the model is thinking', () => {
		render(<Reasoning isStreaming>{body}</Reasoning>);

		expect(openState()).toBe(true);
	});

	it('opens itself when the model starts thinking later', () => {
		const { rerender } = render(<Reasoning isStreaming={false}>{body}</Reasoning>);

		rerender(<Reasoning isStreaming>{body}</Reasoning>);

		expect(openState()).toBe(true);
	});

	it('stays shut when the caller asked for it shut', () => {
		render(
			<Reasoning defaultOpen={false} isStreaming>
				{body}
			</Reasoning>
		);

		expect(openState()).toBe(false);
	});

	it('closes itself a second after the model stops', () => {
		const { rerender } = render(<Reasoning isStreaming>{body}</Reasoning>);
		rerender(<Reasoning isStreaming={false}>{body}</Reasoning>);
		expect(openState()).toBe(true);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(openState()).toBe(false);
	});

	it('reports how long the model thought once it stops', () => {
		const { rerender } = render(<Reasoning isStreaming>{body}</Reasoning>);

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		rerender(<Reasoning isStreaming={false}>{body}</Reasoning>);

		expect(screen.getByText('Thought for 3 seconds')).toBeInTheDocument();
	});

	it('asks rather than acts when the caller owns the open state', () => {
		const onOpenChange = vi.fn();

		render(
			<Reasoning isStreaming onOpenChange={onOpenChange} open={false}>
				{body}
			</Reasoning>
		);

		expect(openState()).toBe(false);
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});
});
