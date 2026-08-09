import type { SelectableModel } from '@house-elf/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelFilters } from '../../../src/lib/components/chat/ModelFilters.tsx';
import { selectableModel } from '../../helpers/models.ts';

const anthropicModels = [
	selectableModel({
		id: 'anthropic/claude-a',
		inputModalities: ['text', 'image'],
		supportedParameters: ['temperature', 'reasoning']
	}),
	selectableModel({ id: 'anthropic/claude-b', inputModalities: ['text'] }),
	selectableModel({ id: 'anthropic/claude-c', inputModalities: ['text'] })
];
const openaiModels = [
	selectableModel({ id: 'openai/gpt', inputModalities: ['text'], isFree: true })
];
const models: readonly SelectableModel[] = [...anthropicModels, ...openaiModels];

function renderFilters(catalog: readonly SelectableModel[] = models) {
	const user = userEvent.setup();
	const onChange = vi.fn();

	render(<ModelFilters models={catalog} onChange={onChange} />);

	return { user, onChange };
}

async function openFilters(catalog?: readonly SelectableModel[]) {
	const rendered = renderFilters(catalog);

	await rendered.user.click(screen.getByRole('button', { name: 'Filters' }));

	return rendered;
}

/**
 * Opens a filter, picks one option, and closes it again — a Radix menu hides
 * the rest of the page from the accessibility tree while it is open, so the
 * next filter cannot be reached until this one is dismissed, just as a real
 * reader would dismiss it before moving on.
 */
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, optionName: string) {
	await user.click(screen.getByRole('button', { name: label }));
	await user.click(screen.getByRole('menuitemcheckbox', { name: new RegExp(optionName) }));
	await user.keyboard('{Escape}');
}

describe('ModelFilters', () => {
	it('stays out of the way until it is asked for', () => {
		renderFilters();

		expect(screen.queryByRole('button', { name: 'Provider' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('opens on the funnel', async () => {
		await openFilters();

		expect(screen.getByRole('button', { name: 'Provider' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Accepts' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Can do' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	});

	it('offers each provider with the weight it carries', async () => {
		const { user } = await openFilters();

		await user.click(screen.getByRole('button', { name: 'Provider' }));

		expect(screen.getByRole('menuitemcheckbox', { name: /anthropic/ })).toHaveTextContent(
			/anthropic\s*3/
		);
		expect(screen.getByRole('menuitemcheckbox', { name: /openai/ })).toHaveTextContent(
			/openai\s*1/
		);
	});

	it('offers every input the catalog accepts', async () => {
		const { user } = await openFilters();

		await user.click(screen.getByRole('button', { name: 'Accepts' }));

		expect(screen.getByRole('menuitemcheckbox', { name: 'image' })).toBeVisible();
		expect(screen.getByRole('menuitemcheckbox', { name: 'text' })).toBeVisible();
	});

	it('asks about price on its own, not among the capabilities', async () => {
		const { user } = await openFilters();

		await user.click(screen.getByRole('button', { name: 'Can do' }));

		expect(screen.getByRole('menuitemcheckbox', { name: 'Thinking' })).toBeVisible();
		expect(screen.queryByRole('menuitemcheckbox', { name: 'Free' })).not.toBeInTheDocument();

		await user.keyboard('{Escape}');

		expect(screen.getByRole('button', { name: 'Free', pressed: false })).toBeVisible();
	});

	it('has no free toggle when nothing in the catalog is free', async () => {
		await openFilters(anthropicModels);

		expect(screen.queryByRole('button', { name: 'Free' })).not.toBeInTheDocument();
	});

	it('has no capability list at all when the catalog splits on nothing', async () => {
		await openFilters([selectableModel()]);

		expect(screen.queryByRole('button', { name: 'Can do' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Provider' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Accepts' })).toBeVisible();
	});

	it('reports a chosen provider', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Provider', 'openai');

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(['openai']),
			modalities: new Set(),
			capabilities: new Set()
		});
	});

	it('reports a chosen input', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Accepts', 'image');

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			providers: new Set(),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('reports free alongside the capabilities, since that is what it filters on', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Can do', 'Thinking');
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(),
			modalities: new Set(),
			capabilities: new Set(['reasoning', 'free'])
		});
	});

	it('keeps every answer given, not only the last one', async () => {
		const { user, onChange } = await openFilters();

		await choose(user, 'Provider', 'openai');
		await choose(user, 'Accepts', 'image');

		expect(onChange).toHaveBeenLastCalledWith({
			providers: new Set(['openai']),
			modalities: new Set(['image']),
			capabilities: new Set()
		});
	});

	it('counts the answers given on the funnel', async () => {
		const { user } = await openFilters();

		await choose(user, 'Provider', 'anthropic');
		await user.click(screen.getByRole('button', { name: 'Free' }));

		expect(screen.getByRole('button', { name: 'Filters' })).toHaveTextContent('2');
	});

	it('leaves the filters standing once they have been used', async () => {
		// The row describes the catalog, not the narrowed list — a filter that
		// disappeared the moment it was used could not be undone.
		const { user } = await openFilters();

		await choose(user, 'Provider', 'openai');

		expect(screen.getByRole('button', { name: 'Accepts' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Free' })).toBeVisible();
	});
});
