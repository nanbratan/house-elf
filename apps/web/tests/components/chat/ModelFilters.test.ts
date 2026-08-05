import { render, screen } from '@testing-library/svelte';
import type { SelectableModel } from '@house-elf/shared';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filterSelectStub } from '../../stubs/keys';
import { stubRenders } from '../../stubs/stub-props';
import { selectableModel } from '../../helpers/models.ts';

// What a catalog can be asked about is the utilities' business, and they have
// their own tests. Here it is fixed, so only the row's own wiring can fail.
const capabilities = vi.hoisted(() => [
	{ id: 'reasoning', label: 'Thinking' },
	{ id: 'tools', label: 'Tools' },
	{ id: 'free', label: 'Free' }
]);
const providers = vi.hoisted(() => [
	{ name: 'anthropic', count: 3 },
	{ name: 'openai', count: 1 }
]);
const modalities = vi.hoisted(() => ['image', 'text']);

vi.mock('$lib/utils/model-filters', () => ({
	FREE: 'free',
	availableCapabilities: vi.fn(() => capabilities),
	availableProviders: vi.fn(() => providers),
	availableModalities: vi.fn(() => modalities)
}));

vi.mock('../../../src/lib/components/chat/FilterSelect.svelte', async () => ({
	default: (await import('../../stubs/FilterSelectStub.svelte')).default
}));

const ModelFilters = (await import('../../../src/lib/components/chat/ModelFilters.svelte')).default;
const { availableCapabilities } = await import('$lib/utils/model-filters');

const models = [selectableModel({ id: 'anthropic/claude-opus-5', label: 'Opus 5' })];

function renderFilters(catalog: readonly SelectableModel[] = models) {
	const user = userEvent.setup();
	const onchange = vi.fn();

	render(ModelFilters, { models: catalog, onchange });

	return { user, onchange };
}

async function openFilters(catalog?: readonly SelectableModel[]) {
	const rendered = renderFilters(catalog);

	await rendered.user.click(screen.getByRole('button', { name: 'Filters' }));

	return rendered;
}

/** The dropdown carrying a given label, by the props it was handed. */
function select(label: string) {
	const found = stubRenders(filterSelectStub).find((props) => props.label === label);
	if (found === undefined) throw new Error(`No "${label}" filter was rendered`);
	return found;
}

async function choose(label: string, value: string[]) {
	const report = select(label).onValueChange;
	if (typeof report !== 'function') throw new Error(`"${label}" was given no way to report`);
	(report as (chosen: string[]) => void)(value);
	await tick();
}

beforeEach(() => {
	vi.mocked(availableCapabilities).mockReturnValue(capabilities);
});

describe('ModelFilters', () => {
	it('stays out of the way until it is asked for', () => {
		renderFilters();

		expect(stubRenders(filterSelectStub)).toHaveLength(0);
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('opens on the funnel', async () => {
		await openFilters();

		expect(stubRenders(filterSelectStub).map((props) => props.label)).toEqual([
			'Provider',
			'Accepts',
			'Can do'
		]);
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	});

	it('offers each provider with the weight it carries', async () => {
		await openFilters();

		expect(select('Provider').options).toEqual([
			{ value: 'anthropic', label: 'anthropic', hint: '3' },
			{ value: 'openai', label: 'openai', hint: '1' }
		]);
	});

	it('offers every input the catalog accepts', async () => {
		await openFilters();

		expect(select('Accepts').options).toEqual([
			{ value: 'image', label: 'image' },
			{ value: 'text', label: 'text' }
		]);
	});

	it('asks about price on its own, not among the capabilities', async () => {
		await openFilters();

		expect(select('Can do').options).toEqual([
			{ value: 'reasoning', label: 'Thinking' },
			{ value: 'tools', label: 'Tools' }
		]);
		expect(screen.getByRole('button', { name: 'Free', pressed: false })).toBeVisible();
	});

	it('has no free toggle when nothing in the catalog is free', async () => {
		vi.mocked(availableCapabilities).mockReturnValue([{ id: 'tools', label: 'Tools' }]);

		await openFilters();

		expect(screen.queryByRole('button', { name: 'Free' })).not.toBeInTheDocument();
	});

	it('has no capability list at all when the catalog splits on nothing', async () => {
		vi.mocked(availableCapabilities).mockReturnValue([]);

		await openFilters();

		expect(stubRenders(filterSelectStub).map((props) => props.label)).toEqual([
			'Provider',
			'Accepts'
		]);
	});

	it('reports a chosen provider', async () => {
		const { onchange } = await openFilters();

		await choose('Provider', ['openai']);

		expect(onchange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});
	});

	it('reports a chosen input', async () => {
		const { onchange } = await openFilters();

		await choose('Accepts', ['image']);

		expect(onchange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('reports free alongside the capabilities, since that is what it filters on', async () => {
		const { user, onchange } = await openFilters();

		await choose('Can do', ['tools']);
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(onchange).toHaveBeenLastCalledWith({
			providers: new Set(),
			modalities: new Set(),
			capabilities: new Set(['tools', 'free'])
		});
	});

	it('keeps every answer given, not only the last one', async () => {
		const { onchange } = await openFilters();

		await choose('Provider', ['openai']);
		await choose('Accepts', ['image']);

		expect(onchange).toHaveBeenLastCalledWith({
			providers: new Set(['openai']),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('counts the answers given on the funnel', async () => {
		const { user } = await openFilters();

		await choose('Provider', ['anthropic', 'openai']);
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('3');
	});

	it('leaves the filters standing once they have been used', async () => {
		// The row describes the catalog, not the narrowed list — a filter that
		// disappeared the moment it was used could not be undone.
		await openFilters();

		await choose('Provider', ['openai']);

		expect(select('Provider').value).toEqual(['openai']);
		expect(select('Accepts').options).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'Free' })).toBeVisible();
	});
});
