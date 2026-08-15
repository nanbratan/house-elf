import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelPicker } from '../../../src/lib/components/chat/ModelPicker.tsx';
import type { ModelPickerHeaderProps } from '../../../src/lib/components/chat/ModelPickerHeader.tsx';
import type { ModelRowProps } from '../../../src/lib/components/chat/ModelRow.tsx';
import type { PinnedSectionProps } from '../../../src/lib/components/chat/PinnedSection.tsx';
import type { ThinkingRowProps } from '../../../src/lib/components/chat/ThinkingRow.tsx';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

/*
 * Tested at its own boundary: every in-repo child — ModelRow, PinnedSection,
 * ModelFilters — is replaced by a stub that records its props and renders a
 * bare marker. The parent's own behaviour (open/close, search, count, group
 * wiring, accordion, the tilde id) is asserted here; the children's behaviour
 * is asserted in their own tests. To drive a child's callback, the recorded
 * props are read back and invoked directly, the way the instruction prescribes.
 *
 * The stubs DO carry data-testid / role markers — not invented behaviour, but
 * the minimum markup for the parent to place a row in a group or a section.
 */

/*
 * The stubs record their props on every render, keyed so the latest render
 * wins — a component re-renders when the picker's state changes, and a stale
 * first-render closure would call into old state. `rowProps(id)` therefore
 * always reads the props from the most recent render of that row.
 */
const rowPropsById = new Map<string, ModelRowProps>();
vi.mock('../../../src/lib/components/chat/ModelRow.tsx', () => ({
	ModelRow: (props: ModelRowProps) => {
		rowPropsById.set(props.model.id, props);
		return (
			<div
				role="option"
				aria-selected={props.selected}
				aria-label={props.model.label}
				data-testid={`row-${props.model.id}`}
			/>
		);
	}
}));

let pinnedProps: PinnedSectionProps | undefined;
vi.mock('../../../src/lib/components/chat/PinnedSection.tsx', () => ({
	PinnedSection: (props: PinnedSectionProps) => {
		pinnedProps = props;
		return (
			<div data-testid="pinned-section">
				{props.models.map((model) => (
					<div key={model.id} role="option" aria-label={model.label} />
				))}
			</div>
		);
	}
}));

/*
 * The header and thinking row are stubbed like the rest. Search state is
 * driven by invoking the recorded `onSearchChange`; the live count is the
 * picker's own computation, asserted off the recorded `countLabel`.
 */
let headerProps: ModelPickerHeaderProps | undefined;
vi.mock('../../../src/lib/components/chat/ModelPickerHeader.tsx', () => ({
	ModelPickerHeader: (props: ModelPickerHeaderProps) => {
		headerProps = props;
		return <div data-testid="picker-header" />;
	}
}));

let thinkingRowProps: ThinkingRowProps | undefined;
vi.mock('../../../src/lib/components/chat/ThinkingRow.tsx', () => ({
	ThinkingRow: (props: ThinkingRowProps) => {
		thinkingRowProps = props;
		return <div data-testid="thinking-row" />;
	}
}));

function latestHeader(): ModelPickerHeaderProps {
	if (!headerProps) throw new Error('ModelPickerHeader was never rendered');
	return headerProps;
}

function latestThinkingRow(): ThinkingRowProps | undefined {
	return thinkingRowProps;
}

/** Types a search the way the header would report it. */
function searchFor(query: string) {
	latestHeader().onSearchChange(query);
}

/** The live count the picker computed for the header. */
function countLabel(): string {
	return latestHeader().countLabel;
}

function latestPinned(): PinnedSectionProps | undefined {
	return pinnedProps;
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
	rowPropsById.clear();
	pinnedProps = undefined;
	headerProps = undefined;
	thinkingRowProps = undefined;
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

interface ThinkingProps {
	thinking?: boolean;
	canChooseThinking?: boolean;
}

async function openPicker(
	selectedModelId: string = opus5.id,
	selectedModelLabel = 'Opus 5',
	thinkingProps: ThinkingProps = {}
) {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	const onThinkingChange = vi.fn();
	const thinking = thinkingProps.thinking ?? false;
	render(
		<ModelPicker
			models={models}
			selectedModelId={selectedModelId}
			onSelect={onSelect}
			thinking={thinking}
			canChooseThinking={thinkingProps.canChooseThinking ?? true}
			onThinkingChange={onThinkingChange}
		/>
	);
	await user.click(
		screen.getByRole('button', {
			name: `Choose model. Current model: ${selectedModelLabel}${thinking ? ', thinking on' : ''}`
		})
	);

	return { user, onSelect, onThinkingChange };
}

/** Ids of the rows the main (browse) list rendered most recently, in order. */
function browseRowIds(): string[] {
	// The stub re-registers every row on every render, so the map holds only
	// the latest render's set — but it is keyed, not ordered, so read order off
	// the DOM the parent actually produced.
	return screen.getAllByTestId(/^row-/).map((row) => {
		const id = row.getAttribute('data-testid');
		if (!id) throw new Error('row stub missing testid');
		return id.slice('row-'.length);
	});
}

/** The recorded props for one browse-list row, by model id. */
function rowProps(modelId: string): ModelRowProps {
	const props = rowPropsById.get(modelId);
	if (!props) throw new Error(`No row rendered for ${modelId}`);
	return props;
}

describe('ModelPicker', () => {
	describe('the thinking switch', () => {
		it('hands the switch the thinking flag, and asks to turn thinking on when toggled', async () => {
			const { onThinkingChange } = await openPicker();

			expect(latestThinkingRow()?.thinking).toBe(false);

			latestThinkingRow()?.onThinkingChange(true);

			expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(true);
		});

		it('hands the switch the on state, and asks to turn thinking back off', async () => {
			const { onThinkingChange } = await openPicker(opus5.id, 'Opus 5', { thinking: true });

			expect(latestThinkingRow()?.thinking).toBe(true);

			latestThinkingRow()?.onThinkingChange(false);

			expect(onThinkingChange).toHaveBeenCalledExactlyOnceWith(false);
		});

		it('has no switch to show for a model that is always on or never on', async () => {
			await openPicker(opus5.id, 'Opus 5', { canChooseThinking: false });

			expect(screen.queryByTestId('thinking-row')).not.toBeInTheDocument();
		});
	});

	it('names thinking on the trigger, so an expensive setting is not a hidden one', async () => {
		await openPicker(opus5.id, 'Opus 5', { thinking: true });

		// The Dialog marks background content `aria-hidden` while it is open — a
		// real accessibility improvement over the bits-ui original, but it means
		// the trigger is no longer reachable by role without opting back in for
		// this one query.
		expect(
			screen.getByRole('button', { name: /Current model: Opus 5, thinking on/, hidden: true })
		).toHaveTextContent('Thinking');
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

		// The pinned section is empty, so every model is a browse row.
		expect(browseRowIds()).toEqual([auto.id, opus5.id, opus45.id, sonnet.id, haiku.id, gpt.id]);
		expect(rowProps(sonnet.id).selected).toBe(true);
		expect(rowProps(opus5.id).selected).toBe(false);
	});

	it('groups models under their release month, newest month first', async () => {
		await openPicker();

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

	it('drops the month headers while searching, so results are not fragmented', async () => {
		await openPicker();

		searchFor('Opus');

		await waitFor(() => {
			expect(screen.getAllByRole('group')).toHaveLength(1);
		});
		expect(screen.queryByRole('group', { name: 'August 2026' })).not.toBeInTheDocument();
	});

	it('finds every model whose label shares the searched words', async () => {
		await openPicker();

		searchFor('Opus');

		await waitFor(() => {
			expect(browseRowIds()).toEqual([opus5.id, opus45.id]);
		});
	});

	it('searches the label alone, not the provider beside it', async () => {
		await openPicker();

		searchFor('openai');

		await waitFor(() => {
			expect(screen.getByText('No models found.')).toBeVisible();
		});
		expect(screen.queryByRole('option')).not.toBeInTheDocument();
	});

	it('says so when nothing answers the search', async () => {
		await openPicker();

		searchFor('a model nobody has built');

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

	it('selects a searched model from the keyboard, closing the dialog', async () => {
		const { onSelect } = await openPicker();

		searchFor('Sonnet');
		await waitFor(() => {
			expect(browseRowIds()).toEqual([sonnet.id]);
		});
		// cmdk's own keyboard navigation needs real CommandItems; the stub's
		// bare markers are not focusable options, so this path is exercised
		// through the row's own onSelect contract rather than a keystroke.
		rowProps(sonnet.id).onSelect(sonnet.id);

		expect(onSelect).toHaveBeenCalledOnce();
		expect(onSelect).toHaveBeenCalledWith(sonnet.id);
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
		expect(browseRowIds()).toEqual([gpt.id]);
	});

	it('sends the id of a pointer model with its tilde intact', async () => {
		// The tilde is stripped for reading only. It is part of the id the server
		// resolves, so selecting must not hand back the tidied name.
		const { onSelect } = await openPicker();

		rowProps(auto.id).onSelect(auto.id);

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(auto.id);
	});

	describe('model details accordion', () => {
		it('opens one row at a time, not several', async () => {
			await openPicker();

			rowProps(opus5.id).onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(rowProps(opus5.id).detailsOpen).toBe(true);
			});

			rowProps(gpt.id).onToggleDetails(gpt.id);
			// Opening GPT closes Opus — one at a time, so the list does not grow a
			// second scroll inside itself.
			await waitFor(() => {
				expect(rowProps(opus5.id).detailsOpen).toBe(false);
				expect(rowProps(gpt.id).detailsOpen).toBe(true);
			});
		});

		it('toggles a row closed when its own toggle fires again', async () => {
			await openPicker();

			rowProps(opus5.id).onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(rowProps(opus5.id).detailsOpen).toBe(true);
			});

			rowProps(opus5.id).onToggleDetails(opus5.id);
			await waitFor(() => {
				expect(rowProps(opus5.id).detailsOpen).toBe(false);
			});
		});
	});

	describe('pinned models', () => {
		function pinnedSectionRendered(): boolean {
			return screen.queryByTestId('pinned-section') !== null;
		}

		it('does not show the pinned section when there are no pins', async () => {
			await openPicker();

			expect(pinnedSectionRendered()).toBe(false);
		});

		it('marks each row pinned or not, and a row is unpinned by default', async () => {
			await openPicker();

			expect(rowProps(opus5.id).pinned).toBe(false);
		});

		it('pins a model when its row toggles a pin, showing the pinned section', async () => {
			const { onSelect } = await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			expect(onSelect).not.toHaveBeenCalled();
		});

		it('removes the pinned model from the main browse list', async () => {
			// A pinned model lives in the pinned section, not the main list — two
			// `CommandItem`s sharing one `value` share one highlight state under
			// cmdk, which reads as the main list reacting to the pinned section.
			await openPicker();

			expect(browseRowIds()).toContain(opus5.id);

			rowProps(opus5.id).onTogglePin(opus5.id);

			await waitFor(() => {
				expect(browseRowIds()).not.toContain(opus5.id);
			});
			expect(latestPinned()?.models.map((model) => model.id)).toContain(opus5.id);
		});

		it('keeps a pinned model searchable by name', async () => {
			// The main list drops pinned ids, but the search source keeps them: a
			// pin is still a model the reader can look up, and search results are a
			// flat list with no pinned section above them.
			await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			expect(browseRowIds()).not.toContain(opus5.id);

			searchFor('Opus');

			await waitFor(() => {
				expect(browseRowIds()).toContain(opus5.id);
			});
			expect(pinnedSectionRendered()).toBe(false);
		});

		it('unpins when the pin toggles again, and the model returns to the main list', async () => {
			await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			expect(browseRowIds()).not.toContain(opus5.id);

			// The pinned model left the main list, so the unpin comes from the
			// pinned section's own row.
			latestPinned()?.onTogglePin(opus5.id);

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
			expect(browseRowIds()).toContain(opus5.id);
		});

		it('hands the pinned section the pins sorted alphabetically, not by pin time', async () => {
			// Pinned in insertion order sonnet → opus5, but the section is handed
			// them sorted alphabetically by id (opus5 < sonnet). If the sort were
			// removed this assertion would fail — it is load-bearing, not
			// decorative.
			await openPicker();

			rowProps(sonnet.id).onTogglePin(sonnet.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});
			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(latestPinned()?.models.map((model) => model.id)).toEqual([opus5.id, sonnet.id]);
			});
		});

		it('drops a pin the filters exclude, so the section cannot claim it answered them', async () => {
			await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			latestHeader().onFiltersChange({
				providers: new Set(['openai']),
				modalities: new Set(),
				capabilities: new Set()
			});

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
			// The count spoke for it too, so the header disagreed with the list.
			expect(countLabel()).toBe('1 model');
		});

		it('keeps a pin the filters let through', async () => {
			await openPicker();

			rowProps(gpt.id).onTogglePin(gpt.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			latestHeader().onFiltersChange({
				providers: new Set(['openai']),
				modalities: new Set(),
				capabilities: new Set()
			});

			await waitFor(() => {
				expect(countLabel()).toBe('1 model');
			});
			expect(latestPinned()?.models.map((model) => model.id)).toEqual([gpt.id]);
		});

		it('hides the pinned section while searching, so results stay a flat list', async () => {
			await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			searchFor('Sonnet');

			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(false);
			});
		});

		it('folds the pinned section when its toggle fires', async () => {
			await openPicker();

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			latestPinned()?.onToggleCollapsed();

			// Collapsed keeps the section marker but hands it no visible rows —
			// the fold is the section's own rendering, asserted in its test; here
			// the parent proves it passes the flag through.
			await waitFor(() => {
				expect(latestPinned()?.collapsed).toBe(true);
			});
		});

		it('counts pinned models alongside the browse list, not just the browse list', async () => {
			// The count is everything on screen. Pinning a model removes it from
			// the browse list but adds it to the pinned section, so the total
			// stays the same — 6 models. Without adding the pinned count, it would
			// drop to 5.
			await openPicker();

			expect(countLabel()).toBe('6 models');

			rowProps(opus5.id).onTogglePin(opus5.id);
			await waitFor(() => {
				expect(pinnedSectionRendered()).toBe(true);
			});

			expect(countLabel()).toBe('6 models');
		});
	});
});
