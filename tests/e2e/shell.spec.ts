import { expect, test, type Page } from '@playwright/test';

/**
 * Clicks the sidebar toggle, retrying until the click actually takes effect.
 *
 * `page.goto` resolves before the client modules Vite compiles on demand have run,
 * so early in a cold run the button is present but has no handler yet. Playwright
 * retries assertions, never clicks — so a plain click here silently does nothing and
 * the test fails on the assertion that follows.
 *
 * Retrying is safe because the button renames itself: once the toggle takes effect
 * this locator matches nothing, so it cannot be clicked a second time.
 */
async function toggleSidebar(page: Page, action: 'Collapse' | 'Expand'): Promise<void> {
	const button = page.getByRole('button', { name: `${action} sidebar` });

	await expect(async () => {
		await button.click();
		await expect(button).toHaveCount(0, { timeout: 250 });
	}).toPass({ timeout: 15_000 });
}

test.describe('app shell', () => {
	test('the sidebar toggle removes the conversation list from reach', async ({ page }) => {
		await page.goto('/');

		const sidebar = page.getByRole('complementary');
		const conversation = page.getByRole('link', { name: 'Placeholder conversation' });
		await expect(conversation).toBeInViewport();

		await toggleSidebar(page, 'Collapse');

		// Two separate guarantees, and jsdom can prove neither. `toBeInViewport` uses a
		// real IntersectionObserver, so it sees the clipping by the zero-width ancestor
		// that a class assertion would miss. `inert` is what keeps the links out of the
		// tab order and the accessibility tree once they are no longer visible.
		await expect(conversation).not.toBeInViewport();
		await expect(sidebar).toHaveAttribute('inert', '');

		await toggleSidebar(page, 'Expand');

		await expect(conversation).toBeInViewport();
		await expect(sidebar).not.toHaveAttribute('inert', '');
	});

	test('remembers a collapsed sidebar across a reload, without a flash', async ({ page }) => {
		await page.goto('/');
		await toggleSidebar(page, 'Collapse');

		// The server render is the assertion that matters. A purely client-side cookie
		// read would also survive the reload below, but only after painting the sidebar
		// open first — so this asks the server directly what it sent. The request context
		// shares the browser's cookie jar.
		const html = await (await page.request.get('/')).text();
		expect(html).toContain('data-state="collapsed"');

		await page.reload();

		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Placeholder conversation' })).not.toBeInViewport();
	});
});
