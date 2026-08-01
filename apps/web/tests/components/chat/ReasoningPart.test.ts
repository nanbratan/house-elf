import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReasoningPart from '../../../src/lib/components/chat/ReasoningPart.svelte';

const THOUGHT = 'Check the time zone first.';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

/**
 * Renders a thought and returns the two things every test here needs: a way to
 * move time forward, and a way to end the thought. The component is told the
 * model is still streaming unless a test says otherwise.
 */
function startThinking() {
	const { rerender } = render(ReasoningPart, { props: { text: THOUGHT, streaming: true } });

	return {
		/** Moves the clock and lets Svelte settle. */
		async wait(ms: number) {
			await vi.advanceTimersByTimeAsync(ms);
			await tick();
		},
		/** The model produces its last reasoning token. */
		async finish() {
			await rerender({ text: THOUGHT, streaming: false });
		}
	};
}

/** Reasoning replayed from storage: it finished before this page existed. */
function alreadyThought() {
	render(ReasoningPart, { props: { text: THOUGHT, streaming: false } });
}

const toggle = () => screen.getByRole('button');
const isOpen = () => toggle().getAttribute('aria-expanded') === 'true';
const thoughtIsVisible = () => screen.queryByText(THOUGHT) !== null;

describe('reasoning', () => {
	describe('while the model is thinking', () => {
		it('opens itself and says so', () => {
			startThinking();

			expect(isOpen()).toBe(true);
			expect(toggle()).toHaveTextContent('Thinking…');
		});
	});

	describe('when the thought ends', () => {
		it('stays open long enough to finish reading, then collapses', async () => {
			const thought = startThinking();

			await thought.finish();
			expect(isOpen()).toBe(true);

			await thought.wait(1000);
			expect(isOpen()).toBe(false);
		});

		it.each([
			{ ms: 4000, expected: 'Thought for 4 seconds' },
			{ ms: 1000, expected: 'Thought for 1 second' },
			{ ms: 200, expected: 'Thought for a moment' }
		])('reports $expected after thinking for $ms ms', async ({ ms, expected }) => {
			const thought = startThinking();

			await thought.wait(ms);
			await thought.finish();

			expect(toggle()).toHaveTextContent(expected);
		});
	});

	describe('reasoning replayed from a previous session', () => {
		it('claims no duration, because none was measured here', async () => {
			alreadyThought();

			expect(toggle()).toHaveTextContent('Thought about it');
			expect(isOpen()).toBe(false);

			// Nothing is pending, so waiting changes nothing.
			await vi.advanceTimersByTimeAsync(5000);
			await tick();

			expect(toggle()).toHaveTextContent('Thought about it');
			expect(isOpen()).toBe(false);
		});
	});

	describe('once the user has clicked', () => {
		it('a closed thought stays closed when the model finishes', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const thought = startThinking();

			await user.click(toggle());
			expect(isOpen()).toBe(false);

			await thought.finish();
			await thought.wait(2000);

			expect(isOpen()).toBe(false);
		});

		it('an opened thought stays open past the point it would have collapsed', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const thought = startThinking();

			await user.click(toggle());
			await user.click(toggle());
			expect(thoughtIsVisible()).toBe(true);

			await thought.finish();
			await thought.wait(5000);

			expect(thoughtIsVisible()).toBe(true);
		});
	});
});
