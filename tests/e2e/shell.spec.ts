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
	test('renders the sidebar, header and conversation list', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Placeholder conversation' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
	});

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

	test('navigating to a conversation marks it as current', async ({ page }) => {
		await page.goto('/c/2');

		await expect(page.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expect(page.getByRole('link', { name: 'Placeholder conversation' })).not.toHaveAttribute(
			'aria-current',
			'page'
		);
	});
});
