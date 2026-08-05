import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { modelFiltersStub } from '../../stubs/keys';
import { stubProps } from '../../stubs/stub-props';
import { optionalThinking, selectableModel } from '../../helpers/models.ts';

vi.mock('../../../src/lib/components/chat/ModelFilters.svelte', async () => ({
	default: (await import('../../stubs/ModelFiltersStub.svelte')).default
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

afterEach(async () => {
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

	it('shows each row as its label and the provider it comes from', async () => {
		await openPicker();

		expect(screen.getByRole('option', { name: 'Opus 5' })).toHaveTextContent(/^Opus 5 anthropic$/);
		expect(screen.getByRole('option', { name: 'GPT-5.3 Chat' })).toHaveTextContent(
			/^GPT-5\.3 Chat openai$/
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
});
