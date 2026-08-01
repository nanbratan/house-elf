import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StickToBottom from '$lib/components/chat/StickToBottom.svelte';

/**
 * When to follow, and how far from the bottom counts as following, belong to
 * `state/stick-to-bottom.svelte.ts` and are tested there against a real element.
 * Standing in for it here leaves this file with only the questions the component
 * can answer: is the behaviour attached to the right elements, and does what it
 * decides reach the screen?
 */
const stick = vi.hoisted(() => ({
	isPinned: true,
	scrollToEnd: vi.fn(),
	viewport: vi.fn(),
	content: vi.fn()
}));

vi.mock('$lib/state/stick-to-bottom.svelte', () => ({
	createStickToBottom: () => stick
}));

beforeEach(() => {
	stick.isPinned = true;
	vi.clearAllMocks();
});

/** The element each action was attached to. */
const attachedTo = (action: typeof stick.viewport): HTMLElement =>
	action.mock.calls[0]?.[0] as HTMLElement;

function renderStickToBottom() {
	return render(StickToBottom, {
		props: {
			children: createRawSnippet(() => ({ render: () => '<p>A message</p>' }))
		}
	});
}

describe('stick to bottom', () => {
	it('shows what it is given', () => {
		renderStickToBottom();

		expect(screen.getByText('A message')).toBeInTheDocument();
	});

	it('follows the element that scrolls, and watches the one that grows inside it', () => {
		renderStickToBottom();

		const viewport = attachedTo(stick.viewport);
		const content = attachedTo(stick.content);

		expect(viewport).toBe(screen.getByRole('log'));
		expect(viewport).toContainElement(content);
		expect(content).toContainElement(screen.getByText('A message'));
	});

	it('offers no way back while the reader is already at the end', () => {
		renderStickToBottom();

		expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
	});

	it('offers a way back once the reader has scrolled away, and takes it when asked', async () => {
		stick.isPinned = false;
		renderStickToBottom();

		await userEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));

		expect(stick.scrollToEnd).toHaveBeenCalled();
	});
});
