import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ModelListProps } from '../../../src/lib/components/chat/ModelList.tsx';
import { ModelPicker } from '../../../src/lib/components/chat/ModelPicker.tsx';
import type { ModelPickerHeaderProps } from '../../../src/lib/components/chat/ModelPickerHeader.tsx';
import { ComboboxItemBase, ComboboxList } from '../../../src/lib/components/ui/combobox.tsx';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

/*
 * Tested at its own boundary: every in-repo child — ModelList, ModelPickerHeader
 * — is replaced by a stub that records its props. What the picker itself decides
 * (open/close, search, count, which rows in which order, the accordion, pins,
 * the tilde id) is asserted off those recorded props; how the list draws them is
 * asserted in ModelList's own test.
 *
 * Nothing about how a model answers is here. Since T1.7.8 that is the settings
 * picker's, and this component is a list the reader scans by name.
 *
 * The list stub renders a real `ComboboxItemBase` per model row. That is not
 * invented behaviour: selection is committed by the combobox root from the item
 * the reader pressed, so a stub with no items would make the picker's own
 * selection wiring untestable. It renders nothing else — no headings, no chrome.
 */

let listProps: ModelListProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelList.tsx', () => ({
	ModelList: (props: ModelListProps) => {
		listProps = props;
		return (
			<ComboboxList aria-label="Models">
				{props.rows.map((row) =>
					row.kind === 'model' ? (
						<ComboboxItemBase
							key={row.id}
							value={row.model}
							index={row.itemIndex}
							aria-label={row.model.label}
							data-testid={`row-${row.model.id}`}
						/>
					) : null
				)}
			</ComboboxList>
		);
	}
}));

function latestList(): ModelListProps {
	if (!listProps) throw new Error('ModelList was never rendered');
	return listProps;
}

let headerProps: ModelPickerHeaderProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelPickerHeader.tsx', () => ({
	ModelPickerHeader: (props: ModelPickerHeaderProps) => {
		headerProps = props;
		return <div data-testid="picker-header" />;
	}
}));

function latestHeader(): ModelPickerHeaderProps {
	if (!headerProps) throw new Error('ModelPickerHeader was never rendered');
	return headerProps;
}

/** Types a search the way the header would report it. */
function searchFor(query: string) {
	latestHeader().onSearchChange(query);
}

/** The live count the picker computed for the header. */
function countLabel(): string {
	return latestHeader().countLabel;
}

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
	description: 'Anthropic’s flagship reasoning model.',
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
	description: 'OpenAI’s general-purpose chat model.',
	createdAt: Date.UTC(2026, 6, 2),
	inputModalities: ['text', 'image'],
	...optionalThinking
});

const models = [auto, opus5, opus45, sonnet, haiku, gpt];

afterEach(async () => {
	listProps = undefined;
	headerProps = undefined;
	// The picker owns its pinned state, which persists to `localStorage`. Without
	// clearing it, a pin from one test bleeds into the next.
	localStorage.clear();
	// The Dialog locks page scrolling while open by writing `overflow: hidden`
	// inline on <body>, and restores it on close; a test that left the dialog
	// open would leave that lock in place for the rest of the file. Close it as
	// a reader would, with Escape, rather than clearing the style ourselves —
	// that restore is the behaviour under test.
	const dialog = screen.queryByRole('dialog');
	if (dialog) await userEvent.setup().keyboard('{Escape}');
	await waitFor(() => {
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.body.style.overflowY).toBe('');
	});
});

async function openPicker(selectedModelId: string = opus5.id, selectedModelLabel = 'Opus 5') {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	render(<ModelPicker models={models} selectedModelId={selectedModelId} onSelect={onSelect} />);
	await user.click(
		screen.getByRole('button', {
			name: `Choose model. Current model: ${selectedModelLabel}`
		})
	);

	return { user, onSelect };
}

/** Ids of the models the picker listed, in order. */
function rowIds(): string[] {
	return latestList()
		.rows.filter((row) => row.kind === 'model')
		.map((row) => row.model.id);
}

/** The headings the picker put in the list, in order. */
function headings(): string[] {
	return latestList()
		.rows.filter((row) => row.kind === 'heading')
		.map((row) => row.title);
}

/**
 * The list top to bottom, headings marked — the one view that shows both what
 * is listed and where the breaks fall, now that there are no groups to nest in.
 */
function listShape(): string[] {
	return latestList().rows.map((row) => (row.kind === 'heading' ? `# ${row.title}` : row.model.id));
}

/** Whether the picker listed a given model as pinned. */
function pinnedFlag(modelId: string): boolean {
	const row = latestList().rows.find(
		(entry) => entry.kind === 'model' && entry.model.id === modelId
	);
	if (!row) throw new Error(`No row listed for ${modelId}`);
	return row.kind === 'model' && row.pinned;
}

function pinnedHeadingRendered(): boolean {
	return headings().some((heading) => heading.startsWith('Pinned'));
}

describe('ModelPicker', () => {
	it('names the model on the trigger, and nothing about how it answers', async () => {
		// The Dialog marks background content `aria-hidden` while it is open — a
		// real accessibility improvement over the bits-ui original, but it means
		// the trigger is no longer reachable by role without opting back in for
		// this one query.
		await openPicker();

		const trigger = screen.getByRole('button', {
			name: 'Choose model. Current model: Opus 5',
			hidden: true
		});

		expect(trigger).toHaveTextContent('Opus 5');
		expect(trigger).not.toHaveTextContent('Thinking');
	});

	it('locks page scrolling only while the modal is open', async () => {
		const { user } = await openPicker();

		// The lock is an inline `overflow: hidden` on the viewport's scroll
		// container — <body>, since <html> is not one here. It is applied a tick
		// after the dialog opens, hence the wait.
		await waitFor(() => {
			expect(document.body.style.overflowY).toBe('hidden');
		});

		await user.keyboard('{Escape}');
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(document.body.style.overflowY).toBe('');
		});
	});

	it('renders one row per listed model, handing each its model and selected flag', async () => {
		await openPicker(sonnet.id, 'Sonnet 4.5');

		expect(rowIds()).toEqual([auto.id, opus5.id, opus45.id, sonnet.id, haiku.id, gpt.id]);
		expect(latestList().selectedModelId).toBe(sonnet.id);
	});

	it('breaks the list by release month, newest month first, with routers above', async () => {
		await openPicker();

		expect(listShape()).toEqual([
			'# Routers',
			auto.id,
			'# August 2026',
			opus5.id,
			'# July 2026',
			opus45.id,
			sonnet.id,
			haiku.id,
			gpt.id
		]);
	});

	it('tells the list how many models it holds, headings passed over', async () => {
		await openPicker();

		// Nine rows go down, but six of them are models — the number the rows
		// number themselves against.
		expect(latestList().rows).toHaveLength(9);
		expect(latestList().itemCount).toBe(6);
	});

	it('counts what is on the list beside the search box', async () => {
		await openPicker();

		expect(countLabel()).toBe('6 models');

		searchFor('Opus');

		await waitFor(() => {
			expect(countLabel()).toBe('2 models');
		});
		searchFor('');
		await waitFor(() => {
			expect(countLabel()).toBe('6 models');
		});
	});

	it('drops the month headings while searching, so results are not fragmented', async () => {
		await openPicker();

		searchFor('Opus');

		await waitFor(() => {
			expect(headings()).toEqual(['Best matches']);
		});
	});

	it('finds every model whose label shares the searched words', async () => {
		await openPicker();

		searchFor('Opus');

		await waitFor(() => {
			expect(rowIds()).toEqual([opus5.id, opus45.id]);
		});
	});

	it('searches the label alone, not the provider beside it', async () => {
		await openPicker();

		searchFor('openai');

		await waitFor(() => {
			expect(latestList().rows).toEqual([]);
		});
		expect(countLabel()).toBe('0 models');
	});

	it('says so when nothing answers the search', async () => {
		await openPicker();

		searchFor('a model nobody has built');

		await waitFor(() => {
			expect(latestList().rows).toEqual([]);
		});
		expect(countLabel()).toBe('0 models');
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

	it('selects a searched model, closing the dialog', async () => {
		const { user, onSelect } = await openPicker();

		searchFor('Sonnet');
		await waitFor(() => {
			expect(rowIds()).toEqual([sonnet.id]);
		});

		await user.click(screen.getByRole('option', { name: 'Sonnet 4.5' }));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(sonnet.id);
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('hands the header the whole catalog, not the narrowed list', async () => {
		// Otherwise a filter would vanish the moment it was used and could not be
		// taken back. The header owns the filter row; the picker's contract is
		// that the header always gets the full `models` catalog, and filter
		// changes from the header narrow the list below.
		await openPicker();

		expect(latestHeader().models).toBe(models);

		latestHeader().onFiltersChange({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});

		await waitFor(() => {
			expect(countLabel()).toBe('1 model');
		});
		expect(latestHeader().models).toBe(models);
	});

	it('narrows the list to what the filter row lets through, and the count follows', async () => {
		await openPicker();

		latestHeader().onFiltersChange({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});

		await waitFor(() => {
			expect(countLabel()).toBe('1 model');
		});
		expect(rowIds()).toEqual([gpt.id]);
	});

	it('sends the id of a pointer model with its tilde intact', async () => {
		// The tilde is stripped for reading only. It is part of the id the server
		// resolves, so selecting must not hand back the tidied name.
		const { user, onSelect } = await openPicker();

		await user.click(screen.getByRole('option', { name: 'Auto Router' }));

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(auto.id);
	});

	describe('model details accordion', () => {
		it('opens one row at a time, not several', async () => {
			await openPicker();

			latestList().onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(latestList().detailsOpenId).toBe(opus5.id);
			});

			latestList().onToggleDetails(gpt.id);
			// Opening GPT closes Opus — one at a time, so the list does not grow a
			// second scroll inside itself.
			await waitFor(() => {
				expect(latestList().detailsOpenId).not.toBe(opus5.id);
				expect(latestList().detailsOpenId).toBe(gpt.id);
			});
		});

		it('toggles a row closed when its own toggle fires again', async () => {
			await openPicker();

			latestList().onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(latestList().detailsOpenId).toBe(opus5.id);
			});

			latestList().onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(latestList().detailsOpenId).not.toBe(opus5.id);
			});
		});
	});

	describe('pinned models', () => {
		it('does not show the pinned heading when there are no pins', async () => {
			await openPicker();

			expect(pinnedHeadingRendered()).toBe(false);
		});

		it('marks each row pinned or not, and a row is unpinned by default', async () => {
			await openPicker();

			expect(pinnedFlag(opus5.id)).toBe(false);
		});

		it('pins a model when its row toggles a pin, heading the list with it', async () => {
			const { onSelect } = await openPicker();

			latestList().onTogglePin(opus5.id);

			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});
			expect(onSelect).not.toHaveBeenCalled();
		});

		it('lists a pinned model once, at the top, and not again under its month', async () => {
			// Two items sharing one value would leave the selected index ambiguous,
			// so the pin is moved rather than copied.
			await openPicker();

			latestList().onTogglePin(opus5.id);

			await waitFor(() => {
				expect(listShape()).toEqual([
					'# Pinned (1)',
					opus5.id,
					'# Routers',
					auto.id,
					'# July 2026',
					opus45.id,
					sonnet.id,
					haiku.id,
					gpt.id
				]);
			});
			expect(pinnedFlag(opus5.id)).toBe(true);
		});

		it('keeps a pinned model searchable by name, with no pinned block above it', async () => {
			// The browse list drops pinned ids, but the search source keeps them: a
			// pin is still a model the reader can look up, and search results are a
			// flat list with nothing above them.
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});

			searchFor('Opus');

			await waitFor(() => {
				expect(listShape()).toEqual(['# Best matches', opus5.id, opus45.id]);
			});
		});

		it('unpins when the pin toggles again, and the model returns to its month', async () => {
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});

			latestList().onTogglePin(opus5.id);

			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(false);
			});
			expect(listShape()).toEqual([
				'# Routers',
				auto.id,
				'# August 2026',
				opus5.id,
				'# July 2026',
				opus45.id,
				sonnet.id,
				haiku.id,
				gpt.id
			]);
		});

		it('orders the pins alphabetically, not by pin time', async () => {
			// Pinned in insertion order sonnet → opus5, but listed sorted by id
			// (opus5 < sonnet). If the sort were removed this assertion would fail.
			await openPicker();

			latestList().onTogglePin(sonnet.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});
			latestList().onTogglePin(opus5.id);

			await waitFor(() => {
				expect(rowIds().slice(0, 2)).toEqual([opus5.id, sonnet.id]);
			});
		});

		it('drops a pin the filters exclude, so it cannot claim it answered them', async () => {
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});

			latestHeader().onFiltersChange({
				providers: new Set(['openai']),
				modalities: new Set(),
				capabilities: new Set()
			});

			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(false);
			});
			// The count spoke for it too, so the header disagreed with the list.
			expect(countLabel()).toBe('1 model');
		});

		it('keeps a pin the filters let through', async () => {
			await openPicker();

			latestList().onTogglePin(gpt.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});

			latestHeader().onFiltersChange({
				providers: new Set(['openai']),
				modalities: new Set(),
				capabilities: new Set()
			});

			await waitFor(() => {
				expect(countLabel()).toBe('1 model');
			});
			expect(listShape()).toEqual(['# Pinned (1)', gpt.id]);
		});

		it('hides the pinned block while searching, so results stay a flat list', async () => {
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(true);
			});

			searchFor('Sonnet');

			await waitFor(() => {
				expect(pinnedHeadingRendered()).toBe(false);
			});
		});

		it('folds the pinned rows away but keeps the heading that unfolds them', async () => {
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(rowIds()).toContain(opus5.id);
			});

			latestList().onToggleCollapsed();

			await waitFor(() => {
				expect(rowIds()).not.toContain(opus5.id);
			});
			expect(pinnedHeadingRendered()).toBe(true);
			expect(latestList().pinnedCollapsed).toBe(true);
		});

		it('counts a folded pin, which the filters still let through', async () => {
			// The count answers the search and the filters, not the state of a
			// section the reader chose to close.
			await openPicker();

			latestList().onTogglePin(opus5.id);
			await waitFor(() => {
				expect(countLabel()).toBe('6 models');
			});

			latestList().onToggleCollapsed();

			await waitFor(() => {
				expect(rowIds()).not.toContain(opus5.id);
			});
			expect(countLabel()).toBe('6 models');
		});
	});
});
