import { render, screen } from '@testing-library/svelte';
import type { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { describe, expect, it, vi } from 'vitest';

/**
 * The children are stubbed. This component is a switch and nothing else, so the
 * only things worth asserting are which child it picked and what it passed —
 * how those children behave is their own tests' business, and duplicating it
 * here would mean two files failing for every one change.
 */
vi.mock('../../../src/lib/components/chat/Markdown.svelte', async () => ({
	default: (await import('../../stubs/MarkdownStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/ReasoningPart.svelte', async () => ({
	default: (await import('../../stubs/ReasoningStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/ToolCard.svelte', async () => ({
	default: (await import('../../stubs/ToolCardStub.svelte')).default
}));

const MessagePart = (await import('../../../src/lib/components/chat/MessagePart.svelte')).default;

type Part = UIMessagePart<UIDataTypes, UITools>;

function renderPart(part: unknown) {
	return render(MessagePart, { props: { part: part as Part } });
}

/** The props the chosen child was rendered with. */
function propsOf(testId: 'markdown' | 'reasoning' | 'tool-card'): Record<string, unknown> {
	return JSON.parse(screen.getByTestId(testId).dataset.props ?? '{}') as Record<string, unknown>;
}

describe('message part', () => {
	it('sends text to the markdown renderer', () => {
		renderPart({ type: 'text', text: 'a **bold** claim' });

		expect(propsOf('markdown')).toStrictEqual({ text: 'a **bold** claim' });
	});

	it('sends reasoning on, telling it whether the thought is still arriving', () => {
		renderPart({ type: 'reasoning', text: 'Check the time zone.', state: 'streaming' });

		expect(propsOf('reasoning')).toStrictEqual({
			text: 'Check the time zone.',
			streaming: true
		});
	});

	it('marks finished reasoning as no longer streaming', () => {
		renderPart({ type: 'reasoning', text: 'Check the time zone.', state: 'done' });

		expect(propsOf('reasoning')).toMatchObject({ streaming: false });
	});

	it('takes a tool name from the part type', () => {
		renderPart({
			type: 'tool-getCurrentTime',
			toolCallId: 'call-1',
			state: 'input-available',
			input: { timeZone: 'Asia/Tokyo' }
		});

		expect(propsOf('tool-card')).toMatchObject({ name: 'getCurrentTime' });
	});

	it('takes a dynamic tool name from beside the type, where the SDK puts it', () => {
		renderPart({
			type: 'dynamic-tool',
			toolName: 'searchTheWeb',
			toolCallId: 'call-2',
			state: 'input-available',
			input: {}
		});

		expect(propsOf('tool-card')).toMatchObject({ name: 'searchTheWeb' });
	});

	describe('part types this milestone does not render', () => {
		it.each([
			{ type: 'source-url', sourceId: 's1', url: 'https://example.com' },
			{ type: 'file', mediaType: 'image/png', url: 'https://example.com/a.png' },
			{ type: 'step-start' },
			{ type: 'a-part-type-invented-next-year' }
		])('renders nothing for $type and does not throw', (part) => {
			const { container } = renderPart(part);

			// Svelte leaves a comment anchor behind, so "nothing" means no elements
			// and no text rather than an empty container.
			expect(container.querySelector('*')).toBeNull();
			expect(container).toHaveTextContent('');
		});
	});
});
