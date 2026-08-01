import { expect, test, type Page } from '@playwright/test';

/**
 * Auto-scroll is the one piece of the chat that jsdom structurally cannot judge: it
 * has no layout, so `scrollHeight`, `clientHeight` and `scrollTop` are all zero and
 * `scrollTo` does nothing. The unit tests stub those numbers to check the arithmetic,
 * and they dispatch their own `scroll` events — so they could never notice that
 * nothing fires one in a real browser. That is what these tests are for.
 *
 * The E2E run starts the SvelteKit dev server only, with no Mastra behind it, so the
 * stream has to be stubbed. It is stubbed at `fetch` rather than with a route
 * fulfilment because a fulfilled response arrives whole, and a transcript that grows
 * in one jump cannot show whether the view follows a stream or merely lands at the
 * end of one. Emitting deltas on demand also removes the timing guesswork: the test
 * decides when text arrives, so there is nothing to wait out and nothing to flake.
 *
 * The shape below is copied from a real response off the running server, not
 * invented, so a change in Mastra's stream protocol will surface here.
 */
interface ChatStub {
	emit(delta: string): void;
	finish(): void;
}

declare global {
	interface Window {
		__chat: ChatStub;
	}
}

async function stubChat(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const encoder = new TextEncoder();
		let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
		let replyId = 0;

		function send(chunk: Record<string, unknown>): void {
			controller?.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
		}

		window.__chat = {
			emit(delta) {
				send({ type: 'text-delta', id: String(replyId), delta });
			},
			finish() {
				send({ type: 'text-end', id: String(replyId) });
				send({ type: 'finish-step' });
				send({ type: 'finish' });
				controller?.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller?.close();
				controller = undefined;
			}
		};

		const passThrough = window.fetch.bind(window);

		window.fetch = (input, init) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (!url.includes('/api/chat/')) return passThrough(input, init);

			const body = new ReadableStream<Uint8Array>({
				start(open) {
					controller = open;
					replyId += 1;
					send({ type: 'start', messageId: `stub-${String(replyId)}` });
					send({ type: 'start-step' });
					send({ type: 'text-start', id: String(replyId) });
				},
				cancel() {
					controller = undefined;
				}
			});

			return Promise.resolve(
				new Response(body, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' }
				})
			);
		};
	});
}

/** Sends a message and waits for the reply element the stub is about to fill. */
async function ask(page: Page, question: string): Promise<void> {
	await page.goto('/c/new');
	const composer = page.getByRole('textbox', { name: 'Message' });

	// The dev server compiles client modules on demand, so early in a cold run the
	// textarea exists before anything is listening to it. Retrying the whole
	// type-and-send is safe: until it takes effect, no reply element appears.
	await expect(async () => {
		await composer.fill(question);
		await composer.press('Enter');
		await expect(page.locator('article[data-role="assistant"]')).toHaveCount(1, {
			timeout: 1000
		});
	}).toPass({ timeout: 15_000 });
}

/** How far the transcript is scrolled from its own end, in pixels. */
function distanceFromBottom(page: Page): Promise<number> {
	return page.evaluate(() => {
		const view = document.querySelector('[role="log"]');
		if (!view) throw new Error('no transcript');
		return view.scrollHeight - (view.scrollTop + view.clientHeight);
	});
}

/**
 * Streams `count` paragraphs, numbered from `from` so that successive bursts stay
 * distinguishable — an assertion has to be able to name text that only the latest
 * burst could have produced.
 */
async function emitParagraphs(page: Page, from: number, count: number): Promise<void> {
	await page.evaluate(
		({ start, total }) => {
			for (let index = 0; index < total; index += 1) {
				window.__chat.emit(`Paragraph ${String(start + index)} of the reply.\n\n`);
			}
		},
		{ start: from, total: count }
	);
}

test.describe('a streaming reply', () => {
	test.beforeEach(async ({ page }) => {
		await stubChat(page);
	});

	test('appears as it arrives, rather than all at the end', async ({ page }) => {
		await ask(page, 'Say something.');
		const reply = page.locator('article[data-role="assistant"]');

		await page.evaluate(() => {
			window.__chat.emit('First half. ');
		});
		await expect(reply).toContainText('First half.');

		// Still streaming: the composer offers to stop, which it only does before the
		// reply is finished.
		await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

		await page.evaluate(() => {
			window.__chat.emit('Second half.');
			window.__chat.finish();
		});
		await expect(reply).toContainText('First half. Second half.');
		await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0);
	});

	test('keeps the end in view while it grows', async ({ page }) => {
		await ask(page, 'Say a lot.');

		await emitParagraphs(page, 1, 40);
		await expect(page.locator('article[data-role="assistant"]')).toContainText('Paragraph 40');

		// The transcript must actually overflow, or "stayed at the bottom" would be
		// true for the uninteresting reason that there was nowhere else to be.
		const overflow = await page.evaluate(() => {
			const view = document.querySelector('[role="log"]');
			if (!view) throw new Error('no transcript');
			return view.scrollHeight - view.clientHeight;
		});
		expect(overflow).toBeGreaterThan(500);

		await expect(async () => {
			expect(await distanceFromBottom(page)).toBeLessThan(20);
		}).toPass({ timeout: 5000 });

		await expect(page.getByRole('button', { name: 'Jump to latest' })).toHaveCount(0);
	});

	test('lets a reader scroll back without dragging them down again', async ({ page }) => {
		await ask(page, 'Say a lot.');
		await emitParagraphs(page, 1, 40);
		await expect(page.locator('article[data-role="assistant"]')).toContainText('Paragraph 40');

		// A real wheel gesture, because that is the path a reader takes. Scripted
		// `scrollTop` assignment does not always produce the scroll event the view
		// listens for, which would make this pass for the wrong reason. Repeated
		// because a wheel tick is delivered asynchronously and one is not always
		// enough to travel this far.
		await page.locator('[role="log"]').hover();
		await expect(async () => {
			await page.mouse.wheel(0, -600);
			expect(await distanceFromBottom(page)).toBeGreaterThan(200);
		}).toPass({ timeout: 5000 });

		const readingAt = await distanceFromBottom(page);

		const jump = page.getByRole('button', { name: 'Jump to latest' });
		await expect(jump).toBeVisible();

		// More text arrives while the reader is looking elsewhere. The view must not
		// move; the distance from the end grows precisely because it stayed put.
		await emitParagraphs(page, 41, 10);
		await expect(page.locator('article[data-role="assistant"]')).toContainText('Paragraph 50');
		expect(await distanceFromBottom(page)).toBeGreaterThan(readingAt);

		await jump.click();

		await expect(async () => {
			expect(await distanceFromBottom(page)).toBeLessThan(20);
		}).toPass({ timeout: 5000 });
		await expect(jump).toHaveCount(0);

		// And having caught up, it follows again.
		await emitParagraphs(page, 51, 10);
		await expect(page.locator('article[data-role="assistant"]')).toContainText('Paragraph 60');
		await expect(async () => {
			expect(await distanceFromBottom(page)).toBeLessThan(20);
		}).toPass({ timeout: 5000 });
	});
});
