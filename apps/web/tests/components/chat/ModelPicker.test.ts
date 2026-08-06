import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SelectableModel } from '@house-elf/shared';

import { modelDetailsStub, modelFiltersStub, pinnedSectionStub } from '../../stubs/keys';
import { stubProps, stubRenders } from '../../stubs/stub-props';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

vi.mock('../../../src/lib/components/chat/ModelFilters.svelte', async () => ({
	default: (await import('../../stubs/ModelFiltersStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/ModelDetails.svelte', async () => ({
	default: (await import('../../stubs/ModelDetailsStub.svelte')).default
}));

vi.mock('../../../src/lib/components/chat/PinnedSection.svelte', async () => ({
	default: (await import('../../stubs/PinnedSectionStub.svelte')).default
}));

const ModelPicker = (await import('../../../src/lib/components/chat/ModelPicker.svelte')).default;

const auto = selectableModel({
	id: '~openrouter/auto',
	label: 'Auto Router',
	isRouter: true,
	createdAt: Date.UTC(2025, 0, 1),
	...optionalThinking
});
const opus5 = selectableModel({
	id: 'anthropic/claude-opus-5',
	label: 'Opus 5',
	createdAt: Date.UTC(2026, 7, 3),
	...optionalThinking,
	supportedParameters: ['temperature', 'reasoning', 'tools']
});
const opus45 = selectableModel({
	id: 'anthropic/claude-opus-4-5',
	label: 'Opus 4.5',
	createdAt: Date.UTC(2026, 6, 24),
	...optionalThinking
});
const sonnet = selectableModel({
	id: 'anthropic/claude-sonnet-4-5',
	label: 'Sonnet 4.5',
	createdAt: Date.UTC(2026, 6, 20),
	...optionalThinking
});
const haiku = selectableModel({
	id: 'anthropic/claude-haiku-4-5',
	label: 'Haiku 4.5',
	createdAt: Date.UTC(2026, 6, 10),
	supportedParameters: ['temperature'],
	isFree: true
});
const gpt = selectableModel({
	id: 'openai/gpt-5.3-chat',
	label: 'GPT-5.3 Chat',
	createdAt: Date.UTC(2026, 6, 2),
	inputModalities: ['text', 'image'],
	...optionalThinking
});

const models = [auto, opus5, opus45, sonnet, haiku, gpt];

function escapeRegex(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

afterEach(async () => {
	// The picker owns its pinned state, which persists to `localStorage`. Without
	// clearing it, a pin from one test bleeds into the next.
	localStorage.clear();
	// bits-ui locks scrolling by writing `overflow: hidden` and `pointer-events: none`
	// onto `document.body`, and restores the old style attribute ~24ms after the last
	// lock is released. `cleanup()` only unmounts, so a test that left the modal open
	// would leave the body inert for the rest of the file. Close it as a reader would
	// and wait for the release, rather than resetting the body ourselves — that reset
	// is the behaviour under test.
	const dialog = screen.queryByRole('dialog');
	if (dialog) await fireEvent.keyDown(dialog, { key: 'Escape' });
	await waitFor(() => {
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
	});
});

async function openPicker(
	selectedModelId: string = opus5.id,
	selectedModelLabel = 'Opus 5',
	thinkingProps: { thinking?: boolean; canChooseThinking?: boolean } = {}
) {
	const user = userEvent.setup();
	const onselect = vi.fn();
	const onthinkingchange = vi.fn();
	const thinking = thinkingProps.thinking ?? false;
	render(ModelPicker, {
		props: {
			models,
			selectedModelId,
			onselect,
			thinking,
			canChooseThinking: thinkingProps.canChooseThinking ?? true,
			onthinkingchange
		}
	});
	await user.click(
		screen.getByRole('button', {
			name: `Choose model. Current model: ${selectedModelLabel}${thinking ? ', thinking on' : ''}`
		})
	);

	return { user, onselect, onthinkingchange };
}

/** Reports a set of filters as the filter row would, and lets the list settle. */
async function applyFilters(filters: {
	providers: ReadonlySet<string>;
	modalities: ReadonlySet<string>;
	capabilities: ReadonlySet<string>;
}) {
	const report = stubProps(modelFiltersStub).onchange;
	if (typeof report !== 'function') throw new Error('The filter row was given no way to report');
	(report as (chosen: typeof filters) => void)(filters);
	await tick();
}

describe('model picker', () => {
	describe('the thinking switch', () => {
		it('shows the switch off, and asks to turn thinking on when clicked', async () => {
			const { user, onthinkingchange } = await openPicker();

			const toggle = screen.getByRole('switch', { name: 'Thinking' });
			expect(toggle).toHaveAttribute('aria-checked', 'false');

			await user.click(toggle);

			expect(onthinkingchange).toHaveBeenCalledExactlyOnceWith(true);
		});

		it('turns thinking back off', async () => {
			const { user, onthinkingchange } = await openPicker(opus5.id, 'Opus 5', {
				thinking: true
			});

			expect(screen.getByRole('switch', { name: 'Thinking' })).toHaveAttribute(
				'aria-checked',
				'true'
			);

			await user.click(screen.getByRole('switch', { name: 'Thinking' }));

			expect(onthinkingchange).toHaveBeenCalledExactlyOnceWith(false);
		});

		it('has no switch to show for a model that is always on or never on', async () => {
			// `canChooseThinking` is false for the two capabilities that leave nothing
			// to decide: mandatory reasoning (nothing to turn off) and no reasoning at
			// all (nothing to turn on). Either way there is no question to ask.
			await openPicker(opus5.id, 'Opus 5', { canChooseThinking: false });

			expect(screen.queryByRole('switch')).not.toBeInTheDocument();
		});
	});

	it('names thinking on the trigger, so an expensive setting is not a hidden one', async () => {
		await openPicker(opus5.id, 'Opus 5', { thinking: true });

		// The accessible name is asserted by openPicker, which finds the trigger by
		// it. This is the visible half.
		expect(
			screen.getByRole('button', { name: /Current model: Opus 5, thinking on/ })
		).toHaveTextContent('Thinking');
	});

	it('locks page scrolling only while the modal is open', async () => {
		const { user } = await openPicker();

		expect(document.body).toHaveStyle({ overflow: 'hidden' });

		await user.keyboard('{Escape}');
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
		});
	});

	it('shows each row as its label, without the provider column', async () => {
		// The provider column was dropped: labels already begin with the provider
		// ("Anthropic: …"), and provider now has its own filter, so the column
		// duplicated the label except on ~…-latest rows. The row also carries a
		// "More" button on the title row now (T1.7.4 slice 4), so the text is the
		// label followed by "More" — the assertion still pins that no provider
		// column is appended.
		await openPicker();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toHaveTextContent(/^Opus 5 More$/);
		expect(screen.getByRole('option', { name: 'GPT-5.3 Chat' })).toHaveTextContent(
			/^GPT-5\.3 Chat More$/
		);
	});

	it('groups models under their release month, newest month first', async () => {
		await openPicker();

		// Compared as elements, so this asserts the order they appear in as well as
		// that each exists.
		expect(screen.getAllByRole('group')).toEqual([
			screen.getByRole('group', { name: 'Routers' }),
			screen.getByRole('group', { name: 'August 2026' }),
			screen.getByRole('group', { name: 'July 2026' })
		]);

		const august = within(screen.getByRole('group', { name: 'August 2026' }));
		expect(august.getAllByRole('option').map((row) => row.getAttribute('aria-label'))).toEqual([
			'Opus 5'
		]);

		const july = within(screen.getByRole('group', { name: 'July 2026' }));
		expect(july.getAllByRole('option').map((row) => row.getAttribute('aria-label'))).toEqual([
			'Opus 4.5',
			'Sonnet 4.5',
			'Haiku 4.5',
			'GPT-5.3 Chat'
		]);
	});

	it('counts what is on the list beside the search box', async () => {
		const { user } = await openPicker();

		expect(screen.getByText('6 models')).toBeVisible();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'Opus' }
		});

		await waitFor(() => {
			expect(screen.getByText('2 models')).toBeVisible();
		});
		await user.clear(screen.getByRole('combobox', { name: 'Search models' }));
		await waitFor(() => {
			expect(screen.getByText('6 models')).toBeVisible();
		});
	});

	it('drops the month headers while searching, so results are not fragmented', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'Opus' }
		});

		await waitFor(() => {
			expect(screen.getAllByRole('group')).toHaveLength(1);
		});
		expect(screen.queryByRole('group', { name: 'August 2026' })).not.toBeInTheDocument();
	});

	it('finds every model whose label shares the searched words', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'Opus' }
		});

		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Opus 5' })).toBeVisible();
			expect(screen.getByRole('option', { name: 'Opus 4.5' })).toBeVisible();
			expect(screen.queryByRole('option', { name: 'GPT-5.3 Chat' })).not.toBeInTheDocument();
		});
	});

	it('searches the label alone, not the provider beside it', async () => {
		// Provider is on the row to be read, and gets a filter of its own. Making it
		// a second meaning for the search box would answer "openai" with a list that
		// shares no visible word with what was typed.
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'openai' }
		});

		await waitFor(() => {
			expect(screen.getByText('No models found.')).toBeVisible();
		});
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
	});

	it('says so when nothing answers the search', async () => {
		await openPicker();

		await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
			target: { value: 'a model nobody has built' }
		});

		await waitFor(() => {
			expect(screen.getByText('No models found.')).toBeVisible();
		});
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
	});

	it('marks the current model as selected for assistive technology', async () => {
		await openPicker(sonnet.id, 'Sonnet 4.5');

		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByRole('option', { name: 'Opus 5' })).toHaveAttribute(
			'aria-selected',
			'false'
		);
	});

	it('selects a searched model from the keyboard', async () => {
		const { user, onselect } = await openPicker();
		const search = screen.getByRole('combobox', { name: 'Search models' });

		await user.click(search);
		await fireEvent.input(search, { target: { value: 'Sonnet' } });
		await waitFor(() => {
			expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
		});
		await fireEvent.keyDown(search, { key: 'ArrowDown' });
		expect(screen.getByRole('option', { name: 'Sonnet 4.5' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await fireEvent.keyDown(search, { key: 'Enter' });

		expect(onselect).toHaveBeenCalledOnce();
		expect(onselect).toHaveBeenCalledWith(sonnet.id);
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('hands the filter row the whole catalog, not the narrowed list', async () => {
		// Otherwise a filter would vanish the moment it was used and could not be
		// taken back.
		await openPicker();

		await applyFilters({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});

		expect(stubProps(modelFiltersStub).models).toBe(models);
	});

	it('narrows the list to what the filter row lets through, and the count follows', async () => {
		// What each filter means is ModelFilters' business; this is only that the
		// picker listens to it.
		await openPicker();

		await applyFilters({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});

		expect(screen.getByText('1 model')).toBeVisible();
		expect(screen.getByRole('option', { name: 'GPT-5.3 Chat' })).toBeVisible();
		expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
	});

	it('sends the id of a pointer model with its tilde intact', async () => {
		// The tilde is stripped for reading only. It is part of the id the server
		// resolves, so selecting must not hand back the tidied name.
		const { user, onselect } = await openPicker();

		await user.click(screen.getByRole('option', { name: 'Auto Router' }));

		expect(onselect).toHaveBeenCalledExactlyOnceWith(auto.id);
	});

	describe('model rows', () => {
		/** The props for one row's details, narrowed from the stub's `unknown` bag. */
		function rowDetails(modelId: string): { model: SelectableModel; open: boolean } {
			const found = stubRenders(modelDetailsStub).find(
				(props) => (props.model as SelectableModel).id === modelId
			);
			if (found === undefined) throw new Error(`No details stub for ${modelId}`);
			return found as { model: SelectableModel; open: boolean };
		}

		/** The "More"/"Less" button for one row, scoped to that row's option. */
		function moreButton(label: string): HTMLElement {
			const option = screen.getByRole('option', { name: new RegExp(`^${escapeRegex(label)}$`) });
			return within(option).getByRole('button', { name: /^(More|Less)$/ });
		}

		it('hands each row its model, so the details show that row and not another', async () => {
			await openPicker();

			expect(() => rowDetails(opus5.id)).not.toThrow();
			expect(() => rowDetails(gpt.id)).not.toThrow();
		});

		it('opens one row at a time, not several', async () => {
			const { user } = await openPicker();

			await user.click(moreButton(opus5.label));
			await tick();
			expect(rowDetails(opus5.id).open).toBe(true);

			await user.click(moreButton(gpt.label));
			await tick();
			// Opening GPT closes Opus — one at a time, so the list does not grow a
			// second scroll inside itself.
			const openFlags = stubRenders(modelDetailsStub).map((props) => props.open);
			expect(openFlags.filter(Boolean)).toHaveLength(1);
		});

		it('opening details does not select the model', async () => {
			// The "More" control lives inside the row, but its click must not bubble
			// up to the item's onSelect — a reader can open the details without
			// committing to the model.
			const { user, onselect } = await openPicker();

			await user.click(moreButton(opus5.label));
			await tick();

			expect(onselect).not.toHaveBeenCalled();
		});
	});

	describe('pinned models', () => {
		/** The star button for one row, scoped to that row's option. */
		function starButton(label: string): HTMLElement {
			const option = screen.getByRole('option', { name: new RegExp(`^${escapeRegex(label)}$`) });
			return within(option).getByRole('button', {
				name: new RegExp(`^Pin ${escapeRegex(label)}$|^Unpin ${escapeRegex(label)}$`)
			});
		}

		/** Whether the PinnedSection stub is currently in the document. */
		function pinnedSectionRendered(): boolean {
			return screen.queryByTestId('pinned-section') !== null;
		}

		it('marks the star as not pressed for an unpinned model', async () => {
			await openPicker();

			const option = screen.getByRole('option', { name: 'Opus 5' });
			const star = within(option).getByRole('button', { name: 'Pin Opus 5' });
			expect(star).toHaveAttribute('aria-pressed', 'false');
		});

		it('does not show the pinned section when there are no pins', async () => {
			await openPicker();

			expect(pinnedSectionRendered()).toBe(false);
		});

		it('pins a model when the star is clicked, and does not select it', async () => {
			const { user, onselect } = await openPicker();

			await user.click(starButton(opus5.label));

			expect(onselect).not.toHaveBeenCalled();
			// Pinning renders the pinned section.
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
		});

		it('removes the pinned model from the main browse list', async () => {
			// A pinned model lives in the pinned section, not the main list — two
			// rows for the same model share one hover state under bits-ui's Command,
			// which reads as the main list reacting to the pinned section.
			const { user } = await openPicker();

			expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();

			await user.click(starButton(opus5.label));

			await waitFor(() => {
				expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
			});
		});

		it('keeps a pinned model searchable by name', async () => {
			// The main list drops pinned ids, but the search source keeps them: a
			// pin is still a model the reader can look up, and search results are a
			// flat list with no pinned section above them.
			const { user } = await openPicker();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			// The pinned model is gone from the browse list.
			expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();

			await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
				target: { value: 'Opus' }
			});

			await waitFor(() => {
				expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();
			});
			// The pinned section stays hidden while searching.
			expect(pinnedSectionRendered()).toBe(false);
		});

		it('unpins when the star is clicked again, and the model returns to the main list', async () => {
			const { user } = await openPicker();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			// The pinned model left the main list, so its star is gone too — the
			// unpin now comes from the pinned section's toggle.
			await waitFor(() => {
				expect(screen.queryByRole('option', { name: 'Opus 5' })).not.toBeInTheDocument();
			});

			const props = stubProps(pinnedSectionStub);
			// The stub records props as `unknown`; the picker always passes a
			// `(id: string) => void`, so the cast is sound.
			(props.ontogglepin as (id: string) => void)(opus5.id);

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
			// Unpinned, the model returns to the main browse list.
			await waitFor(() => {
				expect(screen.getByRole('option', { name: 'Opus 5' })).toBeInTheDocument();
			});
		});

		it('hands the pinned section the resolved models, sorted, and the selected id', async () => {
			const { user } = await openPicker();

			// Pinned in insertion order sonnet → opus5, but the section receives them
			// sorted alphabetically by id (opus5 < sonnet). If the sort were removed
			// this assertion would fail — the test is load-bearing, not decorative.
			await user.click(starButton(sonnet.label));
			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			const props = stubProps(pinnedSectionStub);
			expect((props.models as SelectableModel[]).map((m) => m.id)).toEqual([opus5.id, sonnet.id]);
			expect(props.selectedModelId).toBe(opus5.id);
			expect(props.collapsed).toBe(false);
		});

		it('hides the pinned section while searching, so results stay a flat list', async () => {
			const { user } = await openPicker();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			await fireEvent.input(screen.getByRole('combobox', { name: 'Search models' }), {
				target: { value: 'Sonnet' }
			});

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
		});

		it('forwards the collapse toggle to the pinned section', async () => {
			const { user } = await openPicker();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			const props = stubProps(pinnedSectionStub);
			// The stub records props as `unknown`; the picker always passes a
			// `() => void`, so the cast is sound.
			const toggle = props.ontogglecollapsed as () => void;
			expect(typeof toggle).toBe('function');
			toggle();
			await waitFor(() => {
				expect(stubProps(pinnedSectionStub).collapsed).toBe(true);
			});
		});

		it('forwards the pin toggle from the pinned section', async () => {
			const { user } = await openPicker();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			const props = stubProps(pinnedSectionStub);
			// The stub records props as `unknown`; the picker always passes a
			// `(id: string) => void`, so the cast is sound.
			const toggle = props.ontogglepin as (id: string) => void;
			expect(typeof toggle).toBe('function');
			toggle(opus5.id);

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
		});

		it('counts pinned models alongside the browse list, not just the browse list', async () => {
			// The count is everything on screen. Pinning a model removes it from the
			// browse list but adds it to the pinned section, so the total stays the
			// same — 6 models. Without adding the pinned count, it would drop to 5.
			const { user } = await openPicker();

			expect(screen.getByText('6 models')).toBeVisible();

			await user.click(starButton(opus5.label));
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			await waitFor(() => {
				expect(screen.getByText('6 models')).toBeVisible();
			});
		});
	});
});
