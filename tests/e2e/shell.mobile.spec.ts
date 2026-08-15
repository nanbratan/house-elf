import { expect, test } from '@playwright/test';

/**
 * The drawer path has no jsdom equivalent: it exists only below the 768px
 * breakpoint, and whether it covers the page after a tap is a layout question.
 */
test.describe('app shell on a phone', () => {
	test('the trigger opens the conversation drawer', async ({ page }) => {
		await page.goto('/');

		const conversation = page.getByRole('link', { name: 'Placeholder conversation' });
		await expect(conversation).toHaveCount(0);

		// The button is present before the client modules Vite compiles on demand have
		// run, so an early click silently does nothing; Playwright retries assertions,
		// never clicks.
		await expect(async () => {
			await page.getByRole('button', { name: 'Expand sidebar' }).click();
			await expect(conversation).toBeVisible({ timeout: 250 });
		}).toPass({ timeout: 15_000 });
	});

	test('tapping a conversation navigates and closes the drawer', async ({ page }) => {
		await page.goto('/');

		const conversation = page.getByRole('link', { name: 'Another placeholder' });

		await expect(async () => {
			await page.getByRole('button', { name: 'Expand sidebar' }).click();
			await expect(conversation).toBeVisible({ timeout: 250 });
		}).toPass({ timeout: 15_000 });

		await conversation.click();

		await expect(page).toHaveURL(/\/c\/2$/);
		await expect(conversation).toHaveCount(0);
	});
});
