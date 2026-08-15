import { expect, test, type Page } from '@playwright/test';

/**
 * The model list is virtualized, which is a claim about layout: only a window of
 * rows is in the DOM, and the highlight has to travel outside that window and
 * come back. jsdom can judge none of it — it has no layout, so its component
 * tests give every row the same stubbed height and can only show that *some*
 * windowing happened.
 *
 * Nothing here is stubbed. The catalog comes from the running server, so the
 * assertions are relative — how many rows are mounted against how many models
 * the picker says it is listing — rather than pinned to a number that changes
 * every time a provider ships something.
 */

const trigger = /^Choose model\. Current model:/;

async function openPicker(page: Page): Promise<void> {
	await page.goto('/c/new');

	// The dev server compiles client modules on demand, so early in a cold run
	// the button exists before anything is listening to it.
	await expect(async () => {
		await page.getByRole('button', { name: trigger }).click();
		await expect(page.getByRole('listbox', { name: 'Models' })).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
}

/** How many models the picker says it is listing, from its own live count. */
async function listedCount(page: Page): Promise<number> {
	const label = await page.getByText(/^\d+ models?$/).textContent();
	return Number(label?.split(' ')[0]);
}

function mountedRows(page: Page) {
	return page.getByRole('listbox', { name: 'Models' }).getByRole('option');
}

/** Where the highlight is, counting from 1, or 0 when nothing is highlighted. */
async function highlightedPosition(page: Page): Promise<number> {
	const highlighted = page.locator('[data-highlighted]');
	if ((await highlighted.count()) === 0) return 0;
	return Number(await highlighted.getAttribute('aria-posinset'));
}

/**
 * Walks the highlight up off the top of the list, which loops it through the
 * input and onto the very last model — the furthest it can land from anything
 * mounted, and the jump base-ui cannot scroll to because that row has no
 * element yet.
 *
 * The picker opens with the current model highlighted rather than at the top,
 * so how far up that is has to be read rather than assumed.
 */
async function wrapHighlightToEnd(page: Page): Promise<void> {
	const start = await highlightedPosition(page);

	// `start - 1` reaches the first model, then one press moves to the input and
	// one more comes back around to the last.
	for (let step = 0; step < start + 1; step += 1) {
		await page.keyboard.press('ArrowUp');
	}
}

test.describe('the model picker', () => {
	test('mounts a window of rows, not the catalog', async ({ page }) => {
		await openPicker(page);

		const listed = await listedCount(page);
		// Guards the assertion below from passing for the boring reason that the
		// catalog is small. If this ever fails, the server is serving a stub.
		expect(listed).toBeGreaterThan(100);

		const mounted = await mountedRows(page).count();

		expect(mounted).toBeGreaterThan(0);
		expect(mounted).toBeLessThan(listed / 4);
	});

	test('arrows past the edge of the window and selects what it lands on', async ({ page }) => {
		await page.goto('/c/new');
		// Read before opening: the dialog marks the rest of the page `aria-hidden`,
		// so the trigger is not reachable by role while the picker is up.
		const before = await page.getByRole('button', { name: trigger }).textContent();
		await openPicker(page);

		// Far enough to leave the rows that were mounted when the picker opened,
		// which is the case a DOM-query navigation model cannot survive.
		for (let step = 0; step < 40; step += 1) {
			await page.keyboard.press('ArrowDown');
		}

		const highlighted = page.locator('[data-highlighted]');
		await expect(highlighted).toHaveCount(1);
		await expect(highlighted).toBeInViewport();

		await page.keyboard.press('Enter');

		await expect(page.getByRole('listbox', { name: 'Models' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: trigger })).not.toHaveText(before ?? '');
	});

	test('brings the highlight back into view when it wraps to the end', async ({ page }) => {
		await openPicker(page);

		const listed = await listedCount(page);

		await wrapHighlightToEnd(page);

		const highlighted = page.locator('[data-highlighted]');
		await expect(highlighted).toHaveCount(1);
		// It really is the last model, not merely something further down: without
		// this the test would pass on any highlight that happened to be on screen.
		await expect(highlighted).toHaveAttribute('aria-posinset', String(listed));
		await expect(highlighted).toBeInViewport();
	});

	test('refills the list when the search is cleared', async ({ page }) => {
		await openPicker(page);
		const listed = await listedCount(page);

		const search = page.getByRole('combobox', { name: 'Search models' });
		await search.fill('claude');
		await expect.poll(() => listedCount(page)).toBeLessThan(listed);

		await search.fill('');

		// The whole catalog comes back, and comes back windowed — this is the path
		// that used to mount every row at once.
		await expect.poll(() => listedCount(page)).toBe(listed);
		expect(await mountedRows(page).count()).toBeLessThan(listed / 4);
	});
});
