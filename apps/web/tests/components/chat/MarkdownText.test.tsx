import { TextMessagePartProvider } from '@assistant-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownText } from '../../../src/lib/components/chat/MarkdownText.tsx';

// The primitive reads its text from the message-part context rather than from props,
// so the real provider is what stands in for the runtime here.
function renderPart(text: string, isRunning = false) {
	return render(
		<TextMessagePartProvider text={text} isRunning={isRunning}>
			<MarkdownText isStreaming={isRunning} />
		</TextMessagePartProvider>
	);
}

describe('MarkdownText', () => {
	// Highlighting is async and arrives after the plain fence, and it colours each token
	// with its own custom property — so the coloured tokens, not the `<pre>`, are what
	// distinguishes a highlighted block from an unhighlighted one.
	it('renders markdown with highlighted code fences', async () => {
		renderPart('```ts\nconst answer = 42;\n```');

		expect(await screen.findByText('const answer = 42;')).toBeInTheDocument();
		await waitFor(() => {
			expect(document.querySelectorAll('pre code [style*="--sdm-c"]').length).toBeGreaterThan(1);
		});
	});

	it('renders https images from model output', () => {
		renderPart('![cat](https://example.com/cat.png)');

		expect(screen.getByRole('img', { name: 'cat' })).toBeInTheDocument();
	});

	it('marks the rendered part as running while it streams', () => {
		const { container } = renderPart('Half a sen', true);

		expect(container.querySelector('[data-status="running"]')).not.toBeNull();
	});

	it('settles the rendered part once streaming stops', () => {
		const { container } = renderPart('A whole sentence.');

		expect(container.querySelector('[data-status="running"]')).toBeNull();
	});
});
