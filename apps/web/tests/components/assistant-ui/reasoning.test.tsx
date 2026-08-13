import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	ReasoningContent,
	ReasoningRoot,
	ReasoningTrigger
} from '../../../src/lib/components/assistant-ui/reasoning.tsx';

// `useScrollLock` is assistant-ui's, not ours: it measures and pins scroll offset
// across the collapse animation, which jsdom cannot do. Stubbed to a no-op so the
// collapsible's own open/close behaviour is what these tests observe.
vi.mock('@assistant-ui/react', () => ({ useScrollLock: () => () => undefined }));

// `ui/collapsible` is deliberately NOT stubbed — see tool-group.test.tsx for why.
// `ReasoningText` is absent from these tests on purpose: all it adds is scroll pinning
// driven by scrollHeight/clientHeight and a ResizeObserver, none of which jsdom gives
// real values for, so a test here could only assert against its own stubs.

function renderDisclosure(props: { streaming?: boolean; defaultOpen?: boolean } = {}) {
	return render(
		<ReasoningRoot defaultOpen={props.defaultOpen} streaming={props.streaming}>
			<ReasoningTrigger active={props.streaming} />
			<ReasoningContent>
				<span>the model’s thinking</span>
			</ReasoningContent>
		</ReasoningRoot>
	);
}

afterEach(() => {
	vi.useRealTimers();
});

describe('ReasoningTrigger', () => {
	it('says it is thinking while the reasoning streams', () => {
		renderDisclosure({ streaming: true });

		expect(screen.getByRole('button')).toHaveTextContent('Thinking...');
	});

	it('shimmers only while the reasoning streams', () => {
		const { container: streaming } = renderDisclosure({ streaming: true });
		const { container: settled } = renderDisclosure();

		expect(streaming.querySelector('[data-slot="reasoning-trigger-shimmer"]')).toBeInTheDocument();
		expect(settled.querySelector('[data-slot="reasoning-trigger-shimmer"]')).toBeNull();
	});

	// A turn restored from history arrives already complete, so nothing ever timed it —
	// and it may well have run for minutes, so the label must not imply seconds.
	it('claims no duration for a reasoning run it never watched', () => {
		renderDisclosure();

		expect(screen.getByRole('button')).toHaveTextContent('Thought for some time');
	});

	it('reports how long the reasoning it did watch took', () => {
		vi.useFakeTimers();
		const { rerender } = renderDisclosure({ streaming: true });

		vi.advanceTimersByTime(4000);
		rerender(
			<ReasoningRoot streaming={false}>
				<ReasoningTrigger active={false} />
			</ReasoningRoot>
		);

		expect(screen.getByRole('button')).toHaveTextContent('Thought for 4 seconds');
	});

	it('counts a sub-second run as one second, in the singular', () => {
		vi.useFakeTimers();
		const { rerender } = renderDisclosure({ streaming: true });

		vi.advanceTimersByTime(120);
		rerender(
			<ReasoningRoot streaming={false}>
				<ReasoningTrigger active={false} />
			</ReasoningRoot>
		);

		expect(screen.getByRole('button')).toHaveTextContent('Thought for 1 second');
	});
});

describe('ReasoningRoot', () => {
	it('keeps settled reasoning out of the reading path', () => {
		renderDisclosure();

		expect(screen.queryByText('the model’s thinking')).not.toBeInTheDocument();
	});

	it('opens itself while the reasoning streams, so the tokens are visible as they land', () => {
		renderDisclosure({ streaming: true });

		expect(screen.getByText('the model’s thinking')).toBeInTheDocument();
	});

	it('collapses again once the reasoning is done', () => {
		const { rerender } = renderDisclosure({ streaming: true });

		rerender(
			<ReasoningRoot streaming={false}>
				<ReasoningTrigger active={false} />
				<ReasoningContent>
					<span>the model’s thinking</span>
				</ReasoningContent>
			</ReasoningRoot>
		);

		expect(screen.queryByText('the model’s thinking')).not.toBeInTheDocument();
	});

	it('stays open past the end of streaming when asked to start open', () => {
		const { rerender } = renderDisclosure({ defaultOpen: true, streaming: true });

		rerender(
			<ReasoningRoot defaultOpen streaming={false}>
				<ReasoningTrigger active={false} />
				<ReasoningContent>
					<span>the model’s thinking</span>
				</ReasoningContent>
			</ReasoningRoot>
		);

		expect(screen.getByText('the model’s thinking')).toBeInTheDocument();
	});

	// Without this the disclosure would fight the reader: it re-opens on every token.
	it('lets a reader close it mid-stream and leaves it closed', async () => {
		const user = userEvent.setup();
		const { rerender } = renderDisclosure({ streaming: true });

		await user.click(screen.getByRole('button'));

		function stillStreaming(children: ReactNode) {
			return (
				<ReasoningRoot streaming>
					<ReasoningTrigger active />
					<ReasoningContent>{children}</ReasoningContent>
				</ReasoningRoot>
			);
		}
		rerender(stillStreaming(<span>the model’s thinking</span>));

		expect(screen.queryByText('the model’s thinking')).not.toBeInTheDocument();
	});

	it('reports a toggle to a controlling owner without moving on its own', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();

		render(
			<ReasoningRoot open={false} onOpenChange={onOpenChange}>
				<ReasoningTrigger />
				<ReasoningContent>
					<span>the model’s thinking</span>
				</ReasoningContent>
			</ReasoningRoot>
		);

		await user.click(screen.getByRole('button'));

		expect(onOpenChange).toHaveBeenCalledWith(true);
		// The owner holds it shut: an uncontrolled component would have opened here.
		expect(screen.queryByText('the model’s thinking')).not.toBeInTheDocument();
	});
});
