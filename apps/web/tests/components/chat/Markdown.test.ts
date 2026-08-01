import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

// The renderer has its own tests; what matters here is that the component asks
// it for HTML, injects the result, and asks again when the text changes.
vi.mock('$lib/utils/markdown', () => ({
	renderMarkdown: vi.fn((source: string) => `<p>rendered: ${source}</p>`)
}));

const Markdown = (await import('../../../src/lib/components/chat/Markdown.svelte')).default;

describe('markdown view', () => {
	it('injects rendered html rather than printing the source', () => {
		render(Markdown, { props: { text: '**bold**' } });

		expect(screen.getByText('rendered: **bold**')).toBeInTheDocument();
	});

	it('re-renders as more of the reply arrives', async () => {
		// Text grows a token at a time while streaming, so a component that
		// rendered once would freeze at the first fragment.
		const { rerender } = render(Markdown, { props: { text: 'Hel' } });

		await rerender({ text: 'Hello there' });

		expect(screen.getByText('rendered: Hello there')).toBeInTheDocument();
	});
});
